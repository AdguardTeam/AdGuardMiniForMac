// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  PopupViewState.swift
//  PopupExtension
//

import SwiftUI
import AML
import AGSEDesignSystem

/// Thin `@MainActor` adapter between `PopupStore` and SwiftUI.
///
/// Subscribes to the store via `subscribe()` in a single long-lived
/// `Task`, projects `Store.State` into `@Published` fields consumed
/// by `PopupView`. The protection switch write path dispatches
/// `.protectionForUrlToggled(...)` back to the store.
@MainActor
final class PopupViewState: ObservableObject {
    // MARK: - Published properties

    @Published private(set) var domain: String = ""
    @Published private(set) var isSystemPage: Bool = true
    @Published private(set) var hasHealthCheckAttention: Bool = false
    @Published private(set) var isOnboardingCompleted: Bool = false
    @Published private(set) var popupLayout: PopupView.Layout = .domain
    @Published private(set) var popupState: InfoView.Configuration.State = .base
    @Published var isProtectionEnabledForUrl: Bool = true
    @Published private(set) var adsBlocked: Int = 0
    @Published private(set) var trackersBlocked: Int = 0
    @Published private(set) var isFreeUser: Bool = true
    @Published private(set) var isTrialAvailable: Bool = false
    @Published private(set) var trialDays: Int = 0

    var isBusy: Bool { popupState == .loading }
    var isPauseButtonAvailable: Bool { popupLayout == .domain }

    // MARK: - Private

    private let store: PopupStore
    private var observationTask: Task<Void, Never>?

    /// Guard to prevent `isProtectionEnabledForUrl` didSet from
    /// dispatching when the value is set by the state stream.
    private var isUpdatingFromStore = false

    // MARK: - Init

    init(store: PopupStore) {
        self.store = store
        self.startObserving()
    }

    deinit {
        self.observationTask?.cancel()
    }

    // MARK: - UI Actions

    func fixItClicked() {
        self.dispatch(.fixItTapped)
    }

    func blockElementClicked() {
        self.dispatch(.blockElementTapped)
    }

    func reportAnIssueClicked() {
        self.dispatch(.reportIssueTapped)
    }

    func rateAdguardMiniClicked() {
        self.dispatch(.rateTapped)
    }

    func buttonClicked() {
        self.dispatch(.infoButtonTapped)
    }

    func settingsClicked() {
        self.dispatch(.settingsTapped)
    }

    func pauseClicked() {
        self.dispatch(.pauseTapped)
    }

    func upsellTapped() {
        self.dispatch(.upsellTapped)
    }

    func popupWillShow() {
        self.dispatch(.popupWillShow)
    }

    func popupDidAppear() {
        self.dispatch(.popupOpened(openedAt: Date()))
    }

    /// Called by SwiftUI when the protection toggle changes.
    /// Converts the binding write into a store dispatch.
    func protectionToggleChanged(_ newValue: Bool) {
        guard !isUpdatingFromStore else { return }
        self.dispatch(.protectionForUrlToggled(newValue))
    }

    // MARK: - Private

    private func startObserving() {
        self.observationTask = Task { [weak self] in
            guard let self else { return }

            // Emit initial state immediately so the UI is populated before the first stream element arrives.
            let initialState = await self.store.currentState()
            self.applyState(initialState)

            for await state in await self.store.subscribe() {
                guard !Task.isCancelled else { return }
                self.applyState(state)
            }
        }
    }

    private func applyState(_ state: Store.State) {
        self.domain = state.tabContext.domain.isEmpty
            ? .localized.base.item_title_secure_page
            : state.tabContext.domain
        self.isSystemPage = state.tabContext.isSystemPage
        self.hasHealthCheckAttention = state.hasHealthCheckAttention

        self.isOnboardingCompleted = state.onboardingStatus == .completed

        self.popupLayout = self.mapLayout(state)
        self.popupState = self.mapPopupState(state)

        self.isUpdatingFromStore = true
        self.isProtectionEnabledForUrl = state.protectionEnabledForCurrentUrl
        self.isUpdatingFromStore = false

        self.adsBlocked = state.tabStats.adsBlocked
        self.trackersBlocked = state.tabStats.trackersBlocked
        self.isFreeUser = state.isFreeUser
        self.isTrialAvailable = state.isTrialAvailable
        self.trialDays = state.trialDays
    }

    private func mapLayout(_ state: Store.State) -> PopupView.Layout {
        let storeLayout = LayoutResolver.resolve(
            mainAppRunning: state.mainAppRunning,
            onboardingStatus: state.onboardingStatus,
            protectionEnabled: state.protectionEnabled,
            lastError: state.lastError,
            xpcAvailable: state.xpcAvailable
        )
        switch storeLayout {
        case .domain: return .domain
        case .adguardNotLaunched, .xpcUnavailable: return .adguardNotLaunched
        case .protectionIsDisabled: return .protectionIsDisabled
        case .somethingWentWrong: return .somethingWentWrong
        case .onboardingWasntCompleted: return .onboardingWasntCompleted
        }
    }

    private func mapPopupState(_ state: Store.State) -> InfoView.Configuration.State {
        // Loading takes priority: an in-flight action means the request is still running.
        // Errors are only set on completion, so they cannot coexist with inFlight.
        if state.inFlight != nil {
            return .loading
        }
        // Error in non-domain layout → .error.
        // Skipped for .somethingWentWrong — its visual layout handles error presentation.
        let layout = self.mapLayout(state)
        if state.lastError != nil && layout != .somethingWentWrong {
            return .error
        }
        return .base
    }

    private func dispatch(_ action: Store.Action) {
        Task {
            await self.store.dispatch(action)
        }
    }
}
