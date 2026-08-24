// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { createPortal, useEffect } from 'preact/compat';

import { NotificationsRenderer } from 'Common/components/NotificationsRenderer';
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
    NotificationsQueueVariant,
} from 'Common/stores/NotificationsQueue';
import { useSettingsStore, useTheme } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { applyThemeAttribute } from 'Utils/colorThemes';

import { ActivationFlowStatusController } from '../ActivationFlow';
import { EnableExtensionsController } from '../EnableExtensionsController';
import { ErrorBoundary } from '../ErrorBoundary';
import { MigrationFiltersConsentController } from '../MigrationFiltersConsentController';
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

    useTheme((theme) => {
        applyThemeAttribute(theme);
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
        <ErrorBoundary key={language}>
            <PaywallController />
            <MigrationFiltersConsentController />
            <ActivationFlowStatusController />
            <EnableExtensionsController />
            <Router />
            {currentPath !== RouteName.migration && createPortal(
                <ErrorBoundary>
                    <NotificationsRenderer
                        className="SettingsNotificationsContainer"
                        notification={notification}
                    />
                </ErrorBoundary>,
                notifyContainer,
            )}
            {createPortal(
                <ErrorBoundary>
                    <Tooltip />
                </ErrorBoundary>,
                tooltipContainer,
            )}
        </ErrorBoundary>
    );
}

export const App = observer(AppComponent);
