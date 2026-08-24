import type { SciterWindow } from '../../index';
import type { Action } from './Action';
/**
 * Creates a tray icon with the specified text and actions.
 */
export declare function createTray(hostWindow: SciterWindow, iconUrl: string, iconText: string, actions: Action[]): void;
/**
 * Updates tray
 */
export declare function updateTray(hostWindow: SciterWindow, actions: Action[], isDarkTheme_: boolean): void;
/**
 * Removes tray
 */
export declare function removeTray(hostWindow: SciterWindow): void;
