// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEscape } from '@adg/sciter-utils-kit';
import { observer } from 'mobx-react-lite';

import { Icon, Text } from 'UILib';

import s from './NavigationHeader.module.pcss';

import type { IRouter } from 'Modules/common/stores/interfaces/IRouter';
import type { RouteName } from 'SettingsStore/modules';

export type NavigationHeaderProps = {
    route: RouteName;
    router: IRouter<string>;
    title: string;
    onClick?(): void;
    testId?: string;
} | {
    route?: RouteName;
    router?: IRouter<string>;
    title: string;
    onClick(): void;
    testId?: string;
};

/**
 * Header with link back. Now used only in settings module,
 * but because is used in Layout type='settingsPage'
 * stored in UILib.
 */
function NavigationHeaderComponent({
    route,
    title,
    router,
    onClick,
    testId,
}: NavigationHeaderProps) {
    useEscape(() => {
        if (onClick) {
            onClick();
        } else {
            router?.changePath(route!);
        }
    });
    return (
        <div id={testId} className={s.NavigationHeader} onClick={onClick ?? (() => router?.changePath(route!))}>
            <Icon className={s.NavigationHeader_icon} icon="arrow_left" />
            <Text className={s.NavigationHeader_text} type="t2">{title}</Text>
        </div>
    );
}

export const NavigationHeader = observer(NavigationHeaderComponent);
