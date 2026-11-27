// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { instantiateLogger } from '@adg/webview-utils-kit';
import { render } from 'preact';

import 'Common/api';
import { AccountCallbackService } from 'Common/apis/callbacks/AccountCallbackService';
import { FiltersCallbackService } from 'Common/apis/callbacks/FiltersCallbackService';
import { SettingsCallbackService } from 'Common/apis/callbacks/SettingsCallbackService';
import { UserRulesCallbackService } from 'Common/apis/callbacks/UserRulesCallbackService';
import { AccountCallbackServiceInternal } from 'Common/apis/impl/AccountCallbackServiceInternal';
import { FiltersCallbackServiceInternal } from 'Common/apis/impl/FiltersCallbackServiceInternal';
import { SettingsCallbackServiceInternal } from 'Common/apis/impl/SettingsCallbackServiceInternal';
import { UserRulesCallbackServiceInternal } from 'Common/apis/impl/UserRulesCallbackServiceInternal';
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
// Override the bootstrap's console-fallback `window.log` with the real logger.
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
