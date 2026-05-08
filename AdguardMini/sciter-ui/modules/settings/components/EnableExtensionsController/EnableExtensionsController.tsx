// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { OptionalStringValue } from 'Apis/types';
import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { TDS_PARAMS, getTdsLink } from 'Common/utils/links';
import { getCountableEntityStatuses } from 'Common/utils/utils';
import { useSettingsStore, useTheme } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import { EnableAdGuardExtensions } from 'Common/views';

import s from './EnableExtensionsController.module.pcss';

/**
 * Component that is shown when the user has all extensions disabled
 */
function EnableExtensionsControllerComponent() {
    const { settings, ui } = useSettingsStore();

    const {
        allDisabled: allExtensionsDisabled,
    } = getCountableEntityStatuses(
        settings.safariExtensionsStore.enabledSafariExtensionsCount,
        settings.safariExtensionsStore.safariExtensionsCount,
    );

    if (!ui.showSafariExtensionsEnableScreen || !allExtensionsDisabled) {
        return null;
    }

    const onClose = () => {
        ui.setShowSafariExtensionsEnableScreen(false);
    };

    const openSafariPref = () => {
        window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
    };

    return (
        <EnableAdGuardExtensions
            privacyPolicyUrl={getTdsLink(TDS_PARAMS.privacy, RouteName.safari_protection)}
            buttons={[
                { buttonType: 'submit', action: openSafariPref, label: translate('onboarding.extensions.open.settings') },
                { buttonType: 'text', action: onClose, label: translate('onboarding.skip') },
            ]}
            useTheme={useTheme}
            containerClassName={s.EnableExtensionsController}
        />
    );
}

export const EnableExtensionsController = observer(EnableExtensionsControllerComponent);
