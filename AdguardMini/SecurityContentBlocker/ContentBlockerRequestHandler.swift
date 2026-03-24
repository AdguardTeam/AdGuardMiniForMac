// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerRequestHandler.swift
//  SecurityContentBlocker
//

import Foundation

final class ContentBlockerRequestHandler: ContentBlockerRequestHandlerBase {
    override static var blockerType: SafariBlockerType { .security }
    override static var subsystem: Subsystem { .cbSecurity }
}
