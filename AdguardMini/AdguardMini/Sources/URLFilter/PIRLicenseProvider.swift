// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PIRLicenseProvider.swift
//  AdguardMini
//

import Foundation

/// Supplies the license credential embedded into the PIR token: the active
/// subscription JWS or the stored license key.
///
/// Split layout is deliberate. The protocol lives here in `Sources/URLFilter/`
/// because the whole folder is compiled into the test target, and the test
/// sources reference this seam directly (no `@testable import`). The
/// implementation lives in `Sources/Licensing/` with the license layer.
/// Moving either file breaks one of the two memberships — do not "tidy" it.
protocol PIRLicenseProvider: AnyObject {
    /// The current license credential, or an empty string when none is active.
    func licenseCredential() async -> String
}
