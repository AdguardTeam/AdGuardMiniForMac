// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ContentBlockerRequestHandler.swift
//  CustomContentBlocker
//

import Foundation

final class ContentBlockerRequestHandler: ContentBlockerRequestHandlerBase {
    override static var blockerType: SafariBlockerType { .custom }
    override static var subsystem: Subsystem { .cbCustom }
}
