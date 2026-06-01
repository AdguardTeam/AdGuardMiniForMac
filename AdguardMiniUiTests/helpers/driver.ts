// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * @fileoverview SciterDriver connection utilities.
 *
 * Provides a retry-capable connection function and the module port registry.
 * The ports here MUST match the TEST_PEER_PORTS in webpack.config.test.js.
 *
 * @module TestHelpers/Driver
 */

import { SciterDriver } from '@adg/sciter-test-driver';

/**
 * Connection configuration for one Sciter UI module.
 */
export interface ModuleConfig {
    /** Module identifier matching the webpack entry point name. */
    name: string;
    /**
     * TCP port for the module's test peer.
     * Configured via testPeerPort in the HTML template parameter,
     * injected into the Sciter window as document.attributes["test-peer-port"].
     */
    port: number;
}

/**
 * Per-module test peer ports.
 *
 * These must be kept in sync with:
 *   - AdguardMini/sciter-ui/scripts/webpack/webpack.config.test.js (TEST_PEER_PORTS)
 *   - AdguardMini/sciter-ui/modules/common/index.html (testPeerPort template param)
 *
 * The test peer (test-peer.js from @adg/sciter-test-driver) opens a TCP
 * server on the configured port. The Node.js test process connects as a
 * client and communicates via length-prefixed JSON messages.
 */
export const MODULES: Record<string, ModuleConfig> = {
    tray: { name: 'tray', port: 7127 },
    settings: { name: 'settings', port: 7128 },
    onboarding: { name: 'onboarding', port: 7129 },
};

/**
 * Repeatedly attempts to connect to a Sciter test peer until the deadline.
 *
 * The Sciter window may not be fully loaded when tests start, so the
 * TCP port may not be listening immediately. This function polls every
 * 500ms with a decreasing per-attempt timeout.
 *
 * IMPORTANT: The test peer only allows ONE TCP client at a time.
 * All tests for a module must share a single connection.
 *
 * @param config   - Module connection configuration (name + port).
 * @param timeoutMs - Maximum time to keep retrying, in milliseconds.
 * @returns A connected SciterDriver instance.
 * @throws If the connection cannot be established within the timeout.
 */
export async function connectWithRetry(
    config: ModuleConfig,
    timeoutMs: number,
): Promise<SciterDriver> {
    const deadline = Date.now() + timeoutMs;
    let lastError: Error | undefined;

    while (Date.now() < deadline) {
        try {
            // Shrink per-attempt timeout as we approach the deadline
            // so we don't overshoot by more than 2s.
            const remaining = Math.min(2000, deadline - Date.now());
            return await SciterDriver.connect({
                port: config.port,
                timeout: remaining,
            });
        } catch (e) {
            lastError = e as Error;
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    throw new Error(
        `Failed to connect to ${config.name} on port ${config.port}: `
        + `${lastError?.message}`,
    );
}
