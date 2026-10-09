// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  DomainResolver.swift
//  AdguardMini
//

import Foundation
import AML

/// Outcome of resolving a host through the system resolver.
enum DomainResolutionResult: Equatable, Sendable {
    /// Resolved addresses in numeric-host form.
    case addresses([String])
    /// Definitive negative answer: the host does not exist. An offline
    /// resolver answers `EAI_NONAME` here as well, so a caller cannot treat
    /// this case as a block on its own.
    case notFound
    /// Transient failure: timeout or SERVFAIL.
    case temporaryFailure
}

/// Resolves a host through the system resolver.
protocol DomainResolving: Sendable {
    /// Resolves `host`; every failure mode maps to a case.
    func resolve(_ host: String) async -> DomainResolutionResult
}

/// ``DomainResolving`` backed by `getaddrinfo`, bounded to a 3-second wait.
struct SystemDomainResolver: DomainResolving {
    /// Maximum wait before a lookup is abandoned as a temporary failure.
    private static let resolutionTimeoutSeconds: TimeInterval = 3

    func resolve(_ host: String) async -> DomainResolutionResult {
        await withCheckedContinuation { continuation in
            let gate = ResumeOnce(continuation)
            let queue = DispatchQueue.global(qos: .utility)
            queue.asyncAfter(deadline: .now() + Self.resolutionTimeoutSeconds) {
                gate.resume(.temporaryFailure)
            }
            queue.async { gate.resume(Self.lookup(host)) }
        }
    }

    /// Runs the blocking lookup and maps its outcome.
    private static func lookup(_ host: String) -> DomainResolutionResult {
        var hints = addrinfo()
        hints.ai_family = AF_UNSPEC
        hints.ai_socktype = SOCK_STREAM
        var info: UnsafeMutablePointer<addrinfo>?
        let status = getaddrinfo(host, nil, &hints, &info)
        guard status == 0 else {
            return status == EAI_NONAME || status == EAI_NODATA ? .notFound : .temporaryFailure
        }
        defer { freeaddrinfo(info) }
        let addresses = Self.numericAddresses(from: info)
        return addresses.isEmpty ? .notFound : .addresses(addresses)
    }

    /// Formats every address of a `getaddrinfo` result in numeric-host form.
    private static func numericAddresses(from info: UnsafeMutablePointer<addrinfo>?) -> [String] {
        var addresses: [String] = []
        var current = info
        while let entry = current {
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let status = getnameinfo(
                entry.pointee.ai_addr, entry.pointee.ai_addrlen,
                &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST
            )
            if status == 0 {
                addresses.append(String(cString: host))
            }
            current = entry.pointee.ai_next
        }
        return addresses
    }
}

/// Resumes a continuation exactly once; a late lookup result is dropped.
private final class ResumeOnce: @unchecked Sendable {
    private let lock = UnfairLock()
    private let continuation: CheckedContinuation<DomainResolutionResult, Never>
    private var isResumed = false

    init(_ continuation: CheckedContinuation<DomainResolutionResult, Never>) {
        self.continuation = continuation
    }

    func resume(_ result: DomainResolutionResult) {
        let shouldResume: Bool = locked(self.lock) {
            guard !self.isResumed else { return false }
            self.isResumed = true
            return true
        }
        guard shouldResume else { return }
        self.continuation.resume(returning: result)
    }
}
