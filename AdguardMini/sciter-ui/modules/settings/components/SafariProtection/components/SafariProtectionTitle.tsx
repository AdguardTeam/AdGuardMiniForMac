// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { ReportProblemVariant } from 'SettingsStore/modules';

import { SettingsTitle } from '../../SettingsTitle';

/**
 * Safari protection title component
 */
function SafariProtectionTitleComponent() {
    const { ui } = useSettingsStore();

    return (
        <SettingsTitle
            description={translate('safari.protection.title.desc')}
            showReportBugTooltip={ui.reportProblemLabelStatus === ReportProblemVariant.Show}
            title={translate('menu.safari.protection')}
            maxTopPadding
            reportBug
        />
    );
}

export const SafariProtectionTitle = observer(SafariProtectionTitleComponent);