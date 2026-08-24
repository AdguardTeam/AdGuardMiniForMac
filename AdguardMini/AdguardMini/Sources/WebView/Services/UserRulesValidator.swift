// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UserRulesValidator.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import ContentBlockerConverter

/// Validates `UserRules` payload size and limits.
enum UserRulesValidator {
    /// Why a payload was rejected.
    enum Failure: Error, Equatable {
        case tooManyRules(max: Int)
        case ruleTooLong(maxLength: Int)
        case payloadTooLarge(maxBytes: Int)
    }

    private enum Constants {
        static let maxRuleLengthChars = 5000
        static let maxTotalBytes = 64 * 1024 * 1024
    }

    /// Validates user rules against configured caps.
    /// - Parameters:
    ///   - rules: Payload to validate.
    ///   - maxRules: Maximum allowed rules count.
    static func validate(
        _ rules: UserRules,
        maxRules: Int = SafariVersion.autodetect().rulesLimit
    ) -> Result<Void, Failure> {
        guard rules.rules.count <= maxRules else {
            return .failure(.tooManyRules(max: maxRules))
        }
        // Single pass: enforce the per-rule character cap and accumulate the total
        // Byte size at the same time (avoids scanning every rule string twice).
        var totalBytes = 0
        for rule in rules.rules {
            if rule.rule.count > Constants.maxRuleLengthChars {
                return .failure(.ruleTooLong(maxLength: Constants.maxRuleLengthChars))
            }
            totalBytes += rule.rule.utf8.count
        }
        guard totalBytes <= Constants.maxTotalBytes else {
            return .failure(.payloadTooLarge(maxBytes: Constants.maxTotalBytes))
        }
        return .success(())
    }

    /// Maximum total size (bytes) an imported user-rules payload may occupy.
    /// Mirrors the `payloadTooLarge` cap applied to `updateUserRules`, so a
    /// user-selected import file cannot exhaust memory/disk either.
    ///
    /// Note: this is a RULESET-TEXT-SIZE proxy (the summed UTF-8 bytes of the
    /// rule strings), not the serialized protobuf wire size — the actual
    /// `UserRules` payload carries field tags/length-delimiters on top. It
    /// bounds memory/disk abuse; it cannot prevent the spike of decoding an
    /// already-received oversized payload (validation necessarily runs after
    /// deserialization).
    static let maxImportedContentBytes = Constants.maxTotalBytes

    /// Whether imported user-rules text may be persisted. Guards the
    /// `importUserRules` path, which loads an arbitrary user-selected file and
    /// would otherwise bypass the `updateUserRules` caps.
    static func isImportAllowed(content: String) -> Bool {
        content.utf8.count <= maxImportedContentBytes
    }
}
