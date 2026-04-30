// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SafariExtensionHandler.swift
//  EntryExtension
//

import SafariServices
import AML
import AGSEDesignSystem

// MARK: - Constants

private enum Constants {
    static let adguardExtraScriptUrl = Bundle.main.url(
        forResource: "adguard-extra",
        withExtension: "js"
    )

    static let adguardExtra: String? = {
        guard let scriptUrl = Constants.adguardExtraScriptUrl else {
            LogError("Can't find script in bundle")
            return nil
        }

        do {
            return try String(contentsOf: scriptUrl)
        } catch {
            LogError("Can't read adguardExtra script: \(error)")
            return nil
        }
    }()
}

// MARK: - OutgoingExtensionMessage

/// Outgoing messages, passed to extension script
enum OutgoingExtensionMessage: String {
    /// Pings the helper script to see if it's already injected.
    case blockElementPing
    /// Command to start the assistant script.
    case blockElement
    /// Message with AdGuardExtra script body.
    case adguardExtraData
}

// MARK: - IncomingExtensionMessage

/// Incoming messages from extension script
enum IncomingExtensionMessage: String {
    /// The script sends this message in response to a ping. It means that it is ready to work.
    case blockElementPong
    /// Message with information about which rule for the current page the user created using assistant script.
    case ruleResponse
    /// Injector sends this message to get the AdGuard Extra script.
    case getAdGuardExtraData
    /// Message inviting you to subscribe to the filter.
    case addFilterSubscription
    /// Unknown message from one of scripts.
    case unknown

    init(rawValue: String) {
        switch rawValue {
        case Self.blockElementPong.rawValue:
            self = .blockElementPong
        case Self.ruleResponse.rawValue:
            self = .ruleResponse
        case Self.getAdGuardExtraData.rawValue:
            self = .getAdGuardExtraData
        case Self.addFilterSubscription.rawValue:
            self = .addFilterSubscription
        default:
            self = .unknown
        }
    }
}

// MARK: - SafariExtensionHandler

/// Popup extension handler
final class SafariExtensionHandler: SFSafariExtensionHandler {
    private let viewController: SFSafariExtensionViewController
    private let safariApi: SafariApiInteractor
    private let toolbarHandler: ToolbarHandler
    private let advancedBlockerHandler: AdvancedBlockerHandler
    private let appDiscovery: MainAppDiscovery
    private let statsReporter: BlockingStatsReporter
    private let perTabStatsTracker: PerTabStatsTracker

    // MARK: Init

    @MainActor
    override init() {
        let container = DIContainer.shared

        self.viewController = container.safariController
        self.safariApi = container.safariApiInteractor
        self.toolbarHandler = container.toolbarHandler
        self.advancedBlockerHandler = container.advancedBlockerHandler
        self.appDiscovery = container.mainAppDiscovery
        self.statsReporter = container.blockingStatsReporter
        self.perTabStatsTracker = container.perTabStatsTracker

        super.init()

        self.statsReporter.enqueueStart()
    }

    deinit {
        self.statsReporter.enqueueStop()
        LogDebug("\(self) deinited")
    }

    // MARK: Overrides

    override func contentBlocker(
        withIdentifier contentBlockerIdentifier: String,
        blockedResourcesWith urls: [URL],
        on page: SFSafariPage
    ) {
        guard !urls.isEmpty else { return }

        guard let blockerType = SafariBlockerType(contentBlockerIdentifier: contentBlockerIdentifier) else {
            LogWarn("Unknown content blocker identifier: \(contentBlockerIdentifier)")
            return
        }

        LogDebug("Content blocker \(blockerType) blocked \(urls.count) resource(s)")

        Task {
            await self.perTabStatsTracker.trackBlocked(on: page, urls: urls, blockerType: blockerType)
            await self.perTabStatsTracker.evictStaleEntries()
            SFSafariApplication.setToolbarItemsNeedUpdate()
        }

        self.statsReporter.enqueueBlocking(pageHash: page.hashValue, urls: urls, blockerType: blockerType)
    }

    override func page(_ page: SFSafariPage, willNavigateTo url: URL?) {
        Task {
            await self.perTabStatsTracker.resetStats(on: page, to: url)
            SFSafariApplication.setToolbarItemsNeedUpdate()
        }
    }

    // This is required by the signature of the function we're overwriting
    // swiftlint:disable:next discouraged_optional_collection
    override func messageReceived(withName messageName: String, from page: SFSafariPage, userInfo: [String: Any]?) {
        page.getPropertiesWithCompletionHandler { [messageName, userInfo] properties in
            LogDebug("The extension received a message \"\(messageName)\" from a script injected into (\(properties?.url?.absoluteString ?? "nil")) with userInfo (\(userInfo ?? [:]))")
        }

        let message = IncomingExtensionMessage(rawValue: messageName)

        switch message {
        case .blockElementPong:
            page.dispatchMessageToScript(withName: OutgoingExtensionMessage.blockElement.rawValue)
        case .ruleResponse:
            LogInfo("Try to add rule to user rules: \(userInfo?["rule"] ?? "nil")")
            Task {
                if let newRule = userInfo?["rule"] as? String {
                    do {
                        try await self.safariApi.addRule(newRule)
                    } catch {
                        LogError("Can't add rule \"\(newRule)\". Error: \(error)")
                    }
                }
            }
        case .getAdGuardExtraData:
            Task { await self.processAdGuardExtra(for: page, userInfo: userInfo ?? [:]) }
        case .addFilterSubscription:
            Task {
                if let subscribeUrlString = userInfo?["url"] as? String {
                    do {
                        try await self.appDiscovery.subscribeCustomFilter(subscribeUrlString)
                    } catch {
                        LogError("Can't start subscribe to custom filter. Error: \(error)")
                    }
                } else {
                    LogWarn("Can't add filter subscription. Missing url")
                }
            }
        default:
            LogDebug("Received unknown message \(messageName). Try send to AdvancedBlocking")
            self.advancedBlockerHandler.messageReceived(withName: messageName, from: page, userInfo: userInfo ?? [:])
        }
    }

    override func validateToolbarItem(in window: SFSafariWindow,
                                      validationHandler: @escaping ((Bool, String) -> Void)) {
        self.toolbarHandler.validateToolbarItem(in: window, validationHandler: validationHandler)
    }

    override func popoverViewController() -> SFSafariExtensionViewController {
        self.viewController
    }

    private func processAdGuardExtra(for page: SFSafariPage, userInfo: [String: Any]) async {
        guard let url = await page.properties()?.url?.absoluteString else {
            LogError("Invalid page for AdGuard Extra")
            return
        }

        do {
            let isActive = try await self.safariApi.getExtraState(withUrl: url)
            guard isActive else {
                LogDebug("AdGuard extra is inactive")
                return
            }

            guard let script = Constants.adguardExtra else {
                LogError("Can't find or read script in bundle")
                return
            }

            page.dispatchMessageToScript(
                withName: OutgoingExtensionMessage.adguardExtraData.rawValue,
                userInfo: [
                    "script": script,
                    "verbose": Logger.shared.logLevel == .debug,
                    "requestId": userInfo["requestId"] ?? ""
                ]
            )
        } catch {
            LogError("Error getExtraState: \(error)")
            return
        }
    }
}
