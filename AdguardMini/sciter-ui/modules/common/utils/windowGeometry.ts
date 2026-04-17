// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export const MIN_WINDOW_WIDTH = 600;
export const MIN_WINDOW_HEIGHT = 400;

export type WindowGeometry = {
    x: number;
    y: number;
    width: number;
    height: number;
    monitor: number;
};

/**
 * Reads current window geometry using Sciter box() API
 * Returns monitor-relative coordinates and the monitor index.
 *
 * @param sciterWindow - the window to read geometry from
 * @returns current window geometry in monitor-relative pixels
 */
export function getWindowGeometry(sciterWindow: SciterWindow): WindowGeometry {
    const [x, y, width, height] = sciterWindow.box('xywh', 'border', 'monitor') as number[];
    const monitor = sciterWindow.monitor;
    return { x, y, width, height, monitor };
}

/**
 * Validates and adjusts saved geometry for monitor-relative coordinates.
 * Returns corrected geometry or null if geometry is completely invalid
 * and caller should fall back to defaults.
 *
 * Since coordinates are monitor-relative and restored via moveTo(monitor, ...),
 * Sciter handles monitor bounds. We only validate/clamp dimensions and positions.
 *
 * @param geometry - saved window geometry to validate
 * @returns validated geometry, or null if should use defaults
 */
export function validateGeometry(
    geometry: WindowGeometry,
): WindowGeometry | null {
    const { x, y, width, height, monitor } = geometry;

    if (!isFinitePositive(width) || !isFinitePositive(height)
        || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(monitor)) {
        return null;
    }

    return {
        x: Math.max(x, 0),
        y: Math.max(y, 0),
        width: Math.max(width, MIN_WINDOW_WIDTH),
        height: Math.max(height, MIN_WINDOW_HEIGHT),
        monitor: Math.max(monitor, 0),
    };
}

/**
 * Checks if a number is finite and positive
 */
function isFinitePositive(value: number): boolean {
    return Number.isFinite(value) && value > 0;
}
