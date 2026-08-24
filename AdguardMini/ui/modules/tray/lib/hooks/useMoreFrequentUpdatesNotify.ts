// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEffect } from 'preact/hooks';

import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, NotificationsQueueVariant } from 'TrayStore/modules';
import { TrayEvent, TrayLayer } from 'TrayStore/modules/TrayTelemetry';

import { useTrayStore } from './useTrayStore';

/**
 * Hook for showing notification to buy full version for more frequent updates
 */
export function useMoreFrequentUpdatesNotify() {
    const { settings, notification, telemetry } = useTrayStore();

    const { isLicenseOrTrialActive, license } = settings;

    useEffect(() => {
        if (!isLicenseOrTrialActive) {
            notification.notify({
                notificationContext: NotificationContext.ctaButton,
                message: translate('tray.frequent.updates'),
                type: NotificationsQueueType.success,
                iconType: NotificationsQueueIconType.loading,
                variant: NotificationsQueueVariant.textOnly,
                btnLabel: translate('buy'),
                timeout: false,
                closeable: true,
                onClick: () => {
                    settings.requestOpenPaywallScreen();
                    telemetry.layersRelay.trackEvent(TrayEvent.FrequentUpdatesClick);
                },
                onMount: () => {
                    telemetry.layersRelay.setPage(TrayLayer.NotificationFrequentUpdates);
                    telemetry.layersRelay.trackPageView();
                },
            }, true);
        }
    }, [license, isLicenseOrTrialActive, notification, settings, settings.requestOpenPaywallScreen, telemetry]);
}
