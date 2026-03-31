// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  StatusBarItemView.swift
//  AdguardMini
//

import Foundation
import AppKit.NSStatusItem
import AML

final class StatusBarItemView {
    private(set) var statusItem: NSStatusItem

    var image: NSImage? {
        get { self.statusItem.button?.image }
        set { self.statusItem.button?.image = newValue }
    }
    var alternateImage: NSImage? {
        get { self.statusItem.button?.alternateImage }
        set { self.statusItem.button?.alternateImage = newValue }
    }

    var highlighted: Bool = false {
        didSet {
            if self.highlighted == oldValue { return }
            self.statusItem.button?.isHighlighted = self.highlighted
        }
    }

    var isVisible: Bool {
        get { self.statusItem.isVisible }
        set { self.statusItem.isVisible = newValue }
    }

    var globalRect: CGRect {
        guard let frame = self.statusItem.button?.frame,
              let globalFrame = self.statusItem.button?.window?.convertToScreen(frame) else {
            return .zero
        }
        LogDebugTrace()
        LogDebug("Frame \(frame.debugDescription)")
        LogDebug("Global frame: \(globalFrame.debugDescription)")
        return globalFrame
    }

    init(statusItem: NSStatusItem) {
        self.statusItem = statusItem
    }

    func setTarget(_ target: AnyObject?) {
        self.statusItem.button?.target = target
    }

    func setAction(_ action: Selector?) {
        self.statusItem.button?.action = action
    }

    func listenEvents(_ events: NSEvent.EventTypeMask) {
        self.statusItem.button?.sendAction(on: events)
    }
}
