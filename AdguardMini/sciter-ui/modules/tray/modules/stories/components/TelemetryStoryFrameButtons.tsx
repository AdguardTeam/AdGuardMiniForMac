// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { UpdateAllowTelemetryRequest } from 'Apis/requests/SettingsService';

import { PrimaryAndSecondaryButtons } from './PrimaryAndSecondaryButtons/PrimaryAndSecondaryButtons';

type TelemetryStoryFrameButtonsProps = {
    frameIdNavigation(frameId: string): void;
};

/**
 * Main frame component for star story (rate us).
 */
export const telemetryStoryFrameButtonsWrapper = (showLearnMore: boolean) => function ({
    frameIdNavigation,
}: TelemetryStoryFrameButtonsProps) {
    return (
        <PrimaryAndSecondaryButtons
            primaryButtonAction={() => {
                window.API.Execute(new UpdateAllowTelemetryRequest({ value: true }));
                frameIdNavigation('telemetry4');
            }}
            primaryButtonTitle={translate('telemetry.story.frame.button.share')}
            secondaryButtonAction={showLearnMore ? () => frameIdNavigation('telemetry2') : undefined}
            secondaryButtonTitle={showLearnMore ? translate('telemetry.story.frame.button.learn') : undefined}
        />
    );
};
