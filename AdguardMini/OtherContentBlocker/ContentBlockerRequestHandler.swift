// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerRequestHandler.swift
//  OtherContentBlocker
//

import Foundation

final class ContentBlockerRequestHandler: ContentBlockerRequestHandlerBase {
    override static var blockerType: SafariBlockerType { .other }
    override static var subsystem: Subsystem { .cbOther }
}
