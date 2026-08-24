// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueType, NotificationsQueueIconType, RouteName } from 'SettingsStore/modules';
import { ConsentModal } from 'UILib';

import type { Filter } from 'Apis/types';

/**
 * Controller for migration filters consent
 */
function MigrationFiltersConsentControllerComponent() {
    const {
        filters: { enabledFilters, filtersIdsWithConsent, filtersMap },
        settings: { settings: { consentFiltersIds } },
        settings,
        filters,
        notification,
        router,
    } = useSettingsStore();

    if (filtersMap.size === 0 || router.currentPath === RouteName.migration) {
        return null;
    }

    const enabledFiltersWithConsent = Array.from(enabledFilters).filter(
        (filter) => filtersIdsWithConsent.includes(filter),
    );
    // This filters user has not consented yet
    const enabledFiltersToConsent = enabledFiltersWithConsent.filter((filter) => !consentFiltersIds.includes(filter));

    const onEnable = async () => {
        const newConsent = [...consentFiltersIds, ...enabledFiltersToConsent];
        settings.updateUserConsent(newConsent);
    };

    const onClose = async () => {
        const error = await filters.switchFiltersState(enabledFiltersToConsent, false);
        if (error) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        }
    };

    if (enabledFiltersToConsent.length > 0) {
        const notExistingFilters = [] as number[];
        const filtersToConsent = enabledFiltersToConsent.map((id) => {
            const filter = filtersMap.get(id);
            if (!filter) {
                notExistingFilters.push(id);
            }
            return filter;
        });
        const existFilters = filtersToConsent.filter((f) => !!f) as Filter[];

        if (enabledFiltersToConsent.length !== existFilters.length) {
            // We only log this, and do not throw an error, because it's not a critical issue
            // May be filters were deleted
            log.dbg(`Migration Consent Modal: Some filters for consent not found in filtersMap: ${notExistingFilters.join(', ')}`);
        }

        return (
            <ConsentModal
                cancelText={translate('onboarding.skip')}
                description={translate('consent.modal.migration.desc')}
                filters={existFilters}
                title={translate('consent.modal.migration.title')}
                onClose={onClose}
                onEnable={onEnable}
                onPartial={onClose}
            />
        );
    }

    return null;
}

export const MigrationFiltersConsentController = observer(MigrationFiltersConsentControllerComponent);
