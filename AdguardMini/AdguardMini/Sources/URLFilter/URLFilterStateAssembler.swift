// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  URLFilterStateAssembler.swift
//  AdguardMini
//

import Foundation

// MARK: - URLFilterStateAssembler

/// Assembles the pure Swift ``URLFilterUIState`` from the platform
/// ``URLFilterService`` and the persisted protection level.
///
/// Shared by the RPC bridge (``Sciter/URLFilterServiceImpl``) and the callback
/// hub so both produce identical state. Serialized as an `actor` because it owns
/// the `installRequested` flag that backs ``URLFilterInfo/isInstalling``. It has
/// no sciter dependency, so it is unit-testable in `AdguardMiniTests`.
actor URLFilterStateAssembler {
    private let urlFilterService: URLFilterService
    private let protectionLevelProvider: @Sendable () -> URLFilterProtectionLevel
    private var installRequested = false

    /// Creates the assembler.
    /// - Parameters:
    ///   - urlFilterService: Platform URL filter service (status + configuration).
    ///   - protectionLevelProvider: Reads the persisted protection level.
    init(
        urlFilterService: URLFilterService,
        protectionLevelProvider: @escaping @Sendable () -> URLFilterProtectionLevel
    ) {
        self.urlFilterService = urlFilterService
        self.protectionLevelProvider = protectionLevelProvider
    }

    /// Records that a first-time installation was requested. Reflected in
    /// ``URLFilterInfo/isInstalling`` until the status leaves `.starting`.
    func markInstallRequested() {
        self.installRequested = true
    }

    /// Builds the current aggregate state.
    func makeState() async -> URLFilterUIState {
        let status = await self.urlFilterService.getStatus()
        let configuration = try? await self.urlFilterService.loadConfiguration()

        let isStarting = status == .starting
        if !isStarting {
            self.installRequested = false
        }
        let isInstalling = self.installRequested && isStarting

        return URLFilterUIState(
            status: status,
            enabled: configuration?.enabled ?? false,
            protectionLevel: self.protectionLevelProvider(),
            info: URLFilterInfo(isInstalling: isInstalling),
            errorMessage: status.errorMessage
        )
    }
}
