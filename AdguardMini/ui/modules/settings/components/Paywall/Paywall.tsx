// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useEffect, useId, useRef, useState } from 'preact/hooks';

import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
import { useFocusTrap } from 'Common/hooks/useFocusTrap';
import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { RouteName, SettingsLayer } from 'Modules/settings/store/modules';
import { useSettingsStore } from 'SettingsLib/hooks';
import { Button, ExternalLink, Icon, Text } from 'UILib';

import { AlreadyPurchasedFlowModal } from '../ActivationFlow';

import { AppStoreVersionActions } from './AppStoreVersionActions';
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
            label: translate('settings.paywall.advantage.2'),
            icon: 'apps',
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

    const dialogRef = useRef<HTMLDivElement>(null);

    // Released while a nested modal is up, so its own trap takes over.
    useFocusTrap(dialogRef, !showTermsAndConditionsModal && !showAlreadyPurchasedFlowModal);

    const titleId = useId();
    const descId = useId();

    // The paywall covers the window without touching focus, so nothing
    // announced that it opened. Focus its title, which carries both the title
    // and the line under it as its accessible name.
    useFocusOnMount(titleId);

    const getBackgroundImageClassName = () => {
        if (isMASReleaseVariant) {
            return s.Paywall_bg__defaultImage;
        }

        if (isTrialExpired) {
            return s.Paywall_bg__trialExpiredImage;
        }

        if (isLicenseExpired) {
            return s.Paywall_bg__licenseExpiredImage;
        }

        return s.Paywall_bg__defaultImage;
    };

    const getPaywallTitle = () => {
        if (isMASReleaseVariant) {
            return translate('settings.paywall.title');
        }

        if (isTrialExpired) {
            return translate('settings.paywall.trial.expired.title');
        }

        if (isLicenseExpired) {
            return translate('settings.paywall.license.expired.title');
        }

        return translate('settings.paywall.title');
    };

    const isRightSide = (isTrialExpired || isLicenseExpired) && !isMASReleaseVariant;

    const offer = appStoreSubscriptions?.result?.promoInfo;
    const showOffer = offer && (
        appStoreSubscriptions?.result?.annual?.introOfferDisplayPrice
        || appStoreSubscriptions?.result?.monthly?.introOfferDisplayPrice
    );

    return (
        <div className={s.Paywall}>
            {/* The paywall is a modal in all but markup — same dialog semantics as `Modal`. */}
            <div
                ref={dialogRef}
                aria-label={getPaywallTitle()}
                className={cx(s.Paywall_bg, getBackgroundImageClassName())}
                role="dialog"
                aria-modal
            >
                <Icon
                    ariaLabel={translate('close')}
                    className={s.Paywall_cross}
                    icon="cross"
                    role="button"
                    isFocusable
                    onClick={() => account.closePaywall()}
                />
                {showOffer && !isRightSide && (
                    <div className={s.Paywall_offer_wrapper}>
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
                        <div className={s.Paywall_offer_line}>
                            <svg fill="none" height="20" viewBox="0 0 20 20" width="20" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1.20703 0.5L18.707 18V0.5H1.20703Z" fill="var(--fills-notifications-orange-default)" stroke="var(--stroke-icons-attention-icon-default)" />
                            </svg>
                        </div>
                    </div>
                )}
                <div className={cx(
                    s.Paywall_container,
                    isRightSide ? s.Paywall_container__right : s.Paywall_container__left,
                )}
                >
                    {/* The heading names itself plus the line under it. */}
                    <Text
                        ariaLabelledby={`${titleId} ${descId}`}
                        className={s.Paywall_title}
                        id={titleId}
                        lineHeight="none"
                        tabIndex={0}
                        type="h4"
                    >
                        {getPaywallTitle()}
                    </Text>
                    <Text
                        className={s.Paywall_desc}
                        id={descId}
                        lineHeight="none"
                        type="t1"
                    >
                        {(isTrialExpired || isLicenseExpired) && !isMASReleaseVariant
                            ? translate('settings.paywall.expired.desc')
                            : translate('settings.paywall.desc')}
                    </Text>
                    {/*
                      * A list, stepped through one item at a time: read in one
                      * breath the four perks blur into a single long sentence.
                      * The icons only repeat the text, so they stay hidden.
                      */}
                    <div className={s.Paywall_advantages} role="list">
                        {ADVANTAGES.map(({ label, icon }) => (
                            <div
                                key={label}
                                className={s.Paywall_advantages_advantage}
                                role="listitem"
                                tabIndex={0}
                            >
                                <Icon
                                    className={s.Paywall_advantages_advantage_icon}
                                    icon={icon}
                                    ariaHidden
                                />
                                <Text
                                    lineHeight="none"
                                    type="t2"
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
                            className={cx(s.Paywall_footer_btn)}
                            type="text"
                            onClick={() => setShowAlreadyPurchasedFlowModal(true)}
                        >
                            <Text lineHeight="none" type="t3">
                                {translate('settings.activation.flow.already.purchased')}
                            </Text>
                        </Button>
                        {isMASReleaseVariant && appStoreSubscriptions && (
                            <>
                                <div className={s.Paywall_footer_link}>
                                    <ExternalLink
                                        className={s.Paywall_footer_btn}
                                        href={getTdsLink(TDS_PARAMS.eula, RouteName.license)}
                                        textType="t3"
                                        noLineHeight
                                        noUnderline
                                    >
                                        {translate('paywall.terms.of.use')}
                                    </ExternalLink>
                                </div>
                                <div className={s.Paywall_footer_link}>
                                    <ExternalLink
                                        className={s.Paywall_footer_btn}
                                        href={getTdsLink(TDS_PARAMS.privacy, RouteName.license)}
                                        textType="t3"
                                        noLineHeight
                                        noUnderline
                                    >
                                        {translate('paywall.privacy.policy')}
                                    </ExternalLink>
                                </div>
                            </>
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
                aria-hidden
                onClick={() => account.closePaywall()}
            />
        </div>
    );
}

export const Paywall = observer(PaywallComponent);
