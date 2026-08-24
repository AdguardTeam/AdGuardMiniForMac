// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { quitReactionText, themeText } from 'SettingsLib/utils/translate';
import { RouteName } from 'SettingsStore/modules';
import { Text } from 'UILib';

import { SettingsItemLink, SettingsItemSwitch } from '../../SettingsItem';
import s from '../Settings.module.pcss';

import type { QuitReaction, Theme } from 'Apis/types';

type Props = {
    launchOnStartup: boolean;
    showInMenuBar: boolean;
    quitReaction: QuitReaction;
    themeSetting: Theme;
    onLaunchOnStartup(value: boolean): void;
    onShowInMenuBar(value: boolean): void;
};

/**
 * App section for settings
 */
export function AppSection(props: Props) {
    const {
        launchOnStartup,
        onLaunchOnStartup,
        onShowInMenuBar,
        quitReaction,
        showInMenuBar,
        themeSetting,
    } = props;

    return (
        <>
            <Text className={s.Settings_sectionTitle} type="h5">{translate('settings.app')}</Text>
            <SettingsItemSwitch
                setValue={onLaunchOnStartup}
                title={translate('settings.launch.on.start')}
                value={launchOnStartup}
            />
            <SettingsItemSwitch
                setValue={onShowInMenuBar}
                title={translate('settings.show.in.menu')}
                value={showInMenuBar}
            />
            <SettingsItemLink
                description={themeText(themeSetting)}
                internalLink={RouteName.theme}
                title={translate('settings.theme')}
            />
            <SettingsItemLink
                description={quitReactionText(quitReaction)}
                internalLink={RouteName.quit_reaction}
                title={translate('settings.hardware.quit.reaction')}
            />
        </>
    );
}
