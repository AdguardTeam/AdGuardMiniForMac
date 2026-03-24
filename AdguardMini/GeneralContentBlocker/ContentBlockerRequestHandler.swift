// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerRequestHandler.swift
//  BlockerExtension
//

import Foundation

final class ContentBlockerRequestHandler: ContentBlockerRequestHandlerBase {
    override static var blockerType: SafariBlockerType { .general }
    override static var subsystem: Subsystem { .cbGeneral }
}
