// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ICloudDomainBlockageChecker.swift
//  AdguardMini
//

import Foundation
import AML

/// Reports whether any of the iCloud hosts the URL filter needs is blocked by DNS.
protocol ICloudDomainBlockageChecking: Sendable {
    /// Reports whether at least one required iCloud host is blocked.
    func isAnyDomainBlocked() async -> Bool
}

/// ``ICloudDomainBlockageChecking`` backed by a ``DomainResolving`` resolver.
///
/// An `actor` so that concurrent calls share one round of lookups and the
/// verdict is cached briefly: a crash loop must not multiply DNS traffic or
/// stack blocked `getaddrinfo` threads.
actor ICloudDomainBlockageChecker: ICloudDomainBlockageChecking {
    /// Hosts the URL filter needs: tokens, attestation, and the privacy proxy.
    /// CNAME targets are not probed: a filter that blocks the chain already
    /// fails the public name, while a direct target probe only adds false
    /// positives.
    /// Only hosts that resolve on an unblocked machine may be listed: one that
    /// is always NXDOMAIN would mark every failure as a DNS error.
    private static let requiredHosts = [
        "gateway.icloud.com",
        "attester.gateway.icloud.com",
        "mask.icloud.com",
        "mask-h2.icloud.com",
        "mask-boot.icloud.com",
        "mask-api.icloud.com"
    ]

    /// Host used to tell a broken resolver from blocked iCloud hosts: when it
    /// cannot resolve either, every negative answer is inconclusive.
    private static let controlHost = "example.com"

    /// How long a verdict is reused before the hosts are looked up again.
    private static let verdictLifetimeSeconds: TimeInterval = 3

    /// A verdict with the moment it stops being reused.
    private struct CachedVerdict {
        let isBlocked: Bool
        let expiresAt: Date
    }

    private let resolver: DomainResolving
    private var cachedVerdict: CachedVerdict?
    private var inFlightCheck: Task<Bool, Never>?

    /// Creates the checker.
    /// - Parameter resolver: Resolver used to look up the required hosts.
    init(resolver: DomainResolving) {
        self.resolver = resolver
    }

    func isAnyDomainBlocked() async -> Bool {
        if let cachedVerdict, cachedVerdict.expiresAt > Date() {
            return cachedVerdict.isBlocked
        }
        if let inFlightCheck {
            return await inFlightCheck.value
        }
        let check = Task { await self.performCheck() }
        self.inFlightCheck = check
        let isBlocked = await check.value
        self.inFlightCheck = nil
        self.cachedVerdict = CachedVerdict(
            isBlocked: isBlocked,
            expiresAt: Date().addingTimeInterval(Self.verdictLifetimeSeconds)
        )
        return isBlocked
    }

    /// Runs one round of lookups, gated by the control host.
    private func performCheck() async -> Bool {
        let resolver = self.resolver
        let controlResult = await resolver.resolve(Self.controlHost)
        LogDebug("iCloud domain DNS check: control \(Self.controlHost) -> \(controlResult)")
        // An offline resolver answers EAI_NONAME as NXDOMAIN, so negative answers prove nothing.
        guard case .addresses = controlResult else {
            LogInfo("iCloud domain DNS check inconclusive: control host did not resolve")
            return false
        }
        return await withTaskGroup(of: (host: String, isBlocked: Bool).self) { group in
            for host in Self.requiredHosts {
                group.addTask {
                    let result = await resolver.resolve(host)
                    LogDebug("iCloud domain DNS check: \(host) -> \(result)")
                    return (host, Self.isBlocked(result))
                }
            }
            var blocked: [String] = []
            for await outcome in group where outcome.isBlocked {
                blocked.append(outcome.host)
            }
            if !blocked.isEmpty {
                LogInfo("iCloud domain DNS check: blocked hosts \(blocked.sorted())")
            }
            return !blocked.isEmpty
        }
    }

    /// Whether one host's resolution is a DNS-filter block.
    private static func isBlocked(_ result: DomainResolutionResult) -> Bool {
        switch result {
        case .notFound: true
        case .temporaryFailure: false
        case let .addresses(addresses): addresses.allSatisfy(Self.isSinkhole)
        }
    }

    /// Whether the address is a sinkhole a DNS filter returns for a blocked host.
    private static func isSinkhole(_ address: String) -> Bool {
        var candidate = address.lowercased()
        if candidate.hasPrefix("::ffff:") {
            candidate = String(candidate.dropFirst("::ffff:".count))
        }
        return candidate == "0.0.0.0"
            || candidate == "::"
            || candidate == "::1"
            || candidate.hasPrefix("127.")
    }
}
