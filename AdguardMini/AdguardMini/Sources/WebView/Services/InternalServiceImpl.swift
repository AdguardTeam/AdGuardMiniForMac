// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InternalServiceImpl.swift
//  AdguardMini
//

import AppKit
import ProtoSchema
import AML

extension InternalServiceImpl:
    WebViewAppsControllerDependent,
    EventBusDependent,
    SupportDependent {}

/// Service for internal helper operations.
final class InternalServiceImpl: InternalService.ServiceType {
    // MARK: Private properties

    var webViewAppsController: WebViewAppsController!
    var support: Support!
    var eventBus: EventBus!

    override init() {
        super.init()

        self.setupServices()
    }

    // MARK: Protocol implementation

    func openSettingsWindow(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
        Task { @MainActor in
            self.webViewAppsController.show(.settings)
            self.eventBus.post(event: .settingsWindowOpened, userInfo: nil)

            promise(EmptyValue())
        }
    }

    // MARK: User rules window

    /// Opens the user-rules child window.
    func openUserRulesWindow(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
        Task { @MainActor in
            let params = ChildWindowParams(
                id: ChildWindow.userRuleEditorWindowId,
                width: 800,
                height: 670,
                caption: NSLocalizedString("user_rules_editor_title", comment: "")
            )
            do {
                _ = try self.webViewAppsController.openChildWindow(
                    parent: .settings,
                    html: nil,
                    params: params
                )
            } catch {
                LogError("openUserRulesWindow failed: \(error)")
            }
            promise(EmptyValue())
        }
    }

    /// Closes the user-rules child window.
    func closeUserRulesWindow(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
        Task { @MainActor in
            do {
                try self.webViewAppsController.closeChildWindow(
                    ChildWindow.userRuleEditorWindowId
                )
            } catch {
                LogError("closeUserRulesWindow failed: \(error)")
            }
            promise(EmptyValue())
        }
    }

    /// Returns system UI language.
    func getSystemLanguage(_ message: EmptyValue, _ promise: @escaping (StringValue) -> Void) {
        promise(StringValue(Locales.navigatorLang))
    }

    func showInFinder(_ message: Path, _ promise: @escaping (EmptyValue) -> Void) {
        // Resolve `..` components and symlinks before the confinement check so a
        // Traversal or symlink pointing outside the container cannot pass and then
        // Reveal an arbitrary file in Finder.
        let url = URL(fileURLWithPath: message.path).standardizedFileURL.resolvingSymlinksInPath()
        guard PathConfiner.isConfinable(
            url.path,
            granted: PathGrantStore.shared,
            containerRoots: PathConfiner.containerRoots(appGroupIdentifier: BuildConfig.AG_APP_ID)
        ) else {
            LogError("showInFinder rejected: path not confined")
            promise(EmptyValue())
            return
        }
        NSWorkspace.shared.activateFileViewerSelecting([url])
        promise(EmptyValue())
    }

    func reportAnIssue(_ message: EmptyValue, _ promise: @escaping (EmptyValue) -> Void) {
        Task {
            guard let url = await self.support.reportSiteUrl(reportUrl: nil, from: "support") else {
                promise(EmptyValue())
                LogError("Can't create report URL")
                return
            }
            // `reportSiteUrl` resumes on a background executor; AppKit calls
            // Must run on the main actor.
            await MainActor.run {
                NSWorkspace.shared.open(url)
                promise(EmptyValue())
            }
        }
    }
}
