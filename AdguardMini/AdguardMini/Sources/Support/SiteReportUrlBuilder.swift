// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  SiteReportUrlBuilder.swift
//  AdguardMini
//

import Foundation
import AppBackend

/// Builds the reports web API URL for a site report.
enum SiteReportUrlBuilder {
    /// Creates the reports web API URL.
    /// - Parameters:
    ///   - backend: The backend with the application identity and the reports base URL.
    ///   - state: The application state to report.
    /// - Returns: The report URL, or `nil` if it cannot be built.
    static func makeUrl(backend: AppBackend.Backend, state: SiteReportState) -> URL? {
        SiteReport.reportURL(
            backend: backend,
            from: state.screen,
            productType: .macMini,
            productVersion: BuildConfig.AG_VERSION_TITLE,
            licenseType: state.isPaid ? .paid : .free,
            browser: .safari,
            url: state.pageUrl,
            regularFilters: state.enabledFilterIds,
            filtersLastUpdate: state.lastFiltersUpdate,
            customFilters: state.customFilters.map(Self.sanitizedFilter),
            extensions: state.extensions,
            extensionsEnabled: state.extensionsEnabled,
            languageSpecificAdblocking: state.languageSpecificAdblocking,
            advancedRules: state.advancedRules
        )
    }

    /// Replaces commas in the name because the package joins the filters with commas and does not escape names.
    private static func sanitizedFilter(_ filter: SiteReport.CustomFilter) -> SiteReport.CustomFilter {
        let name = filter.name?.replacingOccurrences(of: ",", with: "|")
        return SiteReport.CustomFilter(name: name, url: filter.url)
    }
}
