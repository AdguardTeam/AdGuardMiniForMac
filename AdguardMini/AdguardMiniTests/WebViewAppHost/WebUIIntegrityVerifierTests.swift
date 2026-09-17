// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebUIIntegrityVerifierTests.swift
//  AdguardMiniTests
//

import XCTest
import Security

/// Exercises `WebUIIntegrityVerifier` against real app bundle fixtures that
/// `codesign` signs and the Security framework validates — no certificates,
/// no keychain entries, and no stub standing in for the seal check. These are
/// the tests that prove a modified bundle is caught.
final class WebUIIntegrityRealSignatureTests: XCTestCase {
    private enum Constants {
        static let bundleIdentifier = "com.adguard.test.Fixture"
        static let webUIResourceName = "index.js"
        static let codesignPath = "/usr/bin/codesign"
        static let trueBinaryPath = "/usr/bin/true"
    }

    /// Creates a `.app` fixture whose `WebUI` resource is sealed, and returns
    /// its URL; `sign: false` leaves the fixture unsigned. The fixture is
    /// removed on teardown.
    private func makeFixture(webUIResource: String = "console.log('fixture')\n", sign: Bool = true) throws -> URL {
        let directory = NSTemporaryDirectory().appending("WebUIIntegrityFixture-\(UUID().uuidString)")
        let bundleURL = URL(fileURLWithPath: directory).appendingPathComponent("Fixture.app")
        let contentsURL = bundleURL.appendingPathComponent("Contents")
        let macosURL = contentsURL.appendingPathComponent("MacOS")
        let webUIURL = contentsURL.appendingPathComponent("Resources/WebUI")
        try FileManager.default.createDirectory(at: webUIURL, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: macosURL, withIntermediateDirectories: true)

        // A real Mach-O binary is guaranteed at `/usr/bin/true` on macOS;
        // Ad-hoc signing needs no certificate or keychain, and the seal
        // Covers every file in the bundle, WebUI included.
        let binaryURL = macosURL.appendingPathComponent("Fixture")
        try FileManager.default.copyItem(
            at: URL(fileURLWithPath: Constants.trueBinaryPath),
            to: binaryURL
        )
        let infoPlist: [String: Any] = [
            "CFBundleIdentifier": Constants.bundleIdentifier,
            "CFBundleExecutable": "Fixture"
        ]
        let plistData = try PropertyListSerialization.data(fromPropertyList: infoPlist, format: .xml, options: 0)
        try plistData.write(to: contentsURL.appendingPathComponent("Info.plist"))
        try webUIResource.write(
            to: webUIURL.appendingPathComponent(Constants.webUIResourceName),
            atomically: true,
            encoding: .utf8
        )

        if sign {
            try self.runCodesign(["--force", "--sign", "-", bundleURL.path])
        } else {
            // `/usr/bin/true` ships signed by Apple, so its signature is
            // Removed too: otherwise the fixture would have a signature
            // Without a resource envelope (`errSecCSResourcesMissing`)
            // Instead of no signature at all.
            try self.runCodesign(["--remove-signature", binaryURL.path])
        }
        addTeardownBlock {
            try? FileManager.default.removeItem(at: URL(fileURLWithPath: directory))
        }
        return bundleURL
    }

    /// Runs `codesign` with the given arguments, throwing when it fails.
    private func runCodesign(_ arguments: [String]) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: Constants.codesignPath)
        process.arguments = arguments
        let stderrPipe = Pipe()
        process.standardOutput = FileHandle.nullDevice
        process.standardError = stderrPipe
        try process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            let stderr = String(
                data: stderrPipe.fileHandleForReading.readDataToEndOfFile(),
                encoding: .utf8
            ) ?? ""
            throw NSError(
                domain: "WebUIIntegrityRealSignatureTests",
                code: Int(process.terminationStatus),
                userInfo: [NSLocalizedDescriptionKey: "codesign failed on the fixture: \(stderr)"]
            )
        }
    }

    /// Verifies a fixture; `requirement` is nil for seal-only validation.
    private func verify(_ bundleURL: URL, requirement: SecRequirement? = nil) -> Bool {
        WebUIIntegrityVerifier(bundleURL: bundleURL, requirement: requirement).verifyWebUIBundle()
    }

    func testUntouchedFixture_Accepted() throws {
        let fixture = try self.makeFixture()
        XCTAssertTrue(self.verify(fixture))
    }

    func testModifiedSealedResource_Refused() throws {
        let fixture = try self.makeFixture()
        // Append a byte after signing: the seal no longer matches the file.
        let indexJS = fixture.appendingPathComponent("Contents/Resources/WebUI/\(Constants.webUIResourceName)")
        var data = try Data(contentsOf: indexJS)
        data.append(0x00)
        try data.write(to: indexJS)

        XCTAssertFalse(self.verify(fixture), "a modified sealed resource must be refused")
    }

    func testAddedUnsealedResource_Refused() throws {
        let fixture = try self.makeFixture()
        // A file added after signing is not covered by the seal
        // (`errSecCSBadResource` — "sealed resource is missing or invalid").
        let extra = fixture.appendingPathComponent("Contents/Resources/WebUI/extra.js")
        try "console.log('extra')\n".write(to: extra, atomically: true, encoding: .utf8)

        XCTAssertFalse(self.verify(fixture), "a resource added after signing must be refused")
    }

    func testUnsignedFixture_Refused() throws {
        let fixture = try self.makeFixture(sign: false)
        // Every build is signed by the team, dev builds included, so a
        // Missing signature means the seal was stripped.
        XCTAssertFalse(self.verify(fixture), "an unsigned bundle must be refused")
    }

    func testAdHocSignature_AgainstTeamRequirement() throws {
        // The team-pinned requirement from `BuildConfig.AG_HELPER_REQ` must
        // Parse, and a bundle re-signed with a foreign (ad-hoc) certificate
        // Must not satisfy it: the anti-re-sign property the verifier exists
        // To enforce.
        var requirement: SecRequirement?
        let status = SecRequirementCreateWithString(
            BuildConfig.AG_HELPER_REQ as CFString,
            [],
            &requirement
        )
        XCTAssertEqual(status, errSecSuccess, "AG_HELPER_REQ must parse as a requirement")
        let fixture = try self.makeFixture()
        let verdict = self.verify(fixture, requirement: requirement)
        // A dev build satisfies this requirement too, so the verdict is the
        // Same in every configuration.
        XCTAssertFalse(verdict, "a bundle re-signed with a foreign certificate must be refused")
    }
}
