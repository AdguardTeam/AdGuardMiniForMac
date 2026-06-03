// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { RouteName } from 'SettingsStore/modules';
import { ExternalLink } from 'UILib';

import s from '../Paywall.module.pcss';

/**
 * Footer legal links (Terms of Use, Privacy Policy) for the paywall.
 * Only shown for MAS release variant when app store subscriptions are available.
 */
export function PaywallFooterLegalLinks() {
    return (
        <>
            <div className={s.Paywall_footer_link}>
                <ExternalLink
                    className={cx(s.Paywall_footer_btn, tx.button.textButton)}
                    href={getTdsLink(TDS_PARAMS.eula, RouteName.license)}
                    textType="t2"
                    noLineHeight
                    noUnderline
                >
                    {translate('paywall.terms.of.use')}
                </ExternalLink>
            </div>
            <div className={s.Paywall_footer_link}>
                <ExternalLink
                    className={cx(s.Paywall_footer_btn, tx.button.textButton)}
                    href={getTdsLink(TDS_PARAMS.privacy, RouteName.license)}
                    textType="t2"
                    noLineHeight
                    noUnderline
                >
                    {translate('paywall.privacy.policy')}
                </ExternalLink>
            </div>
        </>
    );
}
