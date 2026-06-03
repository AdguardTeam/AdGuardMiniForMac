// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Icon, Text } from 'UILib';

import s from './SettingsItem.module.pcss';

import type { ComponentChildren } from 'preact';
import type { RouteName, SettingsEvent } from 'SettingsStore/modules';
import type { IconType } from 'UILib';

export type SettingsItemProps = {
    title: string;
    onContainerClick?(): void;
    icon?: IconType;
    iconColor?: 'green' | 'orange' | 'red' | 'gray';
    iconRotate?: boolean;
    description?: string;
    additionalText?: ComponentChildren;
    routeName?: RouteName;
    /**
     * Can be used with routeName param to track event when navigating to that route
     */
    trackEventOnRouteChange?: SettingsEvent;
    className?: string;
    contentClassName?: string;
    children?: ComponentChildren;
    noHover?: boolean;
    defaultHovered?: boolean;
    newLabel?: boolean;
};

/**
 * SettingsItem component - basic component of any page on SettingsModule
 * It has slot for right part of block
 */
function SettingsItemComponent({
    title,
    onContainerClick,
    icon,
    iconColor = 'green',
    iconRotate,
    description,
    routeName,
    className,
    contentClassName,
    children,
    additionalText,
    noHover,
    defaultHovered,
    newLabel,
    trackEventOnRouteChange,
}: SettingsItemProps) {
    const { router, telemetry } = useSettingsStore();

    const handleRouteChange = (e: MouseEvent) => {
        e.stopPropagation();
        if (trackEventOnRouteChange) {
            telemetry.trackEvent(trackEventOnRouteChange);
        }
        router.changePath(routeName!);
    };

    return (
        <div
            className={cx(
                s.SettingsItem,
                onContainerClick && s.SettingsItem__pointer,
                !routeName && !noHover && s.SettingsItem__hover,
                defaultHovered && s.SettingsItem_defaultHovered,
                className,
            )}
            onClick={routeName ? handleRouteChange : onContainerClick}
        >
            <div className={cx(
                s.SettingsItem_title,
                s.SettingsItem_container,
                routeName && s.SettingsItem__hover,
                routeName && s.SettingsItem__pointer,
            )}
            >
                <div
                    className={cx(s.SettingsItem_container_line, routeName && s.SettingsItem_container__route)}
                    onClick={routeName ? handleRouteChange : undefined}
                >
                    {icon && (
                        <Icon
                            className={cx(
                                s.SettingsItem_container_line_icon,
                                s[`SettingsItem_container_line_icon__${iconColor}`],
                                iconRotate && s.SettingsItem_container_line_icon__rotate,
                                !!(description || additionalText) && s.SettingsItem_container_line__negativeMargin,
                            )}
                            icon={icon}
                        />
                    )}
                    <div
                        className={cx(
                            s.SettingsItem_container_line_text,
                            routeName && s.SettingsItem__pointer,
                            !(description || additionalText) && s.SettingsItem_container_line__paddingTop,
                        )}
                    >
                        <Text lineHeight="none" type="t1">{title}</Text>
                    </div>
                    {newLabel && (<div className={s.SettingsItem_container_newLabel}><Text type="t3">New</Text></div>)}
                </div>
                {(description || additionalText) && (
                    <div
                        className={cx(
                            s.SettingsItem_container_desc,
                            icon && s.SettingsItem_container_desc__icon,
                            contentClassName,
                        )}
                        onClick={routeName ? () => router.changePath(routeName) : undefined}
                    >
                        {description && (<Text className={s.SettingsItem_container_desc_text} type="t2">{description}</Text>)}
                        {additionalText}
                    </div>
                )}
            </div>
            {routeName && (<div className={routeName && s.SettingsItem_container_routeBorder} />)}
            <div
                className={cx(
                    s.SettingsItem_container,
                    s.SettingsItem_container_children,
                    routeName && s.SettingsItem_container__withRoute,
                    routeName && s.SettingsItem__hover,
                )}
                onClick={(e) => {
                    if (routeName) {
                        onContainerClick?.();
                        e.stopPropagation();
                    }
                }}
            >
                {children}
            </div>
        </div>
    );
}

export const SettingsItem = observer(SettingsItemComponent);
