// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MailExtension.swift
//  BlockerMail
//

import AML
import MailKit

/// Mail extension entry point. Configures shared logger and provides
/// the content blocker handler.
final class MailExtension: NSObject, MEExtension {
    override init() {
        super.init()
        LogConfig.setupSharedLogger(for: .mailBlocker)
    }

    func handlerForContentBlocker() -> MEContentBlocker {
        ContentBlocker.shared
    }
}
