// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  CurrentExtensionsStates+Utils.swift
//  AdguardMini
//

import ProtoSchema

extension CurrentExtensionsStates {
    func toProto() -> SafariExtensions {
        SafariExtensions(
            general: self.general.toProto(),
            privacy: self.privacy.toProto(),
            social: self.social.toProto(),
            security: self.security.toProto(),
            other: self.other.toProto(),
            custom: self.custom.toProto(),
            adguardForSafari: self.advanced.toProto()
        )
    }
}
