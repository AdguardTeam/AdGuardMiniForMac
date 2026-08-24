// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import 'expose-loader?exposes=preactHooks!preact/hooks';
// eslint-disable-next-line import/order
import { instantiateLogger } from '@adg/webview-utils-kit';
import { render } from 'preact';

import 'Common/api';
import { AccountCallbackService } from 'Common/apis/callbacks/AccountCallbackService';
import { AccountCallbackServiceInternal } from 'Common/apis/callbacks/AccountCallbackServiceInternal';
import { FiltersCallbackService } from 'Common/apis/callbacks/FiltersCallbackService';
import { FiltersCallbackServiceInternal } from 'Common/apis/callbacks/FiltersCallbackServiceInternal';
import { SettingsCallbackService } from 'Common/apis/callbacks/SettingsCallbackService';
import { SettingsCallbackServiceInternal } from 'Common/apis/callbacks/SettingsCallbackServiceInternal';
import { UserRulesCallbackService } from 'Common/apis/callbacks/UserRulesCallbackService';
import { UserRulesCallbackServiceInternal } from 'Common/apis/callbacks/UserRulesCallbackServiceInternal';
import { setupSettingsWebViewBridge } from 'Modules/settings/lib/webViewSettingsBootstrap';
import 'Theme/default';

import { App } from './components/App';
import StoreContext, { store } from './store';

const settingsCallbackService = new SettingsCallbackService(new SettingsCallbackServiceInternal());
const userRulesCallbackService = new UserRulesCallbackService(new UserRulesCallbackServiceInternal());
const accountCallbackService = new AccountCallbackService(new AccountCallbackServiceInternal());
const filtersCallbackService = new FiltersCallbackService(new FiltersCallbackServiceInternal());
setupSettingsWebViewBridge(
    settingsCallbackService,
    userRulesCallbackService,
    accountCallbackService,
    filtersCallbackService,
);
// Override the bootstrap's console-fallback `window.log` with the real logger
// (preserves the current Sciter settings' logging behaviour).
window.log = instantiateLogger(FULL_LOGS);

const node = document.getElementById('app');
if (node) {
    render(
        <StoreContext.Provider value={store}>
            <App />
        </StoreContext.Provider>,
        node,
    );
}
