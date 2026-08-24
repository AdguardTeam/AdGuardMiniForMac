// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PrimitivesWrappers+Utils.swift
//  ProtoSchema
//

import Foundation
import BaseProtoSchema

extension DoubleValue {
    public init(_ value: Double = 0.0) {
        self.init()
        self.value = value
    }
}

extension FloatValue {
    public init(_ value: Float = 0.0) {
        self.init()
        self.value = value
    }
}

extension Int64Value {
    public init(_ value: Int64 = 0) {
        self.init()
        self.value = value
    }
}

extension UInt64Value {
    public init(_ value: UInt64 = 0) {
        self.init()
        self.value = value
    }
}

extension Int32Value {
    public init(_ value: Int32 = 0) {
        self.init()
        self.value = value
    }
}

extension UInt32Value {
    public init(_ value: UInt32 = 0) {
        self.init()
        self.value = value
    }
}

extension BoolValue {
    public init(_ value: Bool = false) {
        self.init()
        self.value = value
    }
}

extension StringValue {
    public init(_ value: String = "") {
        self.init()
        self.value = value
    }
}
