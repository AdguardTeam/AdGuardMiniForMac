// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';
import { ReportProblemVariant } from 'SettingsStore/modules';

import { SettingsTitle } from '../../SettingsTitle';

/**
 * Safari protection title component
 */
export function SafariProtectionTitle() {
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
