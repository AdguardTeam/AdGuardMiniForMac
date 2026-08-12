// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SentryHelper.swift
//  AdguardMini
//

import Foundation
import AML
import AGSentry
import AGCrashReporterLib

// MARK: - Constants

private enum Constants {
    @UserDefault(key: .feedbackEmail, defaultValue: nil)
    static var feedbackEmail: String?
}

// MARK: - SentryHelper

protocol SentryHelper {
    var onEndStart: (() -> Void) { get set }
    func startSentryAndContinueStartUp()
}

// MARK: - SentryHelperImpl

final class SentryHelperImpl: SentryHelper {
    private let appMetadata: AppMetadata
    private let appResetService: AppResetService
    private var isResetingAtStartUp = false

    var onEndStart: (() -> Void) = {}

    init(appMetadata: AppMetadata, appResetService: AppResetService) {
        self.appMetadata = appMetadata
        self.appResetService = appResetService

        if self.appMetadata.rateUsNoCrashesDate.isNil {
            self.appMetadata.rateUsNoCrashesDate = .now
        }
    }

    deinit {
        LogDebug("\(self) deinit")
    }

    private func shouldSend(sentryEvent event: SentryEvent) -> Bool {
        self.appMetadata.rateUsNoCrashesDate = .now

        guard !self.isResetingAtStartUp else { return false }

        let crashedAppName = (event.isComponentEvent
                              ? .localized.base.crash_reporter_title_adguard_component
                              : BuildConfig.AG_APP_DISPLAYED_NAME)

        let email = Constants.feedbackEmail

        let reply = DispatchQueue.safeMainSync {
            SentryCrashReporter
                .callAdguardCrashReporter(
                    crashedAppName: crashedAppName,
                    windowTitle: self.makeWindowTitle(),
                    email: email,
                    watchedBid: BuildConfig.AG_APP_ID
                )
        }

        if !reply.email.isEmpty {
            Constants.feedbackEmail = reply.email
        }

        if reply.send {
            event.set(comment: reply.notes, email: reply.email)
        }

        if reply.reset {
            self.isResetingAtStartUp = true
            Task {
                if await !self.appResetService.resetApp(request: true) {
                    await MainActor.run {
                        self.isResetingAtStartUp = false
                        self.onEndStart()
                    }
                }
            }
        }

        return !self.isResetingAtStartUp && reply.send
    }

    private func makeWindowTitle() -> String {
        let mainAppName = BuildConfig.AG_APP_DISPLAYED_NAME
        let mainAppShortVersion = BuildConfig.AG_VERSION_TITLE

        return String(format: .localized.base.window_controller_crash_reporter, mainAppName, mainAppShortVersion)
    }
}

// MARK: - SentryHelper implementation

extension SentryHelperImpl {
    func startSentryAndContinueStartUp() {
        let completion = {
            DispatchQueue.main.async {
                if !self.isResetingAtStartUp {
                    self.onEndStart()
                }
            }
        }

        SharedSentryUtilities.startSentryForApp(
            completion: completion,
            shouldSend: self.shouldSend
        )
    }
}
