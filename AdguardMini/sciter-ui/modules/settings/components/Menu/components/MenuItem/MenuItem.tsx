// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Icon, Text } from 'UILib';

import s from './MenuItem.module.pcss';

import type { RouteName } from 'SettingsStore/modules';
import type { IconType } from 'UILib';

export type MenuItemProps = {
    icon: IconType;
    route: RouteName;
    activeRoutes?: RouteName[];
    title: string;
    isNew?: boolean;
};

/**
 * Menu link in settings menu
 */
function MenuItemComponent({
    icon,
    route,
    activeRoutes,
    title,
    isNew,
}: MenuItemProps) {
    const { router } = useSettingsStore();
    const { currentPath } = router;
    const active = currentPath === route || activeRoutes?.includes(currentPath);
    return (
        <div
            className={cx(s.MenuItem_item, active && s.MenuItem_item__active)}
            onClick={() => router.changePath(route)}
        >
            <Icon className={s.MenuItem_icon} icon={icon} />
            <Text className={s.MenuItem_text} lineHeight="none" semibold={active} type="t2">{title}</Text>
            {isNew && <Icon className={s.MenuItem_iconNew} icon="bullet" />}
        </div>
    );
}

export const MenuItem = observer(MenuItemComponent);
