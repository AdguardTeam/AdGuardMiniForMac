// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ABTests+ToProto.swift
//  AdguardMini
//

import SciterSchema

extension ABTests.ActiveExperiment {
    func toProto() -> ActiveABTest {
        switch self {
        case .__placeholder__:         .unknown
        case .ag51019AdvancedSettings: .ag51019AdvancedSettings
        }
    }
}

extension ABTests.TestOption {
    func toProto() -> ABTestOption {
        switch self {
        case .notInTest: .unknown
        case .optA:      .optionA
        case .optB:      .optionB
        }
    }
}
