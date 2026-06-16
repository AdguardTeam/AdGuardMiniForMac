// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EBAppState.swift
//  AdguardMini
//

import Foundation
import AML

/// Class used as response in `appState` API method
@objc(EBAAppState)
final class EBAAppState: NSObject, NSSecureCoding {
    @objc dynamic var isProtectionEnabled: Bool = false
    @objc dynamic var lastCheckTime: EBATimestamp = currentTimestamp()
    @objc dynamic var logLevel: Int32 = Int32(Logger.shared.logLevel.rawValue)
    @objc dynamic var theme: Int32 = Int32(Theme.system.rawValue)
    @objc dynamic var isFreeUser: Bool = true
    @objc dynamic var isTrialAvailable: Bool = false
    @objc dynamic var trialDays: Int = 0

    @objc static let supportsSecureCoding: Bool = true

    @objc static func currentTimestamp() -> EBATimestamp {
        Date().timeIntervalSinceReferenceDate
    }

    @objc static var zeroTimestampString = Date(timeIntervalSinceReferenceDate: EBATimestamp.zero).iso8601String

    @objc static func timestampString(_ timestamp: EBATimestamp) -> String {
        timestamp == EBATimestamp.zero
        ? Self.zeroTimestampString
        : Date(timeIntervalSinceReferenceDate: timestamp).iso8601String
    }

    @objc static func currentTimestampString() -> String {
        self.timestampString(self.currentTimestamp())
    }

    @objc override init() { }

    @objc func encode(with coder: NSCoder) {
        coder.encode(self.isProtectionEnabled, forKey: "isProtectionEnabled")
        coder.encode(self.lastCheckTime, forKey: "lastCheckTime")
        coder.encode(self.logLevel, forKey: "logLevel")
        coder.encode(self.theme, forKey: "theme")
        coder.encode(self.isFreeUser, forKey: "isFreeUser")
        coder.encode(self.isTrialAvailable, forKey: "isTrialAvailable")
        coder.encode(self.trialDays, forKey: "trialDays")
    }

    @objc required init?(coder: NSCoder) {
        self.isProtectionEnabled = coder.decodeBool(forKey: "isProtectionEnabled")
        self.lastCheckTime = coder.decodeDouble(forKey: "lastCheckTime")
        self.logLevel = coder.decodeInt32(forKey: "logLevel")
        self.theme = coder.decodeInt32(forKey: "theme")
        self.isFreeUser = coder.decodeBool(forKey: "isFreeUser")
        self.isTrialAvailable = coder.decodeBool(forKey: "isTrialAvailable")
        self.trialDays = coder.decodeInteger(forKey: "trialDays")
    }

    @objc var lastCheckTimeString: String {
        Self.timestampString(self.lastCheckTime)
    }

    override var description: String {
        "<\(type(of: self)): \(Unmanaged.passUnretained(self).toOpaque())> isProtectionEnabled: \(self.isProtectionEnabled), lastCheckTime: \(self.lastCheckTimeString), logLevel: \(self.logLevel), theme: \(self.theme), isFreeUser: \(self.isFreeUser), isTrialAvailable: \(self.isTrialAvailable), trialDays: \(self.trialDays)"
    }
}

// MARK: Date + iso8601String

fileprivate extension Date {
    private static let iso8601DateFormatter = ISO8601DateFormatter()
    var iso8601String: String {
        let formatter = Self.iso8601DateFormatter
        return formatter.string(from: self)
    }
}
