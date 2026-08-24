// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensions+Utils.swift
//  ProtoSchema
//

import BaseProtoSchema

extension SafariExtensions {
    public init(
        general: SafariExtension,
        privacy: SafariExtension,
        social: SafariExtension,
        security: SafariExtension,
        other: SafariExtension,
        custom: SafariExtension,
        adguardForSafari: SafariExtension
    ) {
        self.init()

        self.general = general
        self.privacy = privacy
        self.social = social
        self.security = security
        self.other = other
        self.custom = custom
        self.adguardForSafari = adguardForSafari
    }
}
