// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { createPortal, useEffect } from 'preact/compat';

import { useSettingsStore, useTheme } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
    NotificationsQueueVariant,
} from 'SettingsStore/modules/NotificationsQueue';

import { ActivationFlowStatusController } from '../ActivationFlow';
import { EnableExtensionsController } from '../EnableExtensionsController';
import { ErrorBoundary } from '../ErrorBoundary';
import { MigrationFiltersConsentController } from '../MigrationFiltersConsentController';
import { NotificationsRenderer } from '../NotificationsRenderer';
import { PaywallController } from '../Paywall';
import { Router } from '../Router';
import { Tooltip } from '../Tooltip';

import './App.pcss';
import {
    useShowEnableExtensionsNotification,
    useCheckExpiredLicenseStatus,
} from './hooks';
import { useTrackSettingsPage } from './hooks/useTrackSettingsPage';

const notifyContainer = document.getElementById('notify')!;
const tooltipContainer = document.getElementById('tooltip')!;

/**
 * App entry
 */
function AppComponent() {
    const settingsStore = useSettingsStore();
    const {
        router: { currentPath },
        settings,
        notification,
    } = settingsStore;

    const { settings: { language } } = settings;

    useEffect(() => {
        // Used for hiding window instead of close it
        document.addEventListener('closerequest', (e) => {
            if (e.reason === 0) { // 0 equals to user click on cross
                e.cancel = true;
                e.preventDefault();
                window.SciterWindow.state = window.WindowProperties.WINDOW_HIDDEN;
                return false;
            }
            return true;
        });
    }, []);

    useTheme((theme) => {
        document.documentElement.setAttribute('theme', theme);
        settingsStore.setColorTheme(theme);
    });

    useEffect(() => {
        if (!settings.loginItemEnabled && currentPath !== RouteName.safari_protection) {
            notification.notify({
                notificationContext: NotificationContext.ctaButton,
                message: translate('login.item.modal.desc'),
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                variant: NotificationsQueueVariant.textOnly,
                btnLabel: translate('login.item.open.settings'),
                onClick: settings.openLoginItemsSettings,
            }, true);
        }
    }, [currentPath, settings.loginItemEnabled, notification, settings.openLoginItemsSettings]);

    useShowEnableExtensionsNotification();
    useCheckExpiredLicenseStatus();
    useTrackSettingsPage();

    return (
        <>
            <ErrorBoundary key={language}>
                <PaywallController />
                <MigrationFiltersConsentController />
                <ActivationFlowStatusController />
                <EnableExtensionsController />
                <Router />
                {createPortal(<NotificationsRenderer />, notifyContainer)}
                {createPortal(<Tooltip />, tooltipContainer)}
            </ErrorBoundary>
        </>
    );
}

export const App = observer(AppComponent);
