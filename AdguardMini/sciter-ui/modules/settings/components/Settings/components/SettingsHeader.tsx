// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';

import { SettingsTitle } from '../../SettingsTitle';

type Props = {
    onImport(): void;
    onExport(): void;
    onToggleResetModal(): void;
    onClearStatistics(): void;
};

/**
 * Settings header component
 */
export function SettingsHeader(props: Props) {
    const {
        onExport,
        onImport,
        onToggleResetModal,
        onClearStatistics,
    } = props;

    return (
        <SettingsTitle
            buttonTestId="settings-general-context-menu"
            elements={[{
                text: translate('settings.export.settings'),
                action: onExport,
            }, {
                text: translate('settings.import.settings'),
                action: onImport,
            }, {
                text: translate('settings.clear.statistics'),
                action: onClearStatistics,
            }, {
                text: translate('reset.defaults'),
                action: onToggleResetModal,
                className: theme.button.redText,
                testId: 'settings-general-reset-trigger',
            }]}
            title={translate('menu.settings')}
            maxTopPadding
        />
    );
}
