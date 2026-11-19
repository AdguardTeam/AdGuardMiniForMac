// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LoginItemManager.swift
//  AdguardMini
//

import Foundation
import ServiceManagement
import AML

// MARK: - LoginItemManager

/// The object responsible for the app's login item (background helper).
protocol LoginItemManager: Sendable {
    /// Reads the current helper status.
    func checkHelperStatus() -> LoginItemManagerRegisterStatus

    /// Startup routine: picks the action from the status and can re-register an enabled helper.
    func checkAndRegisterHelper() -> LoginItemManagerRegisterStatus

    /// Registers without the status dispatch: unregister, register, then read the status.
    func registerHelper() -> LoginItemManagerRegisterStatus
}

// MARK: - LoginItemManagerImpl

final class LoginItemManagerImpl: LoginItemManager {
    private var helperLoginItem: SMAppService {
        SMAppService.loginItem(identifier: BuildConfig.AG_HELPER_ID)
    }

    func checkHelperStatus() -> LoginItemManagerRegisterStatus {
        self.helperLoginItem.status.registerStatus
    }

    func checkAndRegisterHelper() -> LoginItemManagerRegisterStatus {
        self.modernCheckAndRegisterHelper()
    }

    func registerHelper() -> LoginItemManagerRegisterStatus {
        do {
            do {
                try self.helperLoginItem.unregister()
            } catch {
                LogWarn("Can't unregister helper: \(error)")
            }
            try self.helperLoginItem.register()
        } catch {
            LogError("Failed to register helper: \(error)")
        }
        return self.helperLoginItem.status.registerStatus
    }

    // MARK: Modern section

    private func modernCheckAndRegisterHelper() -> LoginItemManagerRegisterStatus {
        var status = self.helperLoginItem.status.registerStatus
        switch status {
        case .notRegistered, .notFound:
            LogInfo("Helper not registered")
            status = self.registerHelper()
        case .unexpected:
            LogError("Unexpected status for loginItem: \(status)")
        case .requiresApproval:
            LogDebug("Helper requires approval")
        case .enabled:
            LogDebug("Helper status: enabled")
            status = self.registerHelper()
        }
        return status
    }
}
