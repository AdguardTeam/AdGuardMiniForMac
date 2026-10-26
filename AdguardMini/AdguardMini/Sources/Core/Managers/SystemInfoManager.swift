// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SystemInfoManager.swift
//  AdguardMini
//

import AppKit
import AML

// MARK: - Constants

private enum Constants {
    static let safariBundleID = "com.apple.Safari"
    static let bundleShortVersionString = "CFBundleShortVersionString"
}

// MARK: - SystemInfoManager

protocol SystemInfoManager {
    var safariVersion: String? { get }
    var name: String? { get }
    var mac: String? { get }
    var hid: String { get }
    var isMacOS25OrLower: Bool { get }
    /// True only on macOS 27.2.x, where system-wide filtering may not work.
    var isMacOS272: Bool { get }
}

// MARK: - SystemInfoManagerImpl

final class SystemInfoManagerImpl: SystemInfoManager {
    var safariVersion: String? {
        guard let safariUrl = NSWorkspace.shared.urlForApplication(withBundleIdentifier: Constants.safariBundleID),
              let bundle = Bundle(url: safariUrl)
        else { return nil }
        return bundle.infoDictionary?[Constants.bundleShortVersionString] as? String
    }

    var name: String? {
        Host.current().localizedName
    }

    var mac: String? {
        SystemInfo.mac
    }

    var hid: String {
        SystemInfo.serialNumber
    }

    let isMacOS25OrLower: Bool = {
        if #available(macOS 26, *) {
            return false
        }
        return true
    }()

    var isMacOS272: Bool {
        let version = ProcessInfo.processInfo.operatingSystemVersion
        return version.majorVersion == 27 && version.minorVersion == 2
    }
}
