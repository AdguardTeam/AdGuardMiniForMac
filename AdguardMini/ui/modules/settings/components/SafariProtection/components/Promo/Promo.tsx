// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId, useState } from 'preact/hooks';

import { Button, Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';

import mail_protection from './images/mail_protection_promo.svg';
import system_wide from './images/promo_illustration.svg';
import s from './Promo.module.pcss';

const SYSTEM_WIDE_ID = 'system_wide_protection';
const MAIL_PROTECTION_ID = 'mail_protection';

/**
 * Promo card configuration.
 */
type PromoConfig = {
    /** Promo id persisted in the dismissed cards list. */
    id: string;
    /** Whether the advertised setting is already enabled. */
    isEnabled: boolean;
    /** Promo illustration source. */
    illustration: string;
    /** Promo title. */
    title: string;
    /** Promo description. */
    description: string;
    /** Promo action button text. */
    buttonText: string;
    /** Persists the promo dismissal. */
    dismiss(): void;
    /** Navigates to the advertised feature page. */
    action(): void;
};

/**
 * Promo card component for Safari protection features.
 */
export function PromoComponent() {
    const titleId = useId();
    const descId = useId();

    const { advancedBlocking, account, router, settings, telemetry } = useSettingsStore();
    const { urlFilterState, isURLFilterStateLoaded } = advancedBlocking;
    const { userIntentEnabled } = urlFilterState;
    const { isLicenseOrTrialActive } = account;
    const { experimentalSystemWideProtectionEnabled } = settings.settings;

    // Whether the user dismissed a promo on the current page open.
    const [dismissedThisVisit, setDismissedThisVisit] = useState(false);

    const promos: PromoConfig[] = [
        ...(experimentalSystemWideProtectionEnabled ? [{
            id: SYSTEM_WIDE_ID,
            isEnabled: userIntentEnabled,
            illustration: system_wide,
            title: translate('advanced.blocking.system.wide.promo.title'),
            description: translate('advanced.blocking.system.wide.promo.desc'),
            buttonText: translate('advanced.blocking.system.wide.promo.button'),
            dismiss: () => {
                settings.updatePromoDismissedCards([...settings.dismissedPromoCards, SYSTEM_WIDE_ID]);
            },
            action: () => {
                telemetry.trackEvent(SettingsEvent.SystemWideBannerClick);
                router.changePath(RouteName.system_wide_protection);
            },
        }] : []),
        {
            id: MAIL_PROTECTION_ID,
            isEnabled: isLicenseOrTrialActive && advancedBlocking.mailProtection,
            illustration: mail_protection,
            title: translate('advanced.blocking.mail.protection.promo.title'),
            description: translate('advanced.blocking.mail.protection.promo.desc'),
            buttonText: translate('advanced.blocking.mail.protection.promo.button'),
            dismiss: () => {
                telemetry.trackEvent(SettingsEvent.PromoProtectAppleMailClose);
                settings.updatePromoDismissedCards([...settings.dismissedPromoCards, MAIL_PROTECTION_ID]);
            },
            action: () => {
                telemetry.trackEvent(SettingsEvent.PromoProtectAppleMailClick);
                router.changePath(RouteName.mail_protection);
            },
        },
    ];

    // The default state is not an answer: wait for the platform before deciding.
    if (!isURLFilterStateLoaded || !settings.promoDismissedLoaded) {
        return null;
    }

    const promo = promos.find((item) => (
        !settings.dismissedPromoCards.has(item.id)
        && !item.isEnabled
    ));

    if (!promo || dismissedThisVisit) {
        return null;
    }

    const dismiss = () => {
        setDismissedThisVisit(true);
        promo.dismiss();
    };

    return (
        <div className={s.Promo}>
            {/* Several of these cards can stack, so "Close" alone would not say which. */}
            <Button
                ariaLabel={translate('close.titled.aria', { title: promo.title })}
                className={s.Promo_close}
                icon="cross"
                type="icon"
                onClick={dismiss}
            />
            <div className={s.Promo_left}>
                {/*
                  * The heading names itself together with the description, so
                  * the card is announced in one go; the action button below
                  * stays its own stop rather than being folded into that name.
                  */}
                <Text
                    ariaLabelledby={`${titleId} ${descId}`}
                    className={s.Promo_title}
                    id={titleId}
                    tabIndex={0}
                    type="h5"
                >
                    {promo.title}
                </Text>
                <Text className={s.Promo_desc} id={descId} type="t2">
                    {promo.description}
                </Text>
                <Button type="text" onClick={promo.action}>
                    <Text type="t2">{promo.buttonText}</Text>
                </Button>
            </div>
            <div className={s.Promo_illustration}>
                <img alt="" src={promo.illustration} />
            </div>
        </div>
    );
}

export const Promo = observer(PromoComponent);
