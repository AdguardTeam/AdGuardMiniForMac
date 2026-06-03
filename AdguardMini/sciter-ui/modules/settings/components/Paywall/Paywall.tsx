// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'preact/hooks';

import { SettingsLayer } from 'Modules/settings/store/modules';
import { useSettingsStore } from 'SettingsLib/hooks';
import { Button, Icon, Text } from 'UILib';

import { AlreadyPurchasedFlowModal } from '../ActivationFlow';

import { AppStoreVersionActions } from './AppStoreVersionActions';
import { PaywallFooterLegalLinks } from './components/PaywallFooterLegalLinks';
import { TermsAndConditionsModal } from './Modals';
import s from './Paywall.module.pcss';
import { StandaloneVersionActions } from './StandaloneVersionActions';

import type { IconType } from 'UILib';

/**
 * Paywall component
 */
function PaywallComponent() {
    const { account, settings, telemetry } = useSettingsStore();

    const {
        appStoreSubscriptions,
        isTrialExpired,
        isLicenseExpired,
    } = account;

    useEffect(() => {
        telemetry.layersRelay.setPage(SettingsLayer.SellingScreen);
        telemetry.layersRelay.trackPageView();
    }, [telemetry]);

    /**
     * License advantages list
     */
    const ADVANTAGES: { label: string; icon: IconType }[] = [
        {
            label: translate('settings.paywall.advantage.1'),
            icon: 'quality',
        },
        {
            label: translate('settings.paywall.advantage.3'),
            icon: 'update',
        },
        {
            label: translate('settings.paywall.advantage.4'),
            icon: 'phone',
        },
    ];

    const { isMASReleaseVariant } = settings;

    const [showAlreadyPurchasedFlowModal, setShowAlreadyPurchasedFlowModal] = useState(false);
    const [showTermsAndConditionsModal, setShowTermsAndConditionsModal] = useState(false);

    // Unified license state avoids duplicate ternary chains
    const licenseState: 'default' | 'trialExpired' | 'licenseExpired' = isMASReleaseVariant
        ? 'default'
        : isTrialExpired
            ? 'trialExpired'
            : isLicenseExpired
                ? 'licenseExpired'
                : 'default';

    const BG_MAP: Record<typeof licenseState, string> = {
        default: s.Paywall_bg__defaultImage,
        trialExpired: s.Paywall_bg__trialExpiredImage,
        licenseExpired: s.Paywall_bg__licenseExpiredImage,
    };

    const TITLE_MAP: Record<typeof licenseState, string> = {
        default: translate('settings.paywall.title'),
        trialExpired: translate('settings.paywall.trial.expired.title'),
        licenseExpired: translate('settings.paywall.license.expired.title'),
    };

    const isRightSide = (isTrialExpired || isLicenseExpired) && !isMASReleaseVariant;

    const offer = appStoreSubscriptions?.result?.promoInfo;
    const showOffer = offer && (
        appStoreSubscriptions?.result?.annual?.introOfferDisplayPrice
        || appStoreSubscriptions?.result?.monthly?.introOfferDisplayPrice
    );

    return (
        <div className={s.Paywall}>
            <div className={cx(s.Paywall_bg, BG_MAP[licenseState])}>
                <Icon
                    className={s.Paywall_cross}
                    icon="cross"
                    onClick={() => account.closePaywall()}
                />
                {showOffer && !isRightSide && (
                    <>
                        <div className={s.Paywall_offer}>
                            <Text
                                className={s.Paywall_offer_text}
                                lineHeight="none"
                                type="t1"
                            >
                                🛍️&nbsp;
                                {offer.title}
                            </Text>
                            <Text
                                lineHeight="none"
                                type="t2"
                            >
                                {offer.subtitle}
                            </Text>
                        </div>
                        <svg className={s.Paywall_offer_line} fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1.20703 0.5L18.707 18V0.5H1.20703Z" fill="var(--fills-notifications-orange-default)" stroke="var(--stroke-icons-attention-icon-default)" />
                        </svg>
                    </>
                )}
                <div className={cx(
                    s.Paywall_container,
                    isRightSide ? s.Paywall_container__right : s.Paywall_container__left,
                )}
                >
                    <Text
                        className={s.Paywall_title}
                        lineHeight="none"
                        type="h4"
                    >
                        {TITLE_MAP[licenseState]}
                    </Text>
                    <Text
                        className={s.Paywall_desc}
                        lineHeight="none"
                        type="t1"
                    >
                        {(isTrialExpired || isLicenseExpired) && !isMASReleaseVariant
                            ? translate('settings.paywall.expired.desc')
                            : translate('settings.paywall.desc')}
                    </Text>
                    <div className={s.Paywall_advantages}>
                        {ADVANTAGES.map(({ label, icon }) => (
                            <div
                                key={label}
                                className={s.Paywall_advantages_advantage}
                            >
                                <Icon
                                    className={s.Paywall_advantages_advantage_icon}
                                    icon={icon}
                                />
                                <Text
                                    lineHeight="none"
                                    type="t1"
                                >
                                    {label}
                                </Text>
                            </div>
                        ))}
                    </div>

                    <div className={s.Paywall_actions}>
                        {isMASReleaseVariant
                            ? <AppStoreVersionActions />
                            : <StandaloneVersionActions />}
                    </div>

                    <div className={s.Paywall_footer}>
                        <Button
                            className={cx(s.Paywall_footer_btn, tx.button.textButton)}
                            type="text"
                            onClick={() => setShowAlreadyPurchasedFlowModal(true)}
                        >
                            <Text lineHeight="none" type="t2">
                                {translate('settings.activation.flow.already.purchased')}
                            </Text>
                        </Button>
                        {isMASReleaseVariant && appStoreSubscriptions && (
                            <PaywallFooterLegalLinks />
                        )}
                    </div>
                </div>
            </div>

            {showTermsAndConditionsModal && (
                <TermsAndConditionsModal onClose={() => setShowTermsAndConditionsModal(false)} />
            )}

            {showAlreadyPurchasedFlowModal && (
                <AlreadyPurchasedFlowModal onClose={() => setShowAlreadyPurchasedFlowModal(false)} />
            )}
            <div
                className={s.Paywall_backdrop}
                onClick={() => account.closePaywall()}
            />
        </div>
    );
}

export const Paywall = observer(PaywallComponent);
