// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { EmptyValue, StringValue } from 'Apis/types';
import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
import { RouteName } from 'SettingsStore/modules/SettingsRouter';

import { PrimaryAndSecondaryButtons } from './PrimaryAndSecondaryButtons/PrimaryAndSecondaryButtons';

type StarStoryMainFrameButtonsProps = {
    isMASReleaseVariant: boolean;
};

/**
 * Main frame component for star story (rate us).
 */
export function StarStoryMainFrameButtons({
    isMASReleaseVariant,
}: StarStoryMainFrameButtonsProps) {
    return (
        <PrimaryAndSecondaryButtons
            primaryButtonAction={() => {
                if (isMASReleaseVariant) {
                    window.API.accountService.RequestOpenAppStoreReview(new EmptyValue());
                } else {
                    window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.trustpilot, RouteName.support));
                }
            }}
            primaryButtonTitle={isMASReleaseVariant ? translate('tray.story.rate.adguard.appstore.action') : translate('tray.story.rate.adguard.trustpilot.action')}
            secondaryButtonAction={() => {
                window.API.internalService.OpenSettingsWindow(new EmptyValue());
                window.API.settingsService.RequestOpenSettingsPage(new StringValue({
                    value: RouteName.support,
                }));
            }}
            secondaryButtonTitle={translate('tray.story.rate.adguard.problem.action')}
        />
    );
}
