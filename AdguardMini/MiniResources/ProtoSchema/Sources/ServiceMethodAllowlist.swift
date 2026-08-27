// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/// This code was generated automatically by `generateMethodAllowlist.py`
/// from `AdguardMini/ui/schema/services/*.proto`. Do not edit by
/// hand — re-run `Support/Scripts/update_proto_schema.sh` to regenerate.

import Foundation

/// Schema-derived allowlist of method names each inbound RPC service
/// declares. Consulted by `WKWebViewBridge` before dispatch: a method
/// absent from its service's set is rejected at the bridge, the
/// service implementation is never entered, and the caller resolves with an
/// empty payload — identical to today's unknown-method outcome.
public enum ServiceMethodAllowlist {
    /// Returns the set of method names the named service declares in the
    /// schema, or `nil` if `serviceName` is not a generated service.
    ///
    /// `nil` (not an empty set) is returned for non-generated services so
    /// hand-written and test services keep their existing behaviour — the
    /// empty default never silently applies to them. A generated service
    /// with zero declared methods returns an empty set (accepts none).
    public static func declaredMethods(for serviceName: String) -> Set<String>? {
        switch serviceName {
        case "AccountService":
            return ["EnterActivationCode", "GetLicense", "GetSubscriptionsInfo", "GetTrayLicense", "GetTrialAvailableDays", "RefreshLicense", "RequestActivate", "RequestBind", "RequestLogout", "RequestOpenAppStore", "RequestOpenAppStoreReview", "RequestOpenSubscriptions", "RequestRenew", "RequestRestorePurchases", "RequestSubscribe"]
        case "AdvancedBlockingService":
            return ["GetAdguardExtra", "GetAdvancedRules", "GetMailProtection", "GetRealTimeFiltersUpdate", "GetURLFilterSeen", "GetURLFilterState", "RemoveURLFilter", "ResetURLFilterCache", "SetURLFilterEnabled", "UpdateAdguardExtra", "UpdateAdvancedRules", "UpdateMailProtection", "UpdateRealTimeFiltersUpdate", "UpdateURLFilterProtectionLevel", "UpdateURLFilterSeen"]
        case "AppInfoService":
            return ["GetAbout"]
        case "AppUpdateService":
            return ["CheckApplicationVersion", "RequestApplicationUpdate"]
        case "ConsentService":
            return ["UpdateAllowTelemetry", "UpdateConsent"]
        case "FiltersService":
            return ["CheckCustomFilter", "ConfirmAddCustomFilter", "DeleteCustomFilters", "GetEnabledFiltersIds", "GetFiltersGroupedByExtensions", "GetFiltersIndex", "GetFiltersMetadata", "RequestFiltersUpdate", "UpdateCustomFilter", "UpdateFilters", "UpdateLanguageSpecific"]
        case "InternalService":
            return ["CloseUserRulesWindow", "GetSystemLanguage", "OpenSettingsWindow", "OpenUserRulesWindow", "ShowInFinder", "reportAnIssue"]
        case "OnboardingService":
            return ["GetSystemLanguage", "OnboardingDidComplete"]
        case "SafariExtensionsService":
            return ["GetSafariExtensions", "OpenSafariExtensionPreferences"]
        case "SettingsService":
            return ["ExportLogs", "ExportSettings", "ForceRestartOnHardwareAccelerationImport", "GetContentBlockersRulesLimit", "GetHealthCheckDismissedCards", "GetPromoDismissedCards", "GetSettings", "GetUserActionLastDirectory", "ImportSettings", "ImportSettingsConfirm", "ResetSettings", "ResetStatistics", "SelectFile", "SendFeedbackMessage", "UpdateAutoFiltersUpdate", "UpdateDebugLogging", "UpdateHardwareAcceleration", "UpdateHealthCheckDismissedCards", "UpdateLaunchOnStartup", "UpdatePromoDismissedCards", "UpdateQuitReaction", "UpdateShowInMenuBar", "UpdateShowSafariToolbarBadge", "UpdateTheme", "UpdateUserActionLastDirectory"]
        case "SystemService":
            return ["OpenLoginItemsSettings", "RequestOpenSettingsPage"]
        case "TelemetryService":
            return ["GetActiveABTests", "RecordEvent"]
        case "ThemeService":
            return ["GetEffectiveTheme"]
        case "TraySettingsService":
            return ["GetStatistics", "GetTraySettings", "UpdateTraySettings"]
        case "UserRulesService":
            return ["AddUserRule", "ExportUserRules", "GetUserRules", "ImportUserRules", "ResetUserRules", "UpdateUserRules"]
        default:
            return nil
        }
    }
}
