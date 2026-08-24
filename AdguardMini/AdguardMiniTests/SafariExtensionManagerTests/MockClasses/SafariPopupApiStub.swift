// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariPopupApiStub.swift
//  AdguardMiniTests
//

import Foundation
import AML

/// No-op `SafariPopupApi` so `SafariExtensionManagerImpl` can be constructed
/// in tests. The manager never calls it during reload.
final class SafariPopupApiStub: SafariPopupApi {
    func appStateChanged(_ appState: EBAAppState) {}
    func setLogLevel(_ logLevel: LogLevel) {}
    func setTheme(_ theme: Theme) {}
}
