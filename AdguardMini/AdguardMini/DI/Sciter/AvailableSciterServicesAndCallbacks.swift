// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  AvailableSciterServicesAndCallbacks.swift
//  AdguardMini
//

import SciterSchema

// MARK: - Services

protocol InternalServiceDependent: SciterServiceDependent {}
protocol SettingsServiceDependent: SciterServiceDependent {}
protocol AccountServiceDependent: SciterServiceDependent {}
protocol AdvancedBlockingServiceDependent: SciterServiceDependent {}
protocol AppInfoServiceDependent: SciterServiceDependent {}
protocol FiltersServiceDependent: SciterServiceDependent {}
protocol UserRulesServiceDependent: SciterServiceDependent {}
protocol OnboardingServiceDependent: SciterServiceDependent {}
protocol TrayServiceDependent: SciterServiceDependent {}
protocol CommonServiceDependent: SciterServiceDependent {}
protocol TelemetrySciterServiceDependent: SciterServiceDependent {}

// MARK: - Callbacks

protocol TrayCallbackServiceDependent: SciterServiceDependent {}
protocol SettingsCallbackServiceDependent: SciterServiceDependent {}
protocol AccountCallbackServiceDependent: SciterServiceDependent {}
protocol FiltersCallbackServiceDependent: SciterServiceDependent {}
protocol UserRulesCallbackServiceDependent: SciterServiceDependent {}
protocol OnboardingCallbackServiceDependent: SciterServiceDependent {}
