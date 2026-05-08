// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  EventBus.swift
//  AdguardMini
//

import Foundation

// MARK: - Constants

fileprivate enum Constants {
    static let dataKey: String = "data"
}

// MARK: - Event

enum Event: String {
    case paidStatusChanged = "PaidStatusChanged"
    case licenseInfoUpdated = "LicenseInfoUpdated"
    case userFilterChange = "UserFilterChange"

    case safariExtensionUpdate    = "SafariExtensionUpdate"
    case appVersionStatusResolved = "AppVersionStatusResolved"
    case importStateChange        = "ImportStateChange"
    case settingsPageRequested    = "SettingsPageRequested"
    case loginItemStateChange     = "LoginItemStateChange"
    case hardwareAccelerationChanged = "HardwareAccelerationChanged"

    case filtersUpdateStarted   = "FiltersUpdateStarted"
    case filtersRulesUpdated    = "FiltersRulesUpdated"
    case filterStatusResolved   = "FilterStatusResolved"
    case filtersMetadataUpdated = "FiltersMetadataUpdated"

    case customFilterSubscriptionUrlReceived = "customFilterSubscriptionUrlReceived"

    case flmFatalError = "FlmFatalError"

    case networkStatusChanged = "NetworkStatusChanged"

    case effectiveThemeChanged = "EffectiveThemeChanged"

    case settingsWindowOpened = "SettingsWindowOpened"
}

private extension Notification.Name {
    /// Build a `Notification.Name` from an `Event` without repeating rawValue at call sites.
    init(_ event: Event) { self.init(event.rawValue) }
}

// MARK: - EventBus

protocol EventBus {
    /// Function to post a notification.
    func post(event: Event, userInfo: Any?)
    /// Function to subscribe to notifications.
    func subscribe(observer: Any, selector: Selector, event: Event)
    /// Returns an async sequence of `Notification` values produced by the event bus.
    /// - Parameter event: Event to subscribe to.
    /// - Returns: An async sequence that yields notifications matching `event`.
    /// - Delivery: Values are emitted on the posting thread (use `MainActor.run` if you need UI work).
    /// - Cancellation: The sequence finishes when the consuming task is cancelled.
    func notifications(for event: Event) -> NotificationCenter.Notifications
    /// Function to unsubscribe from notifications.
    func unsubscribe(observer: Any, event: Event)
    /// Function to unsubscribe from all notifications.
    func unsubscribeAll(observer: Any)
    /// Function for parse notification into specific type.
    func parseNotification<T>(_ notification: Notification) -> T?
}

// MARK: - EventBusImpl

/// For needs of passing events from/to different services and remove cycle dependencies, there is simple event bus based on NotificationCenter.
/// for parse notifications data use parseNotification
final class EventBusImpl: EventBus {
    func post(event: Event, userInfo: Any? = nil) {
        NotificationCenter.default.post(
            name: .init(event.rawValue),
            object: nil,
            userInfo: userInfo.map { [Constants.dataKey: $0] }
        )
    }

    func subscribe(observer: Any, selector: Selector, event: Event) {
        NotificationCenter.default.addObserver(observer, selector: selector, name: .init(event), object: nil)
    }

    func notifications(for event: Event) -> NotificationCenter.Notifications {
        NotificationCenter.default.notifications(named: .init(event))
    }

    func unsubscribe(observer: Any, event: Event) {
        NotificationCenter.default.removeObserver(observer, name: .init(event), object: nil)
    }

    func unsubscribeAll(observer: Any) {
        NotificationCenter.default.removeObserver(observer)
    }

    func parseNotification<T>(_ notification: Notification) -> T? {
        notification.userInfo?[Constants.dataKey] as? T
    }
}
