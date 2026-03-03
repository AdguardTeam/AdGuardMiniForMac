// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { UserRule } from 'Apis/types';
import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { RulesEditorEvents, SPLITTER, UserRulesEvents, UserRulesPages } from 'Modules/common/utils/consts';
import html from 'Modules/inline/main.html';
import { RouteName, SettingsPage } from 'SettingsStore/modules';
import { SciterWindowId } from 'SettingsStore/modules/Windowing';
import { getColorTheme } from 'Utils/colorThemes';

import { useOpenSciterWindow } from './useOpenSciterWindow';
import { useSettingsStore } from './useSettingsStore';

const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 670;

/**
 * Chunk size for sending rules to the webview
 * Because with large amount of rules Proxy can not proceed them
 * So rues editor is empty
 */
const LINES_CHUNK_SIZE = 1000;

// AG-51375 fix escaping for \ in rules
const rulePrepare = (rule: string) => rule.replace(/\\/g, '\\\\').replace(/`/g, '\\`');

/**
 * Custom hook for managing the DNS Rule Editor Window.
 * Provides functionality for opening the window, sending messages to it, and handling events from it.
 */
export function useOpenUserRulesWindow() {
    const settingsStore = useSettingsStore();
    const {
        userRules,
        settings: { settings },
        router,
        telemetry,
    } = settingsStore;

    const { isWindowOpened, openWindow, sendMessage, closeWindow } = useOpenSciterWindow({
        html,
        windowParams: { id: SciterWindowId.USER_RULE_EDITOR, width: WINDOW_WIDTH, height: WINDOW_HEIGHT, caption: translate('user.rules.editor.title') },
        events: {

            [RulesEditorEvents.get_initial_data]: async function GetInitialDataEvent() {
                const { userRules: { rules } } = userRules;
                sendMessage(RulesEditorEvents.fallback_mode, Boolean(false).toString());
                sendMessage(RulesEditorEvents.language, `\`${settings?.language}\``);
                if (rules.length > LINES_CHUNK_SIZE) {
                    sendMessage(RulesEditorEvents.initial_chunk_start);
                    for (let i = 0; i < rules.length; i += LINES_CHUNK_SIZE) {
                        const chunk = rules.slice(i, i + LINES_CHUNK_SIZE);
                        const chunkRules = chunk.map((r) => `${Number(r.enabled)}${SPLITTER}${rulePrepare(r.rule)}`);
                        sendMessage(RulesEditorEvents.initial_chunk, `\`${chunkRules.join('\n')}\``);
                    }
                    sendMessage(RulesEditorEvents.initial_chunk_end);
                } else {
                    const initialRules = rules.map((r) => `${Number(r.enabled)}${SPLITTER}${rulePrepare(r.rule)}`);
                    sendMessage(RulesEditorEvents.initial, `\`${initialRules.join('\n')}\``);
                }
            },

            [RulesEditorEvents.save_changes]: async function SaveChangesEvent(args) {
                const rules = args[0] as string;
                const rulesString = JSON.parse(rules) as string;

                if (rulesString === '') {
                    userRules.updateRules([]);
                    return;
                }

                const rulesList = rulesString.split('\n').map((r: string) => {
                    const [enabled, rule] = r.split(SPLITTER);
                    return new UserRule({
                        enabled: !!Number(enabled),
                        rule,
                    });
                });
                await userRules.updateRules(rulesList);
                sendMessage(RulesEditorEvents.rules_saved);
            },

            [RulesEditorEvents.open_dns_filtering_kb]: function OpenDnsFilteringKB() {
                window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.filterrules, RouteName.user_rules));
            },

            [RulesEditorEvents.open_report_bug]: function OpenDnsFilteringKB() {
                router.changePath(RouteName.contact_support);
            },

            [RulesEditorEvents.close_request]: function CloseRequest() {
                closeWindow();
                telemetry.setPage(SettingsPage.UserRulesScreen);
                telemetry.trackPageView();
            },

            [RulesEditorEvents.init_theme]: async function InitTheme() {
                const value = await settingsStore.getEffectiveTheme();
                settingsStore.setColorTheme(getColorTheme(value));
            },

            [RulesEditorEvents.telemetry_event_rules_created_click]: function TelemetryEventRulesCreatedClick() {
                telemetry.trackEvent(UserRulesEvents.RuleCreatedClick);
            },

            [RulesEditorEvents.telemetry_page_view]: function TelemetryPageView() {
                telemetry.setPage(UserRulesPages.RuleEditorScreen);
                telemetry.trackPageView();
            },
        },
        eventListeners: {
            [RulesEditorEvents.update]: {
                type: 'window',
                handler: function UpdateEvent(event: CustomEvent) {
                    const detail = event.detail;
                    if (detail instanceof Array) {
                        sendMessage('update', `\`${detail.join('\n')}\``);
                    }
                },
            },
            closerequest: {
                type: 'document',
                handler: function CloseRequestEvent(event: DocumentEventMap['closerequest']) {
                    // Got closerequest somewhere from code
                    if (event.reason === 1) {
                        return;
                    }

                    sendMessage('close');

                    closeWindow();
                },
            },
        },
    });

    useEffect(() => {
        if (isWindowOpened) {
            const initialRules = userRules.rules.map((r) => `${Number(r.enabled)}${SPLITTER}${rulePrepare(r.rule)}`);
            sendMessage(RulesEditorEvents.user_rules_updated, `\`${initialRules.join('\n')}\``);
        }
    }, [isWindowOpened, sendMessage, userRules.rules]);

    return { openUserRulesWindow: openWindow, isRuleEditorWindowOpened: isWindowOpened };
}
