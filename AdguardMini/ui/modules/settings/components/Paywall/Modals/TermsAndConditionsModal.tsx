// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { RouteName } from 'SettingsStore/modules';
import { ExternalLink, Modal, Text } from 'UILib';

type TermsAndConditionsModalProps = {
    onClose(): void;
};

/**
 * "Terms and conditions" modal for Paywall component
 */
export function TermsAndConditionsModal({ onClose }: TermsAndConditionsModalProps) {
    return (
        <Modal
            title={translate('settings.paywall.terms.and.conditions')}
            zIndex="paywall-modal"
            onClose={onClose}
        >
            <Text type="t1">
                {translate('settings.paywall.terms.and.conditions.desc', {
                    eula: (text: string) => (
                        <ExternalLink
                            href={getTdsLink(TDS_PARAMS.eula, RouteName.license)}
                            textType="t1"
                        >
                            {text}
                        </ExternalLink>
                    ),
                    policy: (text: string) => (
                        <ExternalLink
                            href={getTdsLink(TDS_PARAMS.privacy, RouteName.license)}
                            textType="t1"
                        >
                            {text}
                        </ExternalLink>
                    ),
                })}
            </Text>
        </Modal>
    );
}
