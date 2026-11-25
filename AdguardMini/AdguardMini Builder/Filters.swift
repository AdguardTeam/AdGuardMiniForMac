// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  Filters.swift
//  AdguardMini Builder
//

import Foundation

import AML
import FLMBuilder

private enum Constants {
    static let filterUrlBase = "https://filters.adtidy.org"
    static let filterMetaUrl = "\(Self.filterUrlBase)/extension/safari/filters.json"
    static let filterI18NUrl = "\(Self.filterUrlBase)/extension/safari/filters_i18n.js"
}

func updateFiltersDb(inDirectory path: String, force: Bool) -> Bool {
    let info = Bundle.main.infoDictionary
    return updateStandardFiltersDb(
        inDirectory: path,
        force: force,
        metadataURL: Constants.filterMetaUrl,
        metadataLocalesURL: Constants.filterI18NUrl,
        compilerConditionalConstants: FiltersCompilationConstants.all,
        appName: info?["CFBundleName"] as? String ?? "AdGuard Mini Prebuilder",
        version: info?["CFBundleShortVersionString"] as? String ?? "1.0"
    )
}
