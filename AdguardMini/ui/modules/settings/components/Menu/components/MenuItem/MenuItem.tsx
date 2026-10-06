// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { buttonProps } from 'Common/lib/keyboardActivation';
import { useSettingsStore } from 'SettingsLib/hooks';
import { Icon, Text } from 'UILib';

import s from './MenuItem.module.pcss';

import type { RouteName } from 'SettingsStore/modules';
import type { IconType } from 'UILib';

type MenuItemBaseProps = {
    icon: IconType;
    title: string;
    isNew?: boolean;
    /**
     * Trailing icon at the row's end, e.g. the external-link marker of an
     * action that leaves the app.
     */
    rightIcon?: IconType;
};

/**
 * Row that navigates: it owns a route and is highlighted while that route (or
 * one of `activeRoutes`) is open.
 */
type MenuItemRouteProps = MenuItemBaseProps & {
    route: RouteName;
    activeRoutes?: RouteName[];
    onClick?: never;
};

/**
 * Row that acts instead of navigating: it has no route, so it can never be
 * marked as the current page.
 */
type MenuItemActionProps = MenuItemBaseProps & {
    route?: never;
    activeRoutes?: never;
    onClick(): void;
};

export type MenuItemProps = MenuItemRouteProps | MenuItemActionProps;

/**
 * Menu link in settings menu
 */
function MenuItemComponent(props: MenuItemProps) {
    const { icon, title, isNew, rightIcon } = props;
    const { router } = useSettingsStore();
    const { currentPath } = router;

    const active = props.route !== undefined
        && (currentPath === props.route || props.activeRoutes?.includes(currentPath));

    const activate = () => {
        if (props.route !== undefined) {
            router.changePath(props.route);
            return;
        }

        props.onClick();
    };

    return (
        // A plain `<div>` is invisible to VoiceOver; the role is what turns the
        // menu entry into an announceable control, and `aria-current` is what
        // tells the user which section they are on — the active state is
        // otherwise conveyed by colour and weight alone.
        <div
            aria-current={active ? 'page' : undefined}
            className={cx(s.MenuItem_item, active && s.MenuItem_item__active)}
            {...buttonProps(activate)}
        >
            <Icon className={s.MenuItem_icon} icon={icon} />
            <Text className={s.MenuItem_text} lineHeight="none" semibold={active} type="t2">{title}</Text>
            {isNew && <Icon className={s.MenuItem_iconNew} icon="bullet" />}
            {rightIcon && <Icon className={s.MenuItem_rightIcon} icon={rightIcon} />}
        </div>
    );
}

export const MenuItem = observer(MenuItemComponent);
