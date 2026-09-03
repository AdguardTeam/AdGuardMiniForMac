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
    ///     `Data` is a legitimate success for `EmptyValue`-shaped replies).
    ///
    /// Bridge-level dispatch failures (unregistered service, allowlist
    /// Denial, restricted method, malformed payload with a routable id)
    /// Reject the pending RPC via `window.__rejectRpc`; see
    /// `WKWebViewBridge.replyError`. Generated service bridges still reply
    /// Empty + log on request-deserialization / reply-serialization failures
    /// And unknown methods (a codegen contract: the `(Data) -> Void` promise
    /// Cannot carry an error, so a richer envelope would require reworking
    /// `@adg/proto-generator`'s Swift templates); those paths are
    /// Unreachable from a correct bundle.
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

        /// Upper bound for the base64 encoding of a payload at the cap:
        /// `ceil(maxInboundPayloadBytes / 3) * 4`. A longer string cannot
        /// Decode within the cap, so it is rejected in O(1) before the
        /// Decoded payload is materialized.
        static let maxInboundBase64Length = (maxInboundPayloadBytes + 2) / 3 * 4

        /// Cap for page-controlled `method` text echoed into JS replies and
        /// the unified log (mirrors `JsRuntimeErrorMessageHandler`'s
        /// 4096-char cap for remotely-updatable page strings).
        static let maxMethodLength = 4096
    }

    /// Short reason codes carried by bridge-level rejections so the page
    /// can tell a user-facing situation (e.g. an oversized payload) from a
    /// programming error (e.g. an undeclared method).
    private enum RejectReason {
        /// Non-string method, invalid base64, or an unroutable body shape.
        static let malformed = "malformed"
        /// Payload over `maxInboundPayloadBytes`.
        static let oversized = "oversized"
        /// No service registered under the requested name.
        static let noService = "no-service"
        /// Method not declared in the schema allowlist.
        static let undeclared = "undeclared"
        /// Method outside this module's restricted subset.
        static let restricted = "restricted"
    }

    /// Fixed instruction bodies; runtime values travel in arguments.
    public enum InstructionBodies {
        /// `window.__resolveRpc(id, bytes)` — TS→Swift RPC reply.
        public static let resolveRpcBody = "window.__resolveRpc(id, bytes)"
        /// `window.__rejectRpc(id, message, reason)` — TS→Swift RPC error reply.
        public static let rejectRpcBody = "window.__rejectRpc(id, message, reason)"
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
        let bytesCoercion = Self.coerceBytes(bytesValue)
        guard let id = Self.coerceId(idValue),
              let methodRaw = methodValue as? String,
              case .ok(let bytes) = bytesCoercion else {
            // A routable id rejects the pending RPC fast (invalid base64,
            // Oversized payload, non-string method) instead of leaving the
            // Page hanging for the full TS timeout; an unroutable id can
            // Only be dropped — the page is broken and would time out anyway.
            self.rejectMalformedRpc(
                body: body,
                idValue: idValue,
                methodValue: methodValue,
                bytesValue: bytesValue,
                bytesCoercion: bytesCoercion
            )
            return
        }

        // `method` originates from the remotely-updatable page: cap it before
        // It is echoed into JS replies and the unified log (mirrors
        // `JsRuntimeErrorMessageHandler`'s 4096-char cap).
        let method = String(methodRaw.prefix(Constants.maxMethodLength))

        let fqnParts = method.split(
            separator: ".",
            maxSplits: 1,
            omittingEmptySubsequences: false
        )
        guard fqnParts.count == 2 else {
            self.replyError(id: id, method: method, reason: RejectReason.malformed)
            return
        }
        let serviceName = String(fqnParts[0])
        let methodName = String(fqnParts[1])

        guard let service = services[serviceName] else {
            BridgeLog.error("WKWebViewBridge: no service registered for \"\(serviceName)\"")
            self.replyError(id: id, method: method, reason: RejectReason.noService)
            return
        }

        // Reject schema-undeclared methods before entering service.
        if let allowedMethods = ServiceMethodAllowlist.declaredMethods(for: serviceName),
           !allowedMethods.contains(methodName) {
            BridgeLog.error(
                "WKWebViewBridge: rejected undeclared method \"\(methodName)\" on service \"\(serviceName)\""
            )
            self.replyError(id: id, method: method, reason: RejectReason.undeclared)
            return
        }

        // Apply per-module method restrictions (FR-008).
        if let allowed = restrictedMethods[serviceName],
           !allowed.contains(methodName) {
            BridgeLog.error(
                "WKWebViewBridge: rejected \"\(methodName)\" on \"\(serviceName)\" — outside this module's subset"
            )
            self.replyError(id: id, method: method, reason: RejectReason.restricted)
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

    /// Outcome of coercing the RPC `bytes` field: the decoded payload, or
    /// the reject classification when it cannot be accepted. Produced once
    /// per message so the reject path never re-decodes the payload.
    private enum BytesCoercion {
        case ok(Data)
        case oversized
        case malformed
    }

    /// Coerces RPC `bytes` field to `Data`.
    private static func coerceBytes(_ value: Any?) -> BytesCoercion {
        switch value {
        case let data as Data:
            // Direct `Data` delivery (test seam / alternate bridging).
            return data.count <= Constants.maxInboundPayloadBytes ? .ok(data) : .oversized
        case let base64 as String:
            // JS `rpc.postMessage` ships the payload as a base64 string
            // (see `bytesToBase64` in `bridgeBytes.ts`), mirroring the
            // reply direction and avoiding the indexed-dictionary bridging
            // of raw `Uint8Array`s.
            guard base64.utf8.count <= Constants.maxInboundBase64Length else {
                // Cannot decode within the cap; skip the allocation.
                return .oversized
            }
            guard let data = Data(base64Encoded: base64) else { return .malformed }
            return data.count <= Constants.maxInboundPayloadBytes ? .ok(data) : .oversized
        default:
            return .malformed
        }
    }

    /// Page-controlled `method` label for reject replies: the raw value when
    /// it is a String (capped), a placeholder otherwise.
    private static func methodLabel(_ value: Any?) -> String {
        guard let method = value as? String else { return "<malformed>" }
        return String(method.prefix(Constants.maxMethodLength))
    }

    /// Logs malformed-body diagnostics and rejects the RPC for a routable
    /// id (invalid base64, oversized payload, non-string method).
    private func rejectMalformedRpc(
        body: [String: Any],
        idValue: Any?,
        methodValue: Any?,
        bytesValue: Any?,
        bytesCoercion: BytesCoercion
    ) {
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
        guard let id = Self.coerceId(idValue) else { return }
        // `oversized` distinguishes the user-facing cap violation; every
        // Other shape (bad base64, non-string method, bad id with fine
        // Bytes) is a `malformed` body.
        let reason: String
        switch bytesCoercion {
        case .oversized:       reason = RejectReason.oversized
        case .malformed, .ok:  reason = RejectReason.malformed
        }
        self.replyError(
            id: id,
            method: Self.methodLabel(methodValue),
            reason: reason
        )
    }

    // MARK: - Reply path

    private func reply(id: Int, data: Data) {
        // Untimed: TS-side `rpcPostMessage` handles request timeout.
        invokeOnMain(
            body: InstructionBodies.resolveRpcBody,
            arguments: ["id": id, "bytes": Self.bytesArgument(data)]
        )
    }

    private func replyError(id: Int, method: String, reason: String) {
        // Bridge-level rejections (unregistered service, allowlist denial,
        // Restricted method, malformed payload) reject the pending RPC: an
        // Empty `Data` reply is a legitimate `EmptyValue` success, so the
        // Page could not tell a failure apart from an empty result. The
        // `reason` code lets the page tell a user-facing situation (e.g. an
        // Oversized payload) from a programming error (e.g. an undeclared
        // Method).
        invokeOnMain(
            body: InstructionBodies.rejectRpcBody,
            arguments: ["id": id, "message": method, "reason": reason]
        )
        BridgeLog.error(
            "WKWebViewBridge: rpc id=\(id) method=\"\(method)\" reason=\(reason) failed"
        )
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
