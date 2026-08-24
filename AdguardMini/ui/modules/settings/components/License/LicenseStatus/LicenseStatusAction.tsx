// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Subscription } from 'Apis/types';
import { getTdsLink, TDS_PARAMS } from 'Common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Button, Text } from 'UILib';

import { LicenseStatusActionType, useLicenseStatusActionType } from './hooks';

/**
 * Action for LicenseStatus component
 */
function LicenseStatusActionComponent() {
    const { account } = useSettingsStore();

    const actionType = useLicenseStatusActionType();

    if (!actionType) {
        return null;
    }

    const licenseStatusActionHandler = (): void => {
        switch (actionType) {
            case LicenseStatusActionType.manageLicense:
                window.OpenLinkInBrowser(getTdsLink(TDS_PARAMS.licenses, RouteName.license));
                break;
            case LicenseStatusActionType.getFullVersion:
                account.requestWebSubscription(Subscription.standalone);
                break;
            case LicenseStatusActionType.renewLicense:
                account.requestRenewLicense(account.license?.license?.licenseKey?.getHiddenValue() || '');
                break;
        }
    };

    const getLicenseStatusActionLabel = (): string => {
        switch (actionType) {
            case LicenseStatusActionType.manageLicense:
                return translate('license.manage.license');
            case LicenseStatusActionType.getFullVersion:
                return translate('license.get.full.version');
            case LicenseStatusActionType.renewLicense:
                return translate('license.renew.license');
        }
    };

    return (
        <Button
            type="text"
            onClick={licenseStatusActionHandler}
        >
            <Text lineHeight="none" type="t2">
                {getLicenseStatusActionLabel()}
            </Text>
        </Button>
    );
}

export const LicenseStatusAction = observer(LicenseStatusActionComponent);
