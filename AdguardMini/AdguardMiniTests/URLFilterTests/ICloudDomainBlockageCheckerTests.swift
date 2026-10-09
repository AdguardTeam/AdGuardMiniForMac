// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ICloudDomainBlockageCheckerTests.swift
//  AdguardMiniTests
//

import XCTest
import AML

// MARK: - FakeDomainResolver

/// Answers every host from a preconfigured table and records the hosts it was
/// asked about; state is lock-guarded because the checker resolves concurrently.
private final class FakeDomainResolver: DomainResolving, @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedResults: [String: DomainResolutionResult] = [:]
    private var storedResolvedHosts: [String] = []

    /// Preconfigured answers keyed by host; an unconfigured host is a failure.
    var results: [String: DomainResolutionResult] {
        get { locked(self.lock) { self.storedResults } }
        set { locked(self.lock) { self.storedResults = newValue } }
    }

    /// Every host passed to `resolve(_:)`, in arrival order.
    var resolvedHosts: [String] {
        locked(self.lock) { self.storedResolvedHosts }
    }

    func resolve(_ host: String) async -> DomainResolutionResult {
        locked(self.lock) {
            self.storedResolvedHosts.append(host)
            return self.storedResults[host] ?? .temporaryFailure
        }
    }
}

// MARK: - GatedFakeDomainResolver

/// Answers every host normally, but suspends the control-host lookup until the
/// test releases it, so a concurrent call can arrive mid-round.
private final class GatedFakeDomainResolver: DomainResolving, @unchecked Sendable {
    private let lock = UnfairLock()
    private var storedResolvedHosts: [String] = []

    /// Signaled when a control-host lookup starts.
    let controlStarted = AsyncSignal()
    /// Releases the suspended control-host lookup.
    let releaseControl = AsyncSignal()

    /// Every host passed to `resolve(_:)`, in arrival order.
    var resolvedHosts: [String] {
        locked(self.lock) { self.storedResolvedHosts }
    }

    func resolve(_ host: String) async -> DomainResolutionResult {
        locked(self.lock) { self.storedResolvedHosts.append(host) }
        if host == Fixtures.controlHost {
            self.controlStarted.signal()
            await self.releaseControl.wait()
        }
        return .addresses([Fixtures.normalAddress])
    }
}

// MARK: - Fixtures

private enum Fixtures {
    static let requiredHosts = [
        "gateway.icloud.com",
        "attester.gateway.icloud.com",
        "mask.icloud.com",
        "mask-h2.icloud.com",
        "mask-boot.icloud.com",
        "mask-api.icloud.com"
    ]
    static let controlHost = "example.com"
    static let normalAddress = "17.253.31.208"

    /// Every host the checker looks up, the control host included.
    static var probedHosts: [String] {
        [self.controlHost] + self.requiredHosts
    }

    /// Builds a fake resolver that answers every probed host with `result`.
    static func makeResolver(result: DomainResolutionResult) -> FakeDomainResolver {
        let resolver = FakeDomainResolver()
        resolver.results = Dictionary(uniqueKeysWithValues: Self.probedHosts.map { ($0, result) })
        return resolver
    }
}

// MARK: - ICloudDomainBlockageCheckerTests

final class ICloudDomainBlockageCheckerTests: XCTestCase {
    func testAllHostsResolvingNormallyReportsNotBlocked() async {
        let checker = ICloudDomainBlockageChecker(
            resolver: Fixtures.makeResolver(result: .addresses([Fixtures.normalAddress]))
        )

        let isBlocked = await checker.isAnyDomainBlocked()

        XCTAssertFalse(isBlocked)
    }

    func testNotFoundOnAnyRequiredHostReportsBlocked() async {
        for host in Fixtures.requiredHosts {
            let resolver = Fixtures.makeResolver(result: .addresses([Fixtures.normalAddress]))
            var results = resolver.results
            results[host] = .notFound
            resolver.results = results
            let checker = ICloudDomainBlockageChecker(resolver: resolver)

            let isBlocked = await checker.isAnyDomainBlocked()

            XCTAssertTrue(isBlocked, "Expected blocked when \(host) is not found")
        }
    }

    /// An offline resolver answers `EAI_NONAME` for every host, the control
    /// host included; that must not read as a block.
    func testUnresolvableControlHostReportsNotBlocked() async {
        let checker = ICloudDomainBlockageChecker(
            resolver: Fixtures.makeResolver(result: .notFound)
        )

        let isBlocked = await checker.isAnyDomainBlocked()

        XCTAssertFalse(isBlocked)
    }

    func testTemporaryFailureOnControlHostReportsNotBlocked() async {
        let resolver = Fixtures.makeResolver(result: .addresses(["0.0.0.0"]))
        var results = resolver.results
        results[Fixtures.controlHost] = .temporaryFailure
        resolver.results = results
        let checker = ICloudDomainBlockageChecker(resolver: resolver)

        let isBlocked = await checker.isAnyDomainBlocked()

        XCTAssertFalse(isBlocked)
    }

    func testAllSinkholeAddressesReportBlocked() async {
        let sinkholes: [[String]] = [
            ["0.0.0.0"],
            ["::"],
            ["::1"],
            ["127.0.0.1"],
            ["127.9.8.7"],
            ["::ffff:0.0.0.0"],
            ["::ffff:127.0.0.1"]
        ]
        for addresses in sinkholes {
            let checker = ICloudDomainBlockageChecker(
                resolver: Fixtures.makeResolver(result: .addresses(addresses))
            )

            let isBlocked = await checker.isAnyDomainBlocked()

            XCTAssertTrue(isBlocked, "Expected blocked for sinkhole addresses \(addresses)")
        }
    }

    func testMixedSinkholeAndNormalAddressesReportNotBlocked() async {
        let checker = ICloudDomainBlockageChecker(
            resolver: Fixtures.makeResolver(
                result: .addresses(["0.0.0.0", Fixtures.normalAddress])
            )
        )

        let isBlocked = await checker.isAnyDomainBlocked()

        XCTAssertFalse(isBlocked)
    }

    func testTemporaryFailureReportsNotBlocked() async {
        let checker = ICloudDomainBlockageChecker(
            resolver: Fixtures.makeResolver(result: .temporaryFailure)
        )

        let isBlocked = await checker.isAnyDomainBlocked()

        XCTAssertFalse(isBlocked)
    }

    func testResolvesExactlyTheProbedHosts() async {
        let resolver = Fixtures.makeResolver(result: .addresses([Fixtures.normalAddress]))
        let checker = ICloudDomainBlockageChecker(resolver: resolver)

        _ = await checker.isAnyDomainBlocked()

        XCTAssertEqual(resolver.resolvedHosts.sorted(), Fixtures.probedHosts.sorted())
    }

    /// Repeated calls reuse the cached verdict instead of looking the hosts up again.
    func testVerdictIsCachedBetweenImmediateCalls() async {
        let resolver = Fixtures.makeResolver(result: .addresses([Fixtures.normalAddress]))
        let checker = ICloudDomainBlockageChecker(resolver: resolver)

        _ = await checker.isAnyDomainBlocked()
        _ = await checker.isAnyDomainBlocked()

        XCTAssertEqual(resolver.resolvedHosts.count, Fixtures.probedHosts.count)
    }

    /// A concurrent call shares the in-flight check instead of starting a round.
    func testConcurrentCallsShareOneInFlightCheck() async throws {
        let resolver = GatedFakeDomainResolver()
        let checker = ICloudDomainBlockageChecker(resolver: resolver)

        async let first = checker.isAnyDomainBlocked()
        await resolver.controlStarted.wait()
        async let second = checker.isAnyDomainBlocked()

        // Let the second call reach the actor while the first round is suspended.
        for _ in 0..<100 {
            await Task.yield()
        }
        XCTAssertEqual(resolver.resolvedHosts.count, 1, "The second call must not start its own round")

        resolver.releaseControl.signal()
        let verdicts = await (first, second)

        XCTAssertFalse(verdicts.0)
        XCTAssertFalse(verdicts.1)
        XCTAssertEqual(resolver.resolvedHosts.count, Fixtures.probedHosts.count)
    }
}
