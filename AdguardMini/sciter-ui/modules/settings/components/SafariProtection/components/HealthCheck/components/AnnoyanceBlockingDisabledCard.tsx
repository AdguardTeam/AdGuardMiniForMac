// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Text } from 'Modules/common/components';
import { useNotificationSomethingWentWrongText, useSettingsStore } from 'SettingsLib/hooks';

import { HealthCheckCard } from './HealthCheckCard';
import { HealthCheckDismissId } from './HealthCheckDismissId';

/**
 * Props for the AnnoyanceBlockingDisabledCard component.
 * @param setShowConsent - Callback function to show consent dialog for required filters
 */
type AnnoyanceBlockingDisabledCardProps = {
    setShowConsent(filterIds: number[]): void;
};

/**
 * Displays a health check card when annoyance blocking features are disabled.
 * Enables social buttons blocking and other annoyance filters with consent flow for required filters.
 * @param props - Component props including setShowConsent callback
 */
function AnnoyanceBlockingDisabledCardComponent({ setShowConsent }: AnnoyanceBlockingDisabledCardProps) {
    const {
        appSettings,
        filtersMeta,
        safariProtection,
    } = useSettingsStore();
    const {
        dissmissedHealthCheckCards,
        settings: { consentFiltersIds },
    } = appSettings;
    const { filtersIndex } = filtersMeta;

    const notifyError = useNotificationSomethingWentWrongText();

    const enableAllAnnoyanceBlocking = async () => {
        const socialError = await safariProtection.updateBlockSocialButtons(true);
        if (socialError) {
            notifyError();
            return;
        }

        const annoyanceFilterIds = [
            filtersIndex.cookieNoticeFilterId,
            filtersIndex.popUpsFilterId,
            filtersIndex.widgetsFilterId,
            filtersIndex.otherAnnoyanceFilterId,
        ];

        const missingConsent = annoyanceFilterIds.filter((id) => !consentFiltersIds.includes(id));

        if (missingConsent.length > 0) {
            setShowConsent(missingConsent);
            return;
        }

        const error = await filtersMeta.switchFiltersState(annoyanceFilterIds, true);
        if (error) {
            notifyError();
        }
    };

    return (
        <HealthCheckCard
            color="neutral"
            cta={[{ label: translate('safari.protection.health.enable'), onClick: enableAllAnnoyanceBlocking }]}
            description={(
                <Text type="t2">
                    {translate('safari.protection.health.annoyance.desc')}
                </Text>
            )}
            title={translate('safari.protection.health.annoyance')}
            onClose={() => appSettings.updateHealthCheckDismissedCards([
                ...dissmissedHealthCheckCards,
                HealthCheckDismissId.AnnoyanceBlockingDisabled,
            ])}
        />
    );
}

export const AnnoyanceBlockingDisabledCard = observer(AnnoyanceBlockingDisabledCardComponent);
