// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ABTests+Utils.swift
//  SciterSchema
//

extension ActiveABTests {
    public init(activeTests: [ABTest]) {
        self.init()
        self.activeTests = activeTests
    }

    public static func activeTests(_ activeTests: [ABTest]) -> Self {
        Self.init(activeTests: activeTests)
    }
}

extension ABTest {
    public init(name: ActiveABTest, option: ABTestOption) {
        self.init()
        self.name = name
        self.option = option
    }
}
