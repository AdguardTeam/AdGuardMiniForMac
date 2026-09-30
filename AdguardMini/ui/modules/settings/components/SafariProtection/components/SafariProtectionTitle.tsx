// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';

import { SettingsTitle } from '../../SettingsTitle';

/**
 * Safari protection title component
 */
function SafariProtectionTitleComponent() {
    const { settings } = useSettingsStore();

    // Only the persisted flag arms the tooltip: it is shown once ever, not
    // once per window open, and an unanswered flag (`undefined`) must not
    // flash it while the settings are still loading.
    const showReportBugTooltip = settings.reportProblemLabelShown === false;

    return (
        <SettingsTitle
            description={translate('safari.protection.title.desc')}
            showReportBugTooltip={showReportBugTooltip}
            title={translate('menu.safari.protection')}
            maxTopPadding
            reportBug
        />
    );
}

export const SafariProtectionTitle = observer(SafariProtectionTitleComponent);
