// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  UrlSchemesProcessor.swift
//  AdguardMini
//

import Foundation
import AML

// MARK: - UrlSchemesProcessor

protocol UrlSchemesProcessor {
    func processUrls(_ urls: [URL])
}

// MARK: - UrlSchemesProcessorImpl

final class UrlSchemesProcessorImpl: UrlSchemesProcessor {
    private let appLifecycleService: AppLifecycleService
    private let backendService: BackendService
    private let sciterAppController: SciterAppsController
    private let userSettings: UserSettingsManager
    private let eventBus: EventBus

    init(
        appLifecycleService: AppLifecycleService,
        backendService: BackendService,
        sciterAppController: SciterAppsController,
        userSettings: UserSettingsManager,
        eventBus: EventBus
    ) {
        self.appLifecycleService = appLifecycleService
        self.backendService = backendService
        self.sciterAppController = sciterAppController
        self.userSettings = userSettings
        self.eventBus = eventBus
    }

    func processUrls(_ urls: [URL]) {
        for url in urls {
            self.processUrl(url)
        }
    }

    private func processUrl(_ url: URL) {
        guard let urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: true),
              let scheme = urlComponents.scheme
        else {
            LogWarn("Invalid url: \(url)")
            return
        }
        let forProcessing = urlComponents.host ?? urlComponents.path
        self.processUrl(urlComponents, scheme: scheme, forProcessing: forProcessing)
    }

    private func processUrl(_ urlComponents: URLComponents, scheme: String, forProcessing: String) {
        switch scheme {
        case InternalUrlSchemeActionUrl.scheme:
            self.processInternalScheme(urlComponents, path: forProcessing)
        case MainUrlSchemeActionUrl.scheme:
            self.processMainScheme(urlComponents, host: forProcessing)
        default:
            LogWarn("Unknown scheme in \(urlComponents)")
        }
    }

    private func processInternalScheme(_ urlComponents: URLComponents, path: String) {
        switch path {
        case InternalUrlSchemeActionUrl.restart.path:
            LogInfo("Restart app received by deep link.")
            self.appLifecycleService.terminate(restart: true)
        case InternalUrlSchemeActionUrl.openSettings().path:
            LogInfo("Open settings received by deep link.")
            let page = urlComponents.queryItems?
                .first { $0.name == InternalUrlSchemeActionUrl.OpenSettingsPageParam.page }?
                .value
            self.handleShowSettings(page: page)
        case InternalUrlSchemeActionUrl.openPurchase.path:
            LogInfo("Open purchase received by deep link.")
            self.handleShowSettings(page: "paywall")
        case InternalUrlSchemeActionUrl.subscribeFilter.path:
            LogInfo("Subscribe filter settings received by deep link.")

            Task {
                let subscribeFilterParamUrl = InternalUrlSchemeActionUrl.SubscribeFilterParam.url
                guard let queryItems = urlComponents.queryItems,
                        let subscribeUrl = queryItems.first(where: {
                            $0.name == subscribeFilterParamUrl
                        })?.value else {
                    LogError("Missing required parameter '\(subscribeFilterParamUrl)' in subscribe filter deep link.")
                    return
                }
                if !self.userSettings.firstRun {
                    self.eventBus.post(event: .customFilterSubscriptionUrlReceived, userInfo: subscribeUrl)
                }
                self.handleShowSettings()
            }
        default:
            LogWarn("Unknown deep link url: \(urlComponents)")
        }
    }

    private func processMainScheme(_ urlComponents: URLComponents, host: String) {
        Task {
            switch host {
            case MainUrlSchemeActionUrl.webFlowRedirect.host:
                do {
                    LogWarn("Direct auth callback received by deep link. Trying to refresh app status info")
                    try await self.handleSessionEnd()
                } catch {
                    LogError("Can't refresh app status info: \(error)")
                }
            case MainUrlSchemeActionUrl.subscribeWebFlowRedirect.host:
                do {
                    LogInfo("Handle subscribe web flow redirect received by deep link")
                    if urlComponents.queryItems?.contains(where: { $0.name == "license" }) ?? false {
                        try await self.handleSessionEnd()
                    } else {
                        LogInfo("No important info found in link. Ignoring it.")
                    }
                } catch {
                    LogError("Error while handling subscribe web flow redirect: \(error)")
                }
            default:
                LogWarn("Unknown host in \(urlComponents)")
            }
        }
    }

    private func handleSessionEnd() async throws {
        await self.backendService.cancelWebSession()
        try await self.backendService.refreshAppStatusInfo()
        self.handleShowSettings()
    }

    private func handleShowSettings(page: String? = nil) {
        let firstRun = self.userSettings.firstRun
        let app: AvailableSciterApp = firstRun ? .onboarding : .settings
        if let page, !firstRun {
            self.eventBus.post(event: .settingsPageRequested, userInfo: page)
        }
        self.sciterAppController.showApp(app)
    }
}

// MARK: - Private utils

private extension URLComponents? {
    var description: String {
        self?.url?.absoluteString ?? "nil"
    }
}
