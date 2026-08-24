// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WKWebViewBridge.swift
//  ProtoSchema
//
//  WKWebView RPC dispatcher used by generated service/callback bridges.
//

import Foundation
import WebKit

/** Service-side handler for a single inbound RPC. */
public protocol WKWebViewServiceHandler: AnyObject {
    /// Process the inbound RPC request identified by `method`.
    ///
    /// - Parameters:
    ///   - method: Method name within the service (e.g. `"GetEffectiveTheme"`).
    ///   - bytes: Protobuf-encoded request bytes.
    ///   - promise: Completion invoked exactly once with reply bytes (empty
    ///     `Data` signals the error path; a richer error envelope may
    ///     ship in a follow-up issue).
    func handleRequest(method: String, bytes: Data, promise: @escaping (Data) -> Void)
}

/** Test seam for `WKWebView.callAsyncJavaScript`. */
public protocol WebViewAsyncInvoking: AnyObject {
    /// Invoke a JS async function `body` with `arguments` (named),
    /// delivering the `Result` to `completion`. The body MUST be a fixed,
    /// code-authored constant; runtime values travel only in `arguments`.
    func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    )
}

/** Test seam for `WKScriptMessage` name/body access. */
public protocol ScriptMessageHandling {
    var name: String { get }
    var body: Any { get }
    var isFromMainFrame: Bool { get }
}

extension ScriptMessageHandling {
    public var isFromMainFrame: Bool { true }
}

// `callAsyncJavaScript` requires plist-compatible arguments; bytes use base64.
extension WKWebView: WebViewAsyncInvoking {
    public func invoke(
        body: String,
        arguments: [String: Any],
        completion: ((Result<Any, Error>) -> Void)?
    ) {
        callAsyncJavaScript(
            body,
            arguments: arguments,
            in: nil,
            in: .page,
            completionHandler: completion
        )
    }
}

/// `WKScriptMessage.name` and `.body` are read-only stored properties, which
/// satisfy the read-only protocol requirements. `isFromMainFrame` reports
/// the real `WKFrameInfo.isMainFrame` so the rpc channel rejects subframes.
extension WKScriptMessage: ScriptMessageHandling {
    public var isFromMainFrame: Bool { frameInfo.isMainFrame }
}

/** Bidirectional RPC channel between Swift and a WKWebView. */
public final class WKWebViewBridge: NSObject, WKScriptMessageHandler {
    private enum Constants {
        /// Message name in `window.webkit.messageHandlers` the JS side posts to.
        static let rpcMessageName = "rpc"

        /// Default timeout for an outbound JS call.
        static let defaultEvaluateTimeoutSeconds: TimeInterval = 30

        /// Upper bound for a single inbound RPC payload.
        static let maxInboundPayloadBytes = 4 * 1024 * 1024
    }

    /// Fixed instruction bodies; runtime values travel in arguments.
    public enum InstructionBodies {
        /// `window.__resolveRpc(id, bytes)` — TS→Swift RPC reply.
        public static let resolveRpcBody = "window.__resolveRpc(id, bytes)"
        /// `window.__dispatchCallback(method, bytes)` — Swift→TS push.
        public static let dispatchCallbackBody = "window.__dispatchCallback(method, bytes)"
    }

    private let webView: any WebViewAsyncInvoking
    private var services: [String: WKWebViewServiceHandler] = [:]

    /// Per-host service method restrictions from `restrict(service:to:)`.
    private var restrictedMethods: [String: Set<String>] = [:]

    /// Outbound JS timeout in seconds.
    public var evaluateJsTimeoutSeconds: TimeInterval = Constants.defaultEvaluateTimeoutSeconds

    /// Called when JS invocation times out.
    public var onJavaScriptTimeout: ((String, TimeInterval) -> Void)?

    /// Called when JS invocation completes before timeout.
    public var onJavaScriptSuccess: (() -> Void)?

    /// Guards `isPageReady` + `pendingPushes` against concurrent access:
    /// `dispatchCallback` (EventBus-driven coordinator pushes) can arrive
    /// From background notification threads while `markPageReady()` arrives
    /// On the main thread from `WKWebViewAppHost.didFinishNavigation()`.
    private let pushGateLock = NSLock()

    /// `false` while a production host's entry page is loading — i.e. before
    /// the module bundle has executed and installed
    /// `window.__dispatchCallback`. While `false`, `dispatchCallback` buffers
    /// the push instead of invoking the JS shim, whose absence would throw a
    /// WKErrorDomain Code 4 JS exception and drop the push. Starts `true` so
    /// a bare bridge (unit tests, no host load lifecycle) dispatches
    /// immediately; `WKWebViewAppHost` arms the gate via `beginLoad()` and
    /// reopens it via `markPageReady()`.
    private var isPageReady = true

    /// Swift→TS pushes buffered while `isPageReady == false`. Flushed in
    /// FIFO order by `markPageReady()`. Bounded in practice by the small
    /// number of state pushes that race module startup (theme, license,
    /// filter status).
    private var pendingPushes: [(method: String, data: Data)] = []

    public init(webView: any WebViewAsyncInvoking) {
        self.webView = webView
        super.init()
    }

    /** Register a service under its generated `serviceName`. */
    public func register(service: WKWebViewServiceHandler, serviceName: String) {
        if ServiceMethodAllowlist.declaredMethods(for: serviceName) == nil {
            BridgeLog.warning(
                "register: \"\(serviceName)\" has no schema allowlist entry — schema-level method restriction is skipped for it"
            )
        }
        services[serviceName] = service
    }

    /// Restricts a service to an explicit method subset for this host.
    public func restrict(service serviceName: String, to methods: Set<String>) {
        restrictedMethods[serviceName] = methods
    }

    /// Base64 representation of RPC payload for the `bytes` argument.
    private static func bytesArgument(_ data: Data) -> String {
        data.base64EncodedString()
    }

    /** Dispatch a Swift->TS callback via structured invocation. */
    public func dispatchCallback(method: String, data: Data) {
        // Page-readiness gate: before `markPageReady()` (i.e. before the
        // module bundle installed `window.__dispatchCallback`), invoking the
        // shim throws a WKErrorDomain Code 4 JS exception and the push is
        // Lost. Buffer instead so `markPageReady()` can flush it in FIFO
        // Order — the startup-race treatment Finding #1 gives the tray
        // Visibility callback (defer to `didFinishNavigation()`).
        let buffered: Bool
        pushGateLock.lock()
        if isPageReady {
            buffered = false
        } else {
            pendingPushes.append((method: method, data: data))
            buffered = true
        }
        pushGateLock.unlock()

        guard !buffered else { return }
        startTimedInvoke(
            body: InstructionBodies.dispatchCallbackBody,
            arguments: ["method": method, "bytes": Self.bytesArgument(data)],
            methodForLogging: method
        )
    }

    /// Arms the Swift→TS push gate: subsequent `dispatchCallback` calls are
    /// buffered instead of invoking the JS `window.__dispatchCallback` shim,
    /// which is not installed until the page bundle executes. Called by
    /// `WKWebViewAppHost.init` before the entry page starts loading.
    public func beginLoad() {
        pushGateLock.lock()
        isPageReady = false
        pushGateLock.unlock()
    }

    /// Opens the Swift→TS push gate once the page finished navigation, when
    /// the module bundle has executed and installed
    /// `window.__dispatchCallback`. Flushes in FIFO order any pushes buffered
    /// by `beginLoad()`. Called by `WKWebViewAppHost.didFinishNavigation()`.
    /// Idempotent.
    public func markPageReady() {
        let pending: [(method: String, data: Data)]
        pushGateLock.lock()
        isPageReady = true
        pending = pendingPushes
        pendingPushes = []
        pushGateLock.unlock()

        guard !pending.isEmpty else { return }
        BridgeLog.debug("WKWebViewBridge.markPageReady: flushing \(pending.count) buffered push(es)")
        for push in pending {
            startTimedInvoke(
                body: InstructionBodies.dispatchCallbackBody,
                arguments: ["method": push.method, "bytes": Self.bytesArgument(push.data)],
                methodForLogging: push.method
            )
        }
    }

    /// Wraps JS invocation with timeout logging and completion hooks.
    private func startTimedInvoke(
        body: String,
        arguments: [String: Any],
        methodForLogging method: String
    ) {
        let start = Date()
        var settled = false
        let lock = NSLock()

        // Timer-first path.
        DispatchQueue.main.asyncAfter(deadline: .now() + evaluateJsTimeoutSeconds) { [weak self] in
            lock.lock()
            let alreadySettled = settled
            settled = true
            lock.unlock()
            guard !alreadySettled else { return }

            let elapsed = Date().timeIntervalSince(start)
            BridgeLog.error(
                "WKWebView invoke timed out: method=\"\(method)\" elapsed=\(elapsed)s"
            )
            self?.onJavaScriptTimeout?(method, elapsed)
        }

        // Completion-first path.
        let evaluate: () -> Void = { [weak self] in
            self?.webView.invoke(body: body, arguments: arguments) { result in
                lock.lock()
                let alreadySettled = settled
                settled = true
                lock.unlock()
                guard !alreadySettled else { return }

                if case .failure(let error) = result {
                    BridgeLog.error(
                        "WKWebView invoke completed with error method=\"\(method)\" error=\(error)"
                    )
                }
                // Any JS response means runtime is not hung.
                self?.onJavaScriptSuccess?()
            }
        }

        if Thread.isMainThread {
            evaluate()
        } else {
            DispatchQueue.main.async { evaluate() }
        }
    }

    // MARK: - WKScriptMessageHandler

    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        // The rpc channel is privileged (arbitrary Swift service methods), so
        // It must only be triggered by the module page itself, not by any
        // Subframe whose content is not under our control. Defense-in-depth
        // Behind the CSP `frame-src 'none'` policy; `handle(message:)` also
        // Re-checks via `isFromMainFrame` so the test seam stays honest.
        guard message.frameInfo.isMainFrame else {
            BridgeLog.error("WKWebViewBridge: ignoring rpc from non-main frame")
            return
        }
        // Adapt the framework type to the test-seam protocol and delegate.
        handle(message: message)
    }

    /** Test seam for handling script messages in unit tests. */
    public func handle(message: ScriptMessageHandling) {
        // Reject subframe posts even outside the `userContentController` path
        // (mirrors `SystemActionsMessageHandler` / `JsRuntimeErrorMessageHandler`
        // And the CSP `frame-src 'none'` policy; defense-in-depth).
        guard message.isFromMainFrame else {
            BridgeLog.error("WKWebViewBridge: ignoring rpc from non-main frame")
            return
        }
        guard message.name == Constants.rpcMessageName else {
            BridgeLog.error("WKWebViewBridge: non-rpc message name=\(message.name)")
            return
        }
        guard let body = message.body as? [String: Any] else {
            let bodyType = String(describing: type(of: message.body))
            BridgeLog.error("WKWebViewBridge: body not a dict, type=\(bodyType)")
            return
        }

        // Capture runtime types for malformed-body diagnostics.
        let idValue = body["id"]
        let methodValue = body["method"]
        let bytesValue = body["bytes"]
        guard let id = Self.coerceId(idValue),
              let method = methodValue as? String,
              let bytes = Self.coerceBytes(bytesValue) else {
            // Unwrap optionals to log actual runtime types.
            let idType = idValue.map { String(describing: type(of: $0)) } ?? "nil"
            let methodType = methodValue.map { String(describing: type(of: $0)) } ?? "nil"
            let bytesType = bytesValue.map { String(describing: type(of: $0)) } ?? "nil"
            let keys = body.keys.sorted().joined(separator: ",")
            let bytesDesc: String
            if let nsObj = bytesValue as? NSObject, let desc = Optional(nsObj.description) {
                bytesDesc = String(desc.prefix(60))
            } else {
                bytesDesc = "-"
            }
            BridgeLog.error("WKWebViewBridge: malformed RPC keys=[\(keys)] idType=\(idType) methodType=\(methodType) bytesType=\(bytesType) bytesDesc=\(bytesDesc)")
            return
        }

        let fqnParts = method.split(
            separator: ".",
            maxSplits: 1,
            omittingEmptySubsequences: false
        )
        guard fqnParts.count == 2 else {
            self.replyError(id: id, method: method)
            return
        }
        let serviceName = String(fqnParts[0])
        let methodName = String(fqnParts[1])

        guard let service = services[serviceName] else {
            BridgeLog.error("WKWebViewBridge: no service registered for \"\(serviceName)\"")
            self.replyError(id: id, method: method)
            return
        }

        // Reject schema-undeclared methods before entering service.
        if let allowedMethods = ServiceMethodAllowlist.declaredMethods(for: serviceName),
           !allowedMethods.contains(methodName) {
            BridgeLog.error(
                "WKWebViewBridge: rejected undeclared method \"\(methodName)\" on service \"\(serviceName)\""
            )
            self.replyError(id: id, method: method)
            return
        }

        // Apply per-module method restrictions (FR-008).
        if let allowed = restrictedMethods[serviceName],
           !allowed.contains(methodName) {
            BridgeLog.error(
                "WKWebViewBridge: rejected \"\(methodName)\" on \"\(serviceName)\" — outside this module's subset"
            )
            self.replyError(id: id, method: method)
            return
        }

        // Typed Swift dispatch.
        let promise: (Data) -> Void = { [weak self] replyData in
            self?.reply(id: id, data: replyData)
        }
        service.handleRequest(method: methodName, bytes: bytes, promise: promise)
    }

    // MARK: - Payload coercion

    /// Coerces RPC `id` field to `Int`.
    private static func coerceId(_ value: Any?) -> Int? {
        switch value {
        case let intValue as Int:
            return intValue
        case let number as NSNumber:
            // Reject fractional values (instead of `intValue` truncating
            // E.g. 1.9 -> 1), which would route the Swift reply to the wrong
            // Pending promise and corrupt request/response correlation.
            let doubleValue = number.doubleValue
            guard doubleValue.rounded() == doubleValue else { return nil }
            return Int(doubleValue)
        default:
            return nil
        }
    }

    /// Coerces RPC `bytes` field to `Data`.
    private static func coerceBytes(_ value: Any?) -> Data? {
        guard let coerced = coerceBytesUnbounded(value),
              coerced.count <= Constants.maxInboundPayloadBytes else {
            return nil
        }
        return coerced
    }

    /// Unbounded byte-coercion (no payload-size check); see `coerceBytes`.
    private static func coerceBytesUnbounded(_ value: Any?) -> Data? {
        switch value {
        case let data as Data:
            return data
        case let dict as NSDictionary:
            // JS `Uint8Array` may bridge as indexed dictionary.
            return data(fromIndexedDictionary: dict)
        case let numbers as [NSNumber]:
            // Common Uint8Array bridging path.
            let bytes = numbers.compactMap { UInt8(exactly: $0.intValue) }
            return bytes.count == numbers.count ? Data(bytes) : nil
        case let ints as [Int]:
            // Support non-NSNumber numeric arrays.
            let bytes = ints.compactMap { UInt8(exactly: $0) }
            return bytes.count == ints.count ? Data(bytes) : nil
        case let anyArray as [Any]:
            // Catch-all for heterogeneous numeric arrays.
            return data(fromAnyArray: anyArray)
        default:
            return nil
        }
    }

    /// Reassembles bytes from index-keyed dictionary.
    private static func data(fromIndexedDictionary dict: NSDictionary) -> Data? {
        let indexed = dict.allKeys.compactMap { key -> (Int, UInt8)? in
            let index: Int
            switch key {
            case let intValue as Int:
                index = intValue
            case let number as NSNumber:
                index = number.intValue
            case let stringKey as String:
                guard let parsed = Int(stringKey) else { return nil }
                index = parsed
            default:
                return nil
            }
            guard let byte = byteValue(dict[key]) else { return nil }
            return (index, byte)
        }
        guard indexed.count == dict.count else { return nil }
        let sorted = indexed.sorted { $0.0 < $1.0 }
        guard sorted.indices.allSatisfy({ sorted[$0].0 == $0 }) else { return nil }
        return Data(sorted.map { $0.1 })
    }

    /// Coerces heterogeneous numeric array to `Data`.
    private static func data(fromAnyArray array: [Any]) -> Data? {
        let bytes = array.compactMap { element -> UInt8? in
            switch element {
            case let number as NSNumber:
                return UInt8(exactly: number.intValue)
            case let intValue as Int:
                return UInt8(exactly: intValue)
            default:
                return nil
            }
        }
        return bytes.count == array.count ? Data(bytes) : nil
    }

    /// Coerces a single numeric value to `UInt8`.
    private static func byteValue(_ value: Any?) -> UInt8? {
        switch value {
        case let number as NSNumber:
            return UInt8(exactly: number.intValue)
        case let intValue as Int:
            return UInt8(exactly: intValue)
        case let stringValue as String:
            return Int(stringValue).flatMap { UInt8(exactly: $0) }
        default:
            return nil
        }
    }

    // MARK: - Reply path

    private func reply(id: Int, data: Data) {
        // Untimed: TS-side `rpcPostMessage` handles request timeout.
        invokeOnMain(
            body: InstructionBodies.resolveRpcBody,
            arguments: ["id": id, "bytes": Self.bytesArgument(data)]
        )
    }

    private func replyError(id: Int, method: String) {
        // Empty bytes signal error path.
        invokeOnMain(
            body: InstructionBodies.resolveRpcBody,
            arguments: ["id": id, "bytes": Self.bytesArgument(Data())]
        )
        BridgeLog.error("WKWebViewBridge: rpc id=\(id) method=\"\(method)\" failed")
    }

    /// Invokes structured JS call on the main thread.
    private func invokeOnMain(
        body: String,
        arguments: [String: Any]
    ) {
        let work = { [weak self] in
            self?.webView.invoke(body: body, arguments: arguments) { result in
                if case .failure(let error) = result {
                    BridgeLog.error(
                        "WKWebViewBridge: invoke failed body=\"\(body)\" error=\(error)"
                    )
                }
            }
        }
        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async { work() }
        }
    }
}
