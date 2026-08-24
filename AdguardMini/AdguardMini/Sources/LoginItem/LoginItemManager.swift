// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  LoginItemManager.swift
//  AdguardMini
//

import Foundation
import ServiceManagement
import Combine
import AML

// `SMCopyAllJobDictionaries` is deprecated in macOS 10.10 but is the only way
// To query login-item status on macOS < 13. Re-declared via `@_silgen_name`
// (without the deprecated attribute) so the call below does not warn.
@_silgen_name("SMCopyAllJobDictionaries")
private func legacyCopyAllJobDictionaries(_ domain: CFString) -> Unmanaged<CFArray>?

// MARK: - LoginItemManager

protocol LoginItemManager {
    func checkHelperStatus() -> LoginItemManagerRegisterStatus
    func checkAndRegisterHelper() -> LoginItemManagerRegisterStatus
}

// MARK: - LoginItemManagerImpl

final class LoginItemManagerImpl: LoginItemManager {
    @available(macOS 13.0, *)
    private var helperLoginItem: SMAppService {
        SMAppService.loginItem(identifier: BuildConfig.AG_HELPER_ID)
    }

    func checkHelperStatus() -> LoginItemManagerRegisterStatus {
        guard #available(macOS 13.0, *) else {
            return self.legacyCheckHelperStatus()
        }
        return self.helperLoginItem.status.registerStatus
    }

    func checkAndRegisterHelper() -> LoginItemManagerRegisterStatus {
        guard #available(macOS 13.0, *) else {
            return self.legacyCheckAndRegisterHelper()
            ? LoginItemManagerRegisterStatus.enabled
            : LoginItemManagerRegisterStatus.requiresApproval
        }
        return self.modernCheckAndRegisterHelper()
    }

    // MARK: Modern section

    @available(macOS 13.0, *)
    private func modernCheckAndRegisterHelper() -> LoginItemManagerRegisterStatus {
        var status = self.helperLoginItem.status.registerStatus
        switch status {
        case .notRegistered, .notFound:
            LogInfo("Helper not registered")
            status = self.modernRegisterHelperItem()
        case .unexpected:
            LogError("Unexpected status for loginItem: \(status)")
        case .requiresApproval:
            LogDebug("Helper requires approval")
        case .enabled:
            LogDebug("Helper status: enabled")
            status = self.modernRegisterHelperItem()
        }
        return status
    }

    @available(macOS 13.0, *)
    private func modernRegisterHelperItem() -> LoginItemManagerRegisterStatus {
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

    // MARK: Legacy section

    @available(macOS, obsoleted: 13.0, message: "Please use SMAppService instead")
    private func legacyCheckHelperStatus() -> LoginItemManagerRegisterStatus {
        // `SMCopyAllJobDictionaries` is the only way to query login item status.
        // It is deprecated, but there is no alternative on macOS < 13.
        guard let jobs = legacyCopyAllJobDictionaries(kSMDomainUserLaunchd)?
            .takeRetainedValue() as? [[String: Any]] else {
            return .notRegistered
        }
        let isEnabled = jobs.contains { ($0["Label"] as? String) == BuildConfig.AG_HELPER_ID }
        return isEnabled ? .enabled : .notRegistered
    }

    @available(macOS, obsoleted: 13.0, message: "Please use SMAppService instead")
    private func legacyCheckAndRegisterHelper() -> Bool {
        SMLoginItemSetEnabled(BuildConfig.AG_HELPER_ID as CFString, false)
        return SMLoginItemSetEnabled(BuildConfig.AG_HELPER_ID as CFString, true)
    }
}
