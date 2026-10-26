// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  GenerateBuildConstantsTests.swift
//  AdguardMiniTests
//

import XCTest

/// Exercises the build-constants generator: the emitted Swift files, the
/// setting-name parsing, and the argument check.
final class GenerateBuildConstantsTests: XCTestCase {
    private enum Constants {
        static let envPath = "/usr/bin/env"
        static let shPath = "/bin/sh"
        static let generatorScript = "AdguardMini/Scripts/generateBuildConstants.sh"
        static let containerName = "BuildConfig"
        static let sensitiveContainerName = "SensitiveBuildConfig"
        static let prefix = "AG_"
        static let sensitivePrefix = "SENS_"
    }

    private struct GeneratorResult {
        let status: Int32
        let stderr: String
    }

    /// Repository root, derived from this file's path.
    private var repositoryRoot: URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // Scripts
            .deletingLastPathComponent()  // AdguardMiniTests
            .deletingLastPathComponent()  // AdguardMini
            .deletingLastPathComponent()  // repository root
    }

    /// The generator writes the configured container and one constant per
    /// setting name.
    func testGeneratorEmitsOneConstantPerSettingName() throws {
        let directory = try self.makeTemporaryDirectory()
        let constantsFile = directory.appendingPathComponent("BuildConfig.swift")

        let result = try self.runGenerator(
            prefix: Constants.prefix,
            container: Constants.containerName,
            outputFile: constantsFile.path,
            environment: [
                "AG_VERSION=2.5.0",
                #"AG_HELPER_REQ=anchor apple generic and certificate leaf[subject.OU] = "TC3Q7MAJXF""#
            ]
        )
        XCTAssertEqual(result.status, 0, "Generator failed: \(result.stderr)")

        let generated = try self.readGeneratedFile(constantsFile)
        XCTAssertTrue(generated.lines.contains("// CREATED BY SCRIPT 'generateBuildConstants.sh'"))
        XCTAssertTrue(
            generated.lines.contains("enum \(Constants.containerName) {"),
            "Generated file must open the configured enum"
        )
        let requirement = #"anchor apple generic and certificate leaf[subject.OU] = \"TC3Q7MAJXF\""#
        XCTAssertEqual(generated.constants, [
            "\tstatic let AG_HELPER_REQ = \"" + requirement + "\"",
            "\tstatic let AG_VERSION = \"2.5.0\""
        ])
        XCTAssertEqual(generated.lines.last, "}")
    }

    /// The sensitive generator uses the same script with the `SENS_` prefix
    /// and its own container.
    func testGeneratorEmitsSensitiveConstants() throws {
        let directory = try self.makeTemporaryDirectory()
        let constantsFile = directory.appendingPathComponent("SensitiveBuildConfig.swift")

        let result = try self.runGenerator(
            prefix: Constants.sensitivePrefix,
            container: Constants.sensitiveContainerName,
            outputFile: constantsFile.path,
            environment: ["SENS_SENTRY_DSN=https://example.invalid/1"]
        )
        XCTAssertEqual(result.status, 0, "Generator failed: \(result.stderr)")

        let generated = try self.readGeneratedFile(constantsFile)
        XCTAssertTrue(
            generated.lines.contains("enum \(Constants.sensitiveContainerName) {"),
            "Generated file must open the configured enum"
        )
        XCTAssertEqual(
            generated.constants,
            ["\t" + #"static let SENS_SENTRY_DSN = "https://example.invalid/1""#]
        )
        XCTAssertEqual(generated.lines.last, "}")
    }

    /// An entry whose name is not a setting is ignored, so only the resolved
    /// setting becomes a constant.
    func testGeneratorIgnoresEntryWithInvalidName() throws {
        let directory = try self.makeTemporaryDirectory()
        let constantsFile = directory.appendingPathComponent("BuildConfig.swift")

        let result = try self.runGenerator(
            prefix: Constants.prefix,
            container: Constants.containerName,
            outputFile: constantsFile.path,
            environment: [
                #"AG_HELPER_REQ =anchor apple generic and certificate leaf[subject.OU] = $(AG_TEAM)"#,
                "AG_HELPER_REQ=anchor apple generic and certificate leaf[subject.OU] = TC3Q7MAJXF"
            ]
        )
        XCTAssertEqual(result.status, 0, "Generator failed: \(result.stderr)")

        XCTAssertEqual(try self.readGeneratedFile(constantsFile).constants, [
            "\t" + #"static let AG_HELPER_REQ = "anchor apple generic and certificate leaf[subject.OU] = TC3Q7MAJXF""#
        ])
    }

    /// Only settings with the configured prefix become constants.
    func testGeneratorSkipsOtherSettings() throws {
        let directory = try self.makeTemporaryDirectory()
        let constantsFile = directory.appendingPathComponent("BuildConfig.swift")

        let result = try self.runGenerator(
            prefix: Constants.prefix,
            container: Constants.containerName,
            outputFile: constantsFile.path,
            environment: [
                "AG_VERSION=2.5.0",
                "AGP_VERSION=$(AG_VERSION)",
                "OTHER_VERSION=$(AG_VERSION)"
            ]
        )
        XCTAssertEqual(result.status, 0, "Generator failed: \(result.stderr)")

        XCTAssertEqual(
            try self.readGeneratedFile(constantsFile).constants,
            ["\t" + #"static let AG_VERSION = "2.5.0""#]
        )
    }

    /// The generator escapes a backslash and a double quote, so the constant
    /// keeps the exact text of the setting value.
    func testGeneratorEscapesBackslashAndQuote() throws {
        let directory = try self.makeTemporaryDirectory()
        let constantsFile = directory.appendingPathComponent("BuildConfig.swift")

        let result = try self.runGenerator(
            prefix: Constants.prefix,
            container: Constants.containerName,
            outputFile: constantsFile.path,
            environment: [#"AG_TEST_VALUE=a\b"c"#]
        )
        XCTAssertEqual(result.status, 0, "Generator failed: \(result.stderr)")

        XCTAssertEqual(
            try self.readGeneratedFile(constantsFile).constants,
            ["\t" + #"static let AG_TEST_VALUE = "a\\b\"c""#]
        )
    }

    /// The generator rejects a call without the three required arguments.
    func testGeneratorRejectsMissingArguments() throws {
        let result = try self.runGenerator(
            prefix: nil,
            container: nil,
            outputFile: nil,
            environment: []
        )
        XCTAssertEqual(result.status, 2)
        XCTAssertTrue(result.stderr.contains("Usage:"), result.stderr)
    }

    /// Creates a temporary directory that is removed after the test.
    private func makeTemporaryDirectory() throws -> URL {
        let directory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("GenerateBuildConstantsTests-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        self.addTeardownBlock {
            try? FileManager.default.removeItem(at: directory)
        }
        return directory
    }

    /// Reads the generated file and splits it into lines and constants.
    private func readGeneratedFile(_ url: URL) throws -> (lines: [String], constants: [String]) {
        let contents = try XCTUnwrap(
            String(data: try Data(contentsOf: url), encoding: .utf8),
            "Generated constants file is not valid UTF-8"
        )
        let lines = contents.split(separator: "\n", omittingEmptySubsequences: true).map(String.init)
        return (lines, lines.filter { $0.contains("static let") })
    }

    /// Runs the generator with a controlled environment. Entries go through
    /// `/usr/bin/env`, so a test can pass a name that a shell cannot import.
    private func runGenerator(
        prefix: String?,
        container: String?,
        outputFile: String?,
        environment: [String]
    ) throws -> GeneratorResult {
        var arguments = environment
        arguments.append(Constants.shPath)
        arguments.append(self.repositoryRoot.appendingPathComponent(Constants.generatorScript).path)
        if let prefix {
            arguments.append(prefix)
        }
        if let container {
            arguments.append(container)
        }
        if let outputFile {
            arguments.append(outputFile)
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: Constants.envPath)
        process.arguments = arguments
        process.environment = ["PATH": "/usr/bin:/bin"]
        process.standardOutput = FileHandle.nullDevice
        let stderrPipe = Pipe()
        process.standardError = stderrPipe
        try process.run()
        process.waitUntilExit()

        let stderr = String(
            data: stderrPipe.fileHandleForReading.readDataToEndOfFile(),
            encoding: .utf8
        ) ?? ""
        return GeneratorResult(status: process.terminationStatus, stderr: stderr)
    }
}
