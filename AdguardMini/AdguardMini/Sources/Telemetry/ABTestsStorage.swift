// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ABTestsStorage.swift
//  AdguardMini
//

import Foundation
import AML

enum ABTests {
    // swiftlint:disable identifier_name
    enum Experiment: String, Codable {
        /// This case exists only to keep the enum ``ABTests.ActiveExperiment`` non-empty.
        /// Do not use it for real experiments.
        case __placeholder__
        case exp1
        case exp2
        case exp3
    }

    // swiftlint:enable identifier_name

    enum TestOption: String, Codable {
        case optA
        case optB
        case notInTest
    }

    struct TestRecord: Codable {
        let option: TestOption
        let slot: Experiment
    }
}

// MARK: - ABTests.Storage

extension ABTests {
    /// Storage for A/B testing experiments
    ///
    /// Manages experiment assignments and their lifecycle:
    /// - Tracks which experiments are active
    /// - Stores user's assigned test options
    /// - Removes outdated experiments when slots change
    protocol Storage {
        /// Returns experiments that have not been assigned an option yet
        /// - Returns: Array of new experiments awaiting assignment
        func getNewTests() async -> [ActiveExperiment]

        /// Returns all currently active experiments with their assigned options
        /// - Returns: Dictionary mapping experiments to their test options
        func getActiveTests() async -> [ActiveExperiment: TestOption]

        /// Updates stored experiments with received assignments
        /// - Parameter received: New experiment assignments from backend
        func updateTests(_ received: [ActiveExperiment: TestOption]) async

        /// Removes experiments that no longer exist or have changed slots
        func removeOldTests() async
    }
}

// MARK: - ABTests.StorageImpl

extension ABTests {
    final actor StorageImpl: Storage {
        @UserDefault(key: .abTests, defaultValue: Data())
        private var rawTestsData: Data

        // MARK: - Storage

        func getNewTests() -> [ActiveExperiment] {
            let existingKeys = Set(self.loadTests().keys)
            return ActiveExperiment.realCases.filter { !existingKeys.contains($0) }
        }

        func getActiveTests() -> [ActiveExperiment: TestOption] {
            var tests = self.loadTests()
            let overrides = self.loadDevConfigOverrides()
            tests.merge(overrides) { _, override in override }
            return tests
        }

        func updateTests(_ received: [ActiveExperiment: TestOption]) {
            var tests = self.loadTests()
            for (experiment, option) in received where experiment != .__placeholder__ {
                tests[experiment] = option
            }
            self.saveTests(tests)
        }

        func removeOldTests() {
            let validExperiments = Set(ActiveExperiment.realCases)
            let filtered = self.loadTests().filter { experiment, _ in
                validExperiments.contains(experiment)
            }
            self.saveTests(filtered)
        }

        // MARK: - Private helpers

        private func loadTests() -> [ActiveExperiment: TestOption] {
            guard !self.rawTestsData.isEmpty else { return [:] }

            do {
                let records = try JSONDecoder().decode([String: TestRecord].self, from: self.rawTestsData)
                return records.reduce(into: [:]) { result, pair in
                    guard let experiment = ActiveExperiment(rawValue: pair.key) else { return }

                    // Discard records where slot doesn't match current experiment slot
                    // This handles cases where experiments move to different slots
                    guard pair.value.slot == experiment.slot else {
                        LogDebug("Discarding AB test record for \(pair.key): slot mismatch (stored: \(pair.value.slot), current: \(experiment.slot))")
                        return
                    }

                    result[experiment] = pair.value.option
                }
            } catch {
                LogError("Failed to decode AB tests: \(error)")
                return [:]
            }
        }

        private func saveTests(_ tests: [ActiveExperiment: TestOption]) {
            let records: [String: TestRecord] = tests.reduce(into: [:]) { result, pair in
                result[pair.key.rawValue] = TestRecord(option: pair.value, slot: pair.key.slot)
            }

            do {
                self.rawTestsData = try JSONEncoder().encode(records)
            } catch {
                LogError("Failed to encode AB tests: \(error)")
            }
        }

        /// Loads AB test overrides from devConfig.json
        ///
        /// Reads the `ab_tests` key from devConfig and parses it into experiment-option mappings.
        /// Overrides are applied on top of stored (backend-assigned) values in `getActiveTests()`.
        ///
        /// **devConfig.json format:**
        /// ```json
        /// {
        ///   "ab_tests": {
        ///     "AG-51019-Advanced-settings": "optA"
        ///   }
        /// }
        /// ```
        ///
        /// - Experiment names must match `ActiveExperiment.rawValue` (e.g., `"AG-51019-Advanced-settings"`)
        /// - Option values must match `TestOption.rawValue` (e.g., `"optA"`, `"optB"`, `"notInTest"`)
        /// - Invalid experiment names or option values are logged as warnings and ignored
        /// - Active overrides are logged at `LogInfo` level
        ///
        /// - Returns: Dictionary of overridden experiments, or empty dictionary if no overrides exist
        private func loadDevConfigOverrides() -> [ActiveExperiment: TestOption] {
            guard let rawOverrides = DeveloperConfigUtils[.abTestOverrides] else {
                return [:]
            }

            guard let overridesDict = rawOverrides as? [String: String] else {
                LogWarn("devConfig ab_tests has wrong type (expected [String: String])")
                return [:]
            }

            var result: [ActiveExperiment: TestOption] = [:]
            var appliedOverrides: [(String, String)] = []

            for (experimentName, optionName) in overridesDict {
                guard let experiment = ActiveExperiment(rawValue: experimentName) else {
                    LogWarn("devConfig ab_tests contains unknown experiment: \(experimentName)")
                    continue
                }

                guard let option = TestOption(rawValue: optionName) else {
                    LogWarn("devConfig ab_tests contains invalid option '\(optionName)' for experiment \(experimentName)")
                    continue
                }

                result[experiment] = option
                appliedOverrides.append((experimentName, optionName))
            }

            if !appliedOverrides.isEmpty {
                let overridesList = appliedOverrides.map { "\($0.0) -> \($0.1)" }.joined(separator: ", ")
                LogInfo("[DevConfig] AB test overrides active: \(overridesList)")
            }

            return result
        }
    }
}

// MARK: - Active tests

extension ABTests {
    // swiftlint:disable identifier_name
    /// Represents currently active A/B test experiments
    ///
    /// Each experiment is mapped to a specific slot (exp1, exp2, exp3) which determines
    /// its lifecycle and allows for slot reuse when experiments are retired.
    enum ActiveExperiment: String, CaseIterable, CustomStringConvertible, CustomDebugStringConvertible {
        /// This case exists only to keep the enum non-empty.
        /// Do not use it for real experiments.
        case __placeholder__         = "__placeholder__"
        case ag51019AdvancedSettings = "AG-51019-Advanced-settings"

        static let realCases: [ActiveExperiment] = Self.allCases.filter { $0 != .__placeholder__ }

        /// The experiment slot this active experiment occupies
        ///
        /// Slots allow reusing experiment infrastructure when old experiments are retired.
        /// When an experiment changes slots, old stored data is automatically cleaned up.
        var slot: Experiment {
            switch self {
            case .__placeholder__:         .__placeholder__
            case .ag51019AdvancedSettings: .exp1
            }
        }

        var description: String {
            self.debugDescription
        }

        var debugDescription: String {
            "\(Self.self)(rawValue: \(self.rawValue), slot: \(self.slot))"
        }
    }
    // swiftlint:enable identifier_name
}
