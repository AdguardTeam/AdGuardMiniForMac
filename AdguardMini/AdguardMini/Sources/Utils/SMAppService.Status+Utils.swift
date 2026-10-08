// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SMAppService.Status+Utils.swift
//  AdguardMini
//

import ServiceManagement

extension SMAppService.Status: @retroactive CustomStringConvertible {
    public var description: String {
        var description: String
        switch self {
        case .notRegistered:
            description = "notRegistered"
        case .enabled:
            description = "enabled"
        case .requiresApproval:
            description = "requiresApproval"
        case .notFound:
            description = "notFound"
        @unknown default:
            description = "unknown(\(self))"
        }
        return description
    }
}

extension SMAppService.Status {
    var registerStatus: LoginItemManagerRegisterStatus {
        var status: LoginItemManagerRegisterStatus
        switch self {
        case .notRegistered:
            status = .notRegistered
        case .enabled:
            status = .enabled
        case .requiresApproval:
            status = .requiresApproval
        case .notFound:
            status = .notFound
        @unknown default:
            status = .unexpected("\(self)")
        }
        return status
    }
}
