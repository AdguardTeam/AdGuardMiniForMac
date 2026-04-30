// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { RequestOpenAppStoreReviewRequest } from 'Apis/requests/AccountService';
import { OpenSettingsWindowRequest } from 'Apis/requests/InternalService';
import { RequestOpenSettingsPageRequest } from 'Apis/requests/SettingsService';
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
                    window.API.Execute(new RequestOpenAppStoreReviewRequest());
                } else {
                    window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.trustpilot, RouteName.support));
                }
            }}
            primaryButtonTitle={isMASReleaseVariant ? translate('tray.story.rate.adguard.appstore.action') : translate('tray.story.rate.adguard.trustpilot.action')}
            secondaryButtonAction={() => {
                window.API.Execute(new OpenSettingsWindowRequest());
                window.API.Execute(new RequestOpenSettingsPageRequest({
                    value: RouteName.support,
                }));
            }}
            secondaryButtonTitle={translate('tray.story.rate.adguard.problem.action')}
        />
    );
}
