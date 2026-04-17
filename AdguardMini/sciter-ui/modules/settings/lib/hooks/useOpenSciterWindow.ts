// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RulesEditorEvents } from 'Modules/common/utils/consts';
import { validateGeometry } from 'Utils/windowGeometry';

import { useSettingsStore } from './useSettingsStore';

import type { CreateWindowParams } from 'SettingsStore/modules/Windowing';

/**
 * Union type for possible window event listeners
 */
type EventListenersUnion = {
    type: 'window';
    handler(customEvent: CustomEvent): void;
} | {
    type: 'document';
    handler(event: Event): void;
};

/**
 * Parameters for opening a sciter window with html contents in webview
 */
type OpenSciterWindowParams = {
    /**
     * HTML contents to be loaded in the webview
     */
    html: string;
    /**
     * Parameters for the window to be created
     */
    windowParams: CreateWindowParams;
    /**
     * Events to be handled by the window
     */
    events: { [eventName: string]: (args: unknown[]) => void };
    /**
     * Event listeners for the window
     */
    eventListeners: Record<string, EventListenersUnion>;
};

/**
 * Hook used for opening sciter window with html contents in webview
 */
export function useOpenSciterWindow(params: OpenSciterWindowParams) {
    const {
        windowing,
    } = useSettingsStore();

    const { html, windowParams, events, eventListeners } = params;

    const getTargetWindow = () => {
        if (windowing.getIsWindowOpened(windowParams.id)) {
            return windowing.findWindowByParam('id', windowParams.id)!;
        }

        const savedGeometry = windowing.getSavedGeometry(windowParams.id);
        if (savedGeometry) {
            const validated = validateGeometry(savedGeometry);
            if (validated) {
                return windowing.createWindow({
                    ...windowParams,
                    width: validated.width,
                    height: validated.height,
                });
            }
        }

        return windowing.createWindow(windowParams);
    };

    const closeWindow = () => {
        windowing.closeWindow(windowParams.id);
    };

    const getWebviewElement = () => {
        return getTargetWindow().document.getElementById('webview') as unknown as HTMLWebViewElement;
    };

    const sendMessage = (key: string, jsonValue?: string) => {
        getWebviewElement().webview.evaluateJavaScript(`window.data.${key} = ${jsonValue ?? null}`);
    };

    const openWindow = () => {
        if (windowing.getIsWindowOpened(windowParams.id)) {
            windowing.focusWindow(windowParams.id);
            return;
        }

        const targetWindow = getTargetWindow();

        const savedGeometry = windowing.getSavedGeometry(windowParams.id);
        if (savedGeometry) {
            const validated = validateGeometry(savedGeometry);
            if (validated) {
                targetWindow.moveTo(validated.monitor, validated.x, validated.y, validated.width, validated.height);
            }
        }

        targetWindow.document.addEventListener('ready', () => {
            const webviewElement = getWebviewElement();
            webviewElement.webview.loadHtml(html);

            sendMessage(RulesEditorEvents.fallback_mode, Boolean(false).toString());

            webviewElement.jsBridgeCall = (jsBridgeCallParams) => {
                const [eventName, ...args] = jsBridgeCallParams;

                Object.keys(events).forEach((eventKey) => {
                    if (eventName.toString() === eventKey) {
                        events[eventKey](args);
                    }
                });

                switch (eventName.toString()) {
                    case RulesEditorEvents.init_theme:
                        break;
                }
            };
        });

        targetWindow.on('theme', ({ detail }) => {
            sendMessage(RulesEditorEvents.theme, `'${detail}'`);
        });

        Object.keys(eventListeners).forEach((key) => {
            const { type, handler } = eventListeners[key];

            if (type === 'window') {
                targetWindow.on(key, handler);
            } else if (type === 'document') {
                targetWindow.document.addEventListener(key, handler);
            }
        });
    };

    return {
        isWindowOpened: windowing.getIsWindowOpened(windowParams.id),
        openWindow,
        closeWindow,
        sendMessage,
    };
};
