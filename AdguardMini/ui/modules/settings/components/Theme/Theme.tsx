// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Theme as ThemeEnum } from 'Apis/types';
import { Layout, Radio, Text } from 'Common/components';
import { SettingsTitle } from 'Modules/settings/components/SettingsTitle';
import { useSettingsStore } from 'SettingsLib/hooks';
import { themeText } from 'SettingsLib/utils/translate';
import { RouteName } from 'SettingsStore/modules';

import s from './Theme.module.pcss';

import type { IOption } from 'Common/components';

const THEMES = [
    ThemeEnum.system,
    ThemeEnum.light,
    ThemeEnum.dark,
];

/**
 * Page for choose Theme
 */
function ThemeComponent() {
    const { router, settings: { settings: { theme: currentTheme } }, settings } = useSettingsStore();

    const onThemeChanged = (e: ThemeEnum) => () => {
        settings.updateTheme(e);
    };

    const themes = THEMES.reduce<IOption<ThemeEnum>[]>((prev, v) => {
        if (v === ThemeEnum.unknown) {
            return prev;
        }
        prev.push({ value: v as ThemeEnum, label: themeText(v as ThemeEnum) });
        return prev;
    }, []);

    return (
        <Layout navigation={{ router, route: RouteName.settings, title: translate('menu.settings') }} type="settingsPage">
            <SettingsTitle
                title={translate('settings.theme')}
            />
            <div>
                {themes.map((theme) => (
                    <Radio
                        key={theme.value}
                        checked={theme.value === currentTheme}
                        className={s.Theme_option}
                        id={theme.value.toString()}
                        onClick={onThemeChanged(theme.value)}
                    >
                        <Text type="t1">{theme.label}</Text>
                    </Radio>
                ))}
            </div>
        </Layout>
    );
}

export const Theme = observer(ThemeComponent);
