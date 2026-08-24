// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Identifiers for dismissible health check cards (P5–P7).
 *
 * Values must match `HealthCheckDismissId` in Swift
 * (`HealthCheckAttentionProvider.swift`).
 */
export enum HealthCheckDismissId {
    NoUpdates = 'noUpdates',
    AdBlockingDisabled = 'adBlockingDisabled',
    AnnoyanceBlockingDisabled = 'annoyanceBlockingDisabled',
}
