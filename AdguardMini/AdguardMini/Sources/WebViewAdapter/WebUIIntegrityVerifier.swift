// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  WebUIIntegrityVerifier.swift
//  AdguardMini
//

import Foundation
import Security
import AML

/// Verifies the integrity of the WebUI bundle before it is loaded into a
/// `WKWebView`.
protocol WebUIIntegrityVerifying: AnyObject {
    /// Verifies the WebUI bundle.
    ///
    /// - Returns: `true` when the bundle may be loaded.
    func verifyWebUIBundle() -> Bool
}

/// Validates the app bundle's code-signature seal, which covers the WebUI
/// bundle (`Contents/Resources/WebUI/`).
///
/// The seal is created at build time, so a bundle edited afterwards fails
/// the check (`errSecCSBadResource`), as does one re-signed ad-hoc or with a
/// foreign certificate, which no longer satisfies the team-pinned
/// requirement (`errSecCSReqFailed`). The check re-hashes the sealed
/// resources on every call and is never cached — a cached verdict is exactly
/// what tampering while the app runs would need — and it is fail-closed in
/// every configuration, dev builds included, since they carry the same team
/// signature as a shipped one.
final class WebUIIntegrityVerifier: WebUIIntegrityVerifying {
    /// The bundle whose seal is validated.
    private let bundleURL: URL

    /// The designated requirement the signature must satisfy; `nil` means
    /// the seal is validated alone.
    private let requirement: SecRequirement?

    /// Creates the app's verifier: the running app bundle validated against
    /// the team-pinned designated requirement (`BuildConfig.AG_HELPER_REQ`).
    static func makeProduction() -> WebUIIntegrityVerifier {
        // The requirement is a build constant, so a string that does not
        // Parse is a build defect rather than a runtime situation. It
        // Crashes in every configuration, dev builds included, instead of
        // Degrading to a load nothing has verified.
        guard let requirement = WebUIIntegrityVerifier.makeTeamRequirement() else {
            preconditionFailure("AG_HELPER_REQ must parse as a designated requirement")
        }
        return WebUIIntegrityVerifier(bundleURL: Bundle.main.bundleURL, requirement: requirement)
    }

    /// Creates a verifier for a bundle.
    ///
    /// - Parameters:
    ///   - bundleURL: The bundle whose seal is validated.
    ///   - requirement: The requirement the signature must satisfy, or
    ///     `nil` to validate the seal alone.
    init(bundleURL: URL, requirement: SecRequirement?) {
        self.bundleURL = bundleURL
        self.requirement = requirement
    }

    /// Validates the bundle against the signature it was sealed with.
    ///
    /// - Returns: `true` when the bundle is unmodified and its signature
    ///   satisfies the requirement.
    func verifyWebUIBundle() -> Bool {
        let status = WebUIIntegrityVerifier.checkValidity(of: self.bundleURL, requirement: self.requirement)
        guard status != errSecSuccess else { return true }

        let message = SecCopyErrorMessageString(status, nil) as String? ?? "unknown OSStatus"
        LogError("WebUI integrity check failed: status=\(status) message=\(message)")
        return false
    }

    /// Runs `SecStaticCodeCheckValidityWithErrors` on the bundle.
    ///
    /// - Returns: `errSecSuccess`, or the first failure: the status of
    ///   `SecStaticCodeCreateWithPath` when the bundle cannot be read,
    ///   `errSecCSBadResource` for a sealed resource that no longer matches
    ///   the signature, `errSecCSReqFailed` for a signature that does not
    ///   satisfy the requirement, `errSecCSUnsigned` when the bundle has no
    ///   signature at all.
    private static func checkValidity(of bundleURL: URL, requirement: SecRequirement?) -> OSStatus {
        var staticCode: SecStaticCode?
        let createStatus = SecStaticCodeCreateWithPath(bundleURL as CFURL, [], &staticCode)
        guard createStatus == errSecSuccess, let staticCode else {
            return createStatus
        }
        return SecStaticCodeCheckValidityWithErrors(staticCode, [], requirement, nil)
    }

    /// Builds the app's designated requirement from the xcconfig-provided
    /// string (team-pinned; see `ConfigNative.xcconfig` `AG_HELPER_REQ`).
    ///
    /// - Returns: The requirement, or `nil` when the string does not parse;
    ///   `makeProduction()` treats that as a build defect and crashes.
    private static func makeTeamRequirement() -> SecRequirement? {
        var requirement: SecRequirement?
        let status = SecRequirementCreateWithString(BuildConfig.AG_HELPER_REQ as CFString, [], &requirement)
        guard status == errSecSuccess else {
            LogError("Failed to build the designated requirement: status=\(status)")
            return nil
        }
        return requirement
    }

    // MARK: - No-op factory

    /// Returns a no-op verifier that reports every bundle as intact.
    static let noOp: any WebUIIntegrityVerifying = NoOpWebUIIntegrityVerifier()
}

// MARK: - NoOpWebUIIntegrityVerifier

/// No-op verifier implementation.
final class NoOpWebUIIntegrityVerifier: WebUIIntegrityVerifying {
    func verifyWebUIBundle() -> Bool {
        true
    }
}
