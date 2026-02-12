// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Icon, Switch, Text } from 'UILib';

import s from './SettingsItem.module.pcss';

import type { RouteParamsMap } from 'Modules/common/stores/interfaces/IRouter';
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

// TODO: Move to another file
export const SettingsItem = observer(SettingsItemComponent);

export type SettingsItemSwitchProps = SettingsItemProps & {
    id?: string;
    value: boolean;
    setValue(e: boolean): void;
    muted?: boolean;
    disabled?: boolean;
};

/**
 * SettingsItemSwitch - predefined basic component with switch
 */
export function SettingsItemSwitch({
    id,
    value,
    setValue,
    muted,
    disabled,
    ...rest
}: SettingsItemSwitchProps) {
    const isEnabled = value && !muted;

    return (
        <SettingsItem
            {...rest}
            iconColor={isEnabled ? 'green' : 'gray'}
            onContainerClick={() => {
                if (disabled) {
                    return;
                }
                setValue(!value);
            }}
        >
            <Switch checked={value} disabled={disabled} id={id} muted={muted} onChange={setValue} />
        </SettingsItem>
    );
}

export type SettingsItemLinkProps<T extends Record<string, any> = object> = Omit<SettingsItemProps, 'children' | 'onContainerClick' | 'routeName' | 'trackEventOnRouteChange'> & {
    externalLink?: string;
    internalLink?: RouteName;
    internalLinkParams?: RouteParamsMap<T>;
    onClick?(): void;
    disabled?: boolean;
    linkIcon?: IconType;
    trackTelemetryEvent?: SettingsEvent;
};

/**
 * SettingsItemLink - predefined basic component with all container as a link;
 */
function SettingsItemLinkComponent<T extends Record<string, any>>({
    externalLink,
    internalLink,
    internalLinkParams,
    onClick,
    disabled,
    linkIcon,
    trackTelemetryEvent,
    ...rest
}: SettingsItemLinkProps<T>) {
    const { router, telemetry } = useSettingsStore();
    const handleClick = () => {
        if (onClick) {
            onClick();
            return;
        }
        if (disabled) {
            return;
        }

        if (trackTelemetryEvent) {
            telemetry.trackEvent(trackTelemetryEvent);
        }

        if (externalLink) {
            window.OpenLinkInBrowser(externalLink);
        } else if (internalLink) {
            // if stays for checking that route name exist
            router.changePath(internalLink, internalLinkParams);
        }
    };
    return (
        <SettingsItem {...rest} onContainerClick={handleClick}>
            <Icon className={s.SettingsItemLink_arrow} icon={linkIcon ?? 'arrow_left'} />
        </SettingsItem>
    );
}

export const SettingsItemLink = observer(SettingsItemLinkComponent);
