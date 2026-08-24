// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  ModuleWindowConfiguration.swift
//  AdguardMini
//

import AppKit

/// Window kind selector.
enum WindowKind {
    case panel
    case window
}

/// Per-module window configuration.
struct ModuleWindowConfiguration {
    let windowKind: WindowKind
    let styleMask: NSWindow.StyleMask
    /// Window title text.
    let title: String
    let level: NSWindow.Level
    let frameAutosaveKey: String?
    let isMovable: Bool
    let collectionBehavior: NSWindow.CollectionBehavior
    let titleVisibility: NSWindow.TitleVisibility
    let titlebarAppearsTransparent: Bool
    let vibrancyMaterial: NSVisualEffectView.Material?
    let isTransparent: Bool
    let cornerRadius: CGFloat?
    let contentFrame: CGRect
    /// Minimum content size.
    let contentMinSize: CGSize?
    /// Whether to center on screen.
    let centerOnScreen: Bool
}

/// Module window presets.
enum ModuleWindowConfigurator {
    /// Returns per-module window configuration preset.
    static func config(for module: ModuleId) -> ModuleWindowConfiguration {
        switch module {
        case .tray:
            // Non-activating popover-style tray panel.
            return ModuleWindowConfiguration(
                windowKind: .panel,
                styleMask: [.nonactivatingPanel, .titled, .fullSizeContentView],
                title: "",
                level: .statusBar,
                frameAutosaveKey: nil,
                isMovable: false,
                collectionBehavior: [.moveToActiveSpace, .fullScreenAuxiliary],
                titleVisibility: .hidden,
                titlebarAppearsTransparent: true,
                vibrancyMaterial: .popover,
                isTransparent: true,
                cornerRadius: 10,
                contentFrame: CGRect(x: 100, y: 100, width: 360, height: 582),
                contentMinSize: nil,
                centerOnScreen: false
            )
        case .settings:
            // Resizable settings window with autosave frame key.
            return settingsWindowConfiguration()
        case .onboarding:
            // Centered fixed-size onboarding window.
            return ModuleWindowConfiguration(
                windowKind: .window,
                styleMask: [.titled, .closable],
                title: "AdGuard Mini",
                level: .normal,
                frameAutosaveKey: nil,
                isMovable: true,
                collectionBehavior: [],
                titleVisibility: .visible,
                titlebarAppearsTransparent: false,
                vibrancyMaterial: nil,
                isTransparent: false,
                cornerRadius: nil,
                contentFrame: CGRect(x: 0, y: 0, width: 800, height: 640),
                contentMinSize: nil,
                centerOnScreen: true
            )
        case .userrules:
            // User-rules editor window.
            return ModuleWindowConfiguration(
                windowKind: .window,
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                title: "AdGuard Mini",
                level: .normal,
                frameAutosaveKey: "AdguardMini.UserRulesEditor",
                isMovable: true,
                collectionBehavior: [],
                titleVisibility: .visible,
                titlebarAppearsTransparent: false,
                vibrancyMaterial: nil,
                isTransparent: false,
                cornerRadius: nil,
                contentFrame: CGRect(x: 0, y: 0, width: 800, height: 670),
                contentMinSize: nil,
                centerOnScreen: false
            )
        }
    }

    /// Settings window configuration.
    private static func settingsWindowConfiguration() -> ModuleWindowConfiguration {
        // Uses legacy autosave key and minimum size.
        ModuleWindowConfiguration(
            windowKind: .window,
            styleMask: [.titled, .resizable, .miniaturizable, .closable],
            title: "AdGuard Mini",
            level: .normal,
            frameAutosaveKey: "AdguardMini.SettingsApp",
            isMovable: true,
            collectionBehavior: [],
            titleVisibility: .visible,
            titlebarAppearsTransparent: false,
            vibrancyMaterial: nil,
            isTransparent: false,
            cornerRadius: nil,
            contentFrame: CGRect(x: 500, y: 100, width: 800, height: 640),
            contentMinSize: CGSize(width: 800, height: 640),
            // Center on first launch: with no autosaved frame the 800×640
            // Window at (500,100) extends past the right edge / above the
            // Visible area on smaller displays. `apply` centers before
            // `setFrameAutosaveName`, so a saved frame still wins later.
            centerOnScreen: true
        )
    }
}
