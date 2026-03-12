// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import {
    NotificationContext,
    NotificationsQueueIconType,
    NotificationsQueueType,
} from 'SettingsStore/modules';

import { AdBlockingSection } from './AdBlockingSection';
import { AnnoyanceSection } from './AnnoyanceSection';
import { OtherSection } from './OtherSection';
import { SafariProtectionContext } from './SafariProtectionContext';
import { SafariProtectionModals } from './SafariProtectionModals';
import { SafariProtectionTitle } from './SafariProtectionTitle';
import { TrackingSection } from './TrackingSection';

import type { SafariProtectionContextValue, UpdateSwitch } from './SafariProtectionContext';

/**
 * Safari protection main control component
 */
function SafariProtectionControlComponent() {
    const { notification, settings, filters } = useSettingsStore();
    const [showLoginItemModal, setShowLoginItemModal] = useState(!settings.loginItemEnabled);
    const [showConsentFilterIds, setShowConsentFilterIds] = useState<number[]>();

    const notifySomethingWentWrong = () => {
        notification.notify({
            message: getNotificationSomethingWentWrongText(),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.warning,
            iconType: NotificationsQueueIconType.error,
            closeable: true,
        });
    };

    const createErrorWrapper = (update: UpdateSwitch) => async (value: boolean) => {
        const error = await update(value);
        if (error) {
            notifySomethingWentWrong();
        }
    };

    const createConsentWrapper = (filterIds: number[], update: UpdateSwitch) => async (value: boolean) => {
        const { consentFiltersIds } = settings.settings;

        if (!value) {
            const error = await update(value);
            if (error) {
                notifySomethingWentWrong();
            }
            return;
        }

        if (filterIds.every((id) => consentFiltersIds.includes(id))) {
            const error = await update(value);
            if (error) {
                notifySomethingWentWrong();
            }
            return;
        }

        setShowConsentFilterIds(filterIds);
    };

    const enableConsent = async () => {
        if (!showConsentFilterIds) {
            return;
        }

        const { consentFiltersIds } = settings.settings;
        const newConsent = [...consentFiltersIds, ...showConsentFilterIds];
        settings.updateUserConsent(newConsent);

        const error = await filters.switchFiltersState(showConsentFilterIds, true);
        if (error) {
            notifySomethingWentWrong();
        }

        setShowConsentFilterIds(undefined);
    };

    const closeConsentModal = () => {
        setShowConsentFilterIds(undefined);
    };

    const openLoginItemsSettings = () => {
        settings.openLoginItemsSettings();
    };

    const closeLoginItemModal = () => {
        setShowLoginItemModal(false);
    };

    const ctxValue: SafariProtectionContextValue = {
        createConsentWrapper,
        createErrorWrapper,

        showLoginItemModal,
        closeLoginItemModal,
        openLoginItemsSettings,

        showConsentFilterIds,
        closeConsentModal,
        enableConsent,
    };

    return (
        <SafariProtectionContext.Provider value={ctxValue}>
            <SafariProtectionTitle />
            <AdBlockingSection />
            <TrackingSection />
            <AnnoyanceSection />
            <OtherSection />
            <SafariProtectionModals />
        </SafariProtectionContext.Provider>
    );
}

export const SafariProtectionControl = observer(SafariProtectionControlComponent);
