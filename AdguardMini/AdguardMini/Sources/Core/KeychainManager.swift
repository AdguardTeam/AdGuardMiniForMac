// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  KeychainManager.swift
//  AdguardMini
//

import Foundation
import AML
import CryptoKit

// MARK: - Constants

private enum Constants {
    static let licenseEncrKeyData: Data = {
        let appId = ProductInfo.applicationId()
        let hash = SHA256.hash(data: Data(appId.utf8))
        return Data(hash.prefix(16))
    }()
}

extension Keychain {
    static var debugLogging: Bool {
        get {
            let defaultValue = false
            if let string: String = Keychain.getValue(for: KeychainKey.Base.debugLogging.key) {
                return Bool(string) ?? defaultValue
            }
            return defaultValue
        }
        set {
            Keychain.set(key: .debugLogging, value: "\(newValue)")
        }
    }
}

// MARK: - KeychainManager

protocol KeychainManager: AnyObject {
    var applicationId: String? { get async }
    var debugLogging: Bool { get set }
    var userActionLastDirectory: String { get set }

    func getAppStatusInfo() async -> AppStatusInfo?
    func getAppStatusInfoSync() -> AppStatusInfo?
    func setAppStatusInfo(_ appStatusInfo: AppStatusInfo) async

    func delete(key: KeychainKey.Base) async
    func delete(key: KeychainKey.Secured) async
    func delete(key: KeychainKey.Base)
}

// MARK: - KeychainManagerImpl

final class KeychainManagerImpl: KeychainManager {
    var applicationId: String? {
        get async {
            await ProductInfo.applicationId()
        }
    }

    var debugLogging: Bool {
        get { Keychain.debugLogging }
        set { Keychain.debugLogging = newValue }
    }

    var userActionLastDirectory: String {
        get {
            let defaultValue = ""
            if let string: String = Keychain.getValue(for: KeychainKey.Base.userActionLastDirectory.key) {
                return string
            }
            return defaultValue
        }
        set {
            Keychain.set(key: .userActionLastDirectory, value: newValue)
        }
    }

    func getAppStatusInfo() async -> AppStatusInfo? {
        self.getAppStatusInfoSync()
    }

    func getAppStatusInfoSync() -> AppStatusInfo? {
        guard let data: Data = Keychain.getValueShared(for: KeychainKey.Secured.licenseInfo.key)
        else { return nil }

        guard let decrypted = CryptoUtils.aesDecrypt(data: data, keyData: Constants.licenseEncrKeyData)
        else {
            LogError("Can't decrypt License Info")
            return nil
        }

        do {
            return try NSKeyedUnarchiver.unarchivedObject(ofClass: AppStatusInfo.self, from: decrypted)
        } catch {
            LogError("Can't unarchive License Info: \(error)")
            return nil
        }
    }

    func setAppStatusInfo(_ appStatusInfo: AppStatusInfo) async {
        _ = await Task.detached(priority: .userInitiated) {
            do {
                let data = try NSKeyedArchiver.archivedData(withRootObject: appStatusInfo, requiringSecureCoding: true)
                if let encrypted = CryptoUtils.aesEncrypt(data: data, keyData: Constants.licenseEncrKeyData) {
                    Keychain.setShared(key: KeychainKey.Secured.licenseInfo.key, data: encrypted)
                } else {
                    LogError("Can't crypt license info data")
                }
            } catch {
                LogError("Can't convert license info to data")
            }
        }
        .result
    }

    func delete(key: KeychainKey.Base) async {
        await Keychain.delete(key: key)
    }

    func delete(key: KeychainKey.Secured) async {
        // Delete from both shared and non-shared keychain for safety
        Keychain.deleteShared(for: key.key)
        await Keychain.delete(key: key)
    }

    func delete(key: KeychainKey.Base) {
        Keychain.delete(for: key.key)
    }
}
