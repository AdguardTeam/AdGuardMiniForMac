// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ServiceMethodAllowlistConsistencyTests.swift
//  AdguardMiniTests
//

import XCTest
import ProtoSchema

/// Ensures generated service method allowlist matches generated dispatch cases.
final class ServiceMethodAllowlistConsistencyTests: XCTestCase {
    /// Resolves path to generated `Sources/services` directory.
    private func generatedServicesDir() throws -> URL {
        let testFile = URL(fileURLWithPath: #filePath)
        let repoRoot = testFile
            .deletingLastPathComponent()  // CodegenSchema
            .deletingLastPathComponent()  // AdguardMiniTests
            .deletingLastPathComponent()  // AdguardMini
            .deletingLastPathComponent()  // wise-ferret (repo root)
        return repoRoot
            .appendingPathComponent("AdguardMini")
            .appendingPathComponent("MiniResources")
            .appendingPathComponent("ProtoSchema")
            .appendingPathComponent("Sources")
            .appendingPathComponent("services")
    }

    /// Extracts `case "<Method>"` names from generated `handleRequest` switch.
    private func dispatchMethods(in source: String) -> Set<String> {
        var methods = Set<String>()
        source.enumerateSubstrings(
            in: source.startIndex..<source.endIndex,
            options: [.byLines]
        ) { line, _, _, _ in
            guard let line else { return }
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("case \"") else { return }
            let open = trimmed.index(trimmed.startIndex, offsetBy: 6)
            guard let close = trimmed[open...].firstIndex(of: "\"") else { return }
            methods.insert(String(trimmed[open..<close]))
        }
        return methods
    }

    func testGeneratedAllowlist_MatchesGeneratedDispatch_InEveryService() throws {
        let dir = try generatedServicesDir()
        // A missing `Sources/services/` directory means a broken checkout or a
        // Stale generation state — the exact drift this test exists to catch.
        // Fail loudly instead of silently skipping (which would mask it in CI).
        guard FileManager.default.fileExists(atPath: dir.path) else {
            XCTFail(
                "Generated services dir not found at \(dir.path); "
                + "run `Support/Scripts/update_proto_schema.sh`."
            )
            return
        }

        let entries = try FileManager.default.contentsOfDirectory(
            at: dir,
            includingPropertiesForKeys: nil
        )
        .filter { $0.pathExtension == "swift" }

        XCTAssertFalse(entries.isEmpty, "Expected generated service files under \(dir.path)")

        for fileURL in entries {
            // "SettingsService.swift" -> "SettingsService".
            let serviceName = fileURL.deletingPathExtension().lastPathComponent
            let source = try String(contentsOf: fileURL, encoding: .utf8)
            let dispatched = dispatchMethods(in: source)

            let allowed = try XCTUnwrap(
                ServiceMethodAllowlist.declaredMethods(for: serviceName),
                """
                \(serviceName) is a generated service file but has no allowlist entry \
                — the post-processor is out of step with codegen
                """
            )

            XCTAssertEqual(
                allowed, dispatched,
                """
                \(serviceName): allowlist drifted from the generated dispatch switch.
                allowlist (schema-derived) = \(allowed.sorted())
                dispatch (codegen-derived)  = \(dispatched.sorted())
                Re-run `Support/Scripts/update_proto_schema.sh` to regenerate both.
                """
            )
        }
    }
}
