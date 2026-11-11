// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailRulesetConverterTests.swift
//  AdguardMiniTests
//

import ContentBlockerConverter
import XCTest

/// Verifies a generation that was superseded before the write never persists
/// its ruleset, so a cancelled toggle-off cannot be overwritten by the stale
/// generation it replaced.
final class MailRulesetConverterTests: XCTestCase {
    /// Records every ruleset the converter persists.
    private final class RecordingStorage: MailRulesetStorage, @unchecked Sendable {
        private(set) var savedData: [Data] = []

        func save(_ data: Data) async -> Bool {
            self.savedData.append(data)
            return true
        }
    }

    /// Runs the disabled conversion inside one task and reports what it wrote.
    ///
    /// - Parameter cancelFirst: Whether the task is cancelled before the run.
    /// - Returns: The `writtenSuccessfully` flag and the data passed to storage.
    private func runDisabledConversion(cancelFirst: Bool) async -> (Bool, [Data]) {
        await Task { () -> (Bool, [Data]) in
            let storage = RecordingStorage()
            let converter = MailRulesetConverter(
                converter: FiltersConverterImpl(converter: ContentBlockerConverter()),
                storage: storage
            )
            if cancelFirst {
                withUnsafeCurrentTask { $0?.cancel() }
            }

            let result = await converter.convert(
                isEnabled: false,
                isPremium: false,
                filterRules: [],
                userRules: []
            )
            return (result.writtenSuccessfully, storage.savedData)
        }.value
    }

    func testCancelledGenerationDoesNotWriteTheRuleset() async {
        let (written, savedData) = await self.runDisabledConversion(cancelFirst: true)

        XCTAssertFalse(written)
        XCTAssertTrue(savedData.isEmpty)
    }

    func testLiveGenerationWritesTheEmptyRuleset() async {
        let (written, savedData) = await self.runDisabledConversion(cancelFirst: false)

        XCTAssertTrue(written)
        XCTAssertEqual(savedData, [Data("[]".utf8)])
    }
}
