// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  InternalUrlScheme.swift
//  AdguardMini
//

import Foundation

enum InternalUrlSchemeActionUrl {
    case restart
    case openSettings(page: String? = nil)
    case subscribeFilter
    case openPurchase
}

extension InternalUrlSchemeActionUrl {
    enum SubscribeFilterParam {
        static let url: String = "url"
    }

    enum OpenSettingsPageParam {
        static let page: String = "page"
    }
}

extension InternalUrlSchemeActionUrl {
    private static func makeURL(endpoint: String, queryItems: [URLQueryItem] = []) -> URL {
        var components = URLComponents()
        components.scheme = Self.scheme
        components.path = endpoint
        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }
        return components.url!
    }
    static let scheme = BuildConfig.AG_INTERNAL_URL_SCHEME

    var url: URL {
        switch self {
        case .restart:
            Self.makeURL(endpoint: "restart")
        case let .openSettings(page):
            Self.makeURL(
                endpoint: "open_settings",
                queryItems: page.map { [URLQueryItem(name: OpenSettingsPageParam.page, value: $0)] } ?? []
            )
        case .subscribeFilter:
            Self.makeURL(endpoint: "subscribe_filter")
        case .openPurchase:
            Self.makeURL(endpoint: "open_purchase")
        }
    }

    var path: String {
        URLComponents(url: self.url, resolvingAgainstBaseURL: true)!.path
    }
}
