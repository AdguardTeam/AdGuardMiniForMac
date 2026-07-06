// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { Text, Button, Icon } from 'Modules/common/components';
import { useSettingsStore, useSafariExtensionsStatus } from 'SettingsLib/hooks';

import {
    AdBlockingDisabledCard,
    AnnoyanceBlockingDisabledCard,
    BackgroundDisabledCard,
    ExtensionsBrokenCard,
    ExtensionsDisabledCard,
    HealthCheckDismissId,
    NoUpdatesCard,
    RulesLimitExceededCard,
} from './components';
import s from './HealthCheck.module.pcss';

/**
 * Props for the HealthCheck component.
 * @param setShowConsent - Callback function to show consent dialog for filter installation
 */
type HealthCheckProps = {
    setShowConsent(filterIds: number[]): void;
};

/**
 * Health check component that displays issues with AdGuard Mini and possible solutions.
 * Shows various alert cards based on the current state of extensions, settings, and filter updates.
 * Supports expanding to show all issues or collapsing to show only the primary issue.
 * @param props - Component props
 */
function HealthCheckComponent({ setShowConsent }: HealthCheckProps) {
    const [showAllIssues, setShowAllIssues] = useState(false);

    const { appSettings, safariProtection } = useSettingsStore();

    const {
        dissmissedHealthCheckCards,
        loginItemEnabled,
        settings: { lastUpdateMoreSevenDays },
    } = appSettings;

    const {
        blockAds,
        blockSocialButtons,
        blockCookieNotice,
        blockPopups,
        blockWidgets,
        blockOtherAnnoyance,
    } = safariProtection;

    const { hasExtensionsDisabled, hasExtensionsBroken, hasRulesLimitExceeded } = useSafariExtensionsStatus();

    const hasBackgroundDisabled = !loginItemEnabled;

    const hasAdBlockingDisabled = !blockAds;

    const hasAnnoyanceBlockingDisabled = !blockSocialButtons
        && !blockCookieNotice
        && !blockPopups
        && !blockWidgets
        && !blockOtherAnnoyance;

    const cards = [
        hasExtensionsDisabled && (
            <ExtensionsDisabledCard key="extensionsDisabled" />
        ),
        hasBackgroundDisabled && (
            <BackgroundDisabledCard key="backgroundDisabled" />
        ),
        hasExtensionsBroken && (
            <ExtensionsBrokenCard key="extensionsBroken" />
        ),
        hasRulesLimitExceeded && (
            <RulesLimitExceededCard key="rulesLimitExceeded" />
        ),
        lastUpdateMoreSevenDays && !dissmissedHealthCheckCards.has(HealthCheckDismissId.NoUpdates) && (
            <NoUpdatesCard key={HealthCheckDismissId.NoUpdates} />
        ),
        hasAdBlockingDisabled && !dissmissedHealthCheckCards.has(HealthCheckDismissId.AdBlockingDisabled) && (
            <AdBlockingDisabledCard key={HealthCheckDismissId.AdBlockingDisabled} />
        ),
        hasAnnoyanceBlockingDisabled
        && !dissmissedHealthCheckCards.has(HealthCheckDismissId.AnnoyanceBlockingDisabled) && (
            <AnnoyanceBlockingDisabledCard
                key={HealthCheckDismissId.AnnoyanceBlockingDisabled}
                setShowConsent={setShowConsent}
            />
        ),
    ].filter(Boolean);

    if (cards.length === 0) {
        return null;
    }

    const primaryCard = cards[0];
    const hiddenCards = cards.slice(1);
    const hasHiddenCards = hiddenCards.length > 0;

    return (
        <div className={s.HealthCheck}>
            {primaryCard}
            {hasHiddenCards && (
                <Button
                    className={cx(s.HealthCheck_showMore)}
                    type="text"
                    onClick={() => setShowAllIssues((prev) => !prev)}
                >
                    <Text type="t2">
                        {showAllIssues
                            ? translate('safari.protection.health.show.less')
                            : translate('safari.protection.health.show.more', { more: hiddenCards.length })}
                    </Text>
                    <Icon
                        className={cx(
                            s.HealthCheck_showMore_icon,
                            showAllIssues && s.HealthCheck_showMore_icon__active,
                        )}
                        icon="arrow_left"
                    />
                </Button>
            )}
            {showAllIssues && hiddenCards}
        </div>
    );
}

export const HealthCheck = observer(HealthCheckComponent);
