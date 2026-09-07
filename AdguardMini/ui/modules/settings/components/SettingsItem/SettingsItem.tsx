// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId } from 'preact/hooks';

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
    /**
     * Exposes the whole row as one button (`SettingsItemLink`): such a row has
     * a single action and no interactive children besides the arrow icon, so
     * unlike the switch rows there is nothing that would end up nested.
     */
    containerAsButton?: boolean;
    /**
     * Id for the description block, when the caller needs to reference it —
     * `SettingsItemSwitch` points its switch's `aria-describedby` here.
     */
    descriptionId?: string;
    /**
     * Overrides the visible `title` as the row's accessible name when
     * `containerAsButton` is set — e.g. `SettingsItemLink` appends an
     * "opens in browser" hint without changing what is printed on screen.
     */
    ariaLabel?: string;
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
    containerAsButton,
    descriptionId,
    ariaLabel,
}: SettingsItemProps) {
    const { router, telemetry } = useSettingsStore();

    // Reading the description is what tells the user what a row actually
    // does; `aria-describedby` attaches it to whichever control represents
    // the row, so it is announced right after the name.
    const autoDescriptionId = useId();
    const descId = (description || additionalText) ? descriptionId ?? autoDescriptionId : undefined;

    const handleRouteChange = (e: MouseEvent) => {
        e.stopPropagation();
        if (trackEventOnRouteChange) {
            telemetry.trackEvent(trackEventOnRouteChange);
        }
        router.changePath(routeName!);
    };

    return (
        <div
            aria-describedby={containerAsButton ? descId : undefined}
            // Some callers pass JSX as `title`; a name is only derivable from a
            // string, otherwise the button falls back to its text content.
            aria-label={containerAsButton && typeof title === 'string' ? (ariaLabel ?? title) : undefined}
            className={cx(
                s.SettingsItem,
                onContainerClick && s.SettingsItem__pointer,
                !routeName && !noHover && s.SettingsItem__hover,
                defaultHovered && s.SettingsItem_defaultHovered,
                className,
            )}
            role={containerAsButton ? 'button' : undefined}
            tabIndex={containerAsButton ? 0 : undefined}
            onClick={routeName ? handleRouteChange : onContainerClick}
        >
            <div className={cx(
                s.SettingsItem_title,
                s.SettingsItem_container,
                routeName && s.SettingsItem__hover,
                routeName && s.SettingsItem__pointer,
            )}
            >
                {/*
                  * The role goes on the title line rather than the whole row:
                  * a row can also hold a switch in `children`, and marking the
                  * container as a button would nest that switch inside it.
                  */}
                <div
                    aria-describedby={routeName ? descId : undefined}
                    className={cx(s.SettingsItem_container_line, routeName && s.SettingsItem_container__route)}
                    role={routeName ? 'button' : undefined}
                    tabIndex={routeName ? 0 : undefined}
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
                        id={descId}
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
    iconColor,
    ...rest
}: SettingsItemSwitchProps) {
    const isEnabled = value && !muted;

    const descriptionId = useId();
    const hasDescription = Boolean(rest.description || rest.additionalText);

    return (
        <SettingsItem
            {...rest}
            descriptionId={descriptionId}
            iconColor={iconColor ?? (isEnabled ? 'green' : 'gray')}
            onContainerClick={() => {
                if (disabled) {
                    return;
                }
                setValue(!value);
            }}
        >
            {/*
              * The switch sits in a slot next to the row title, with no label
              * of its own — without borrowing the title VoiceOver announces
              * every settings toggle as a nameless "switch".
              */}
            <Switch
                ariaDescribedby={hasDescription ? descriptionId : undefined}
                ariaLabel={rest.title}
                checked={value}
                disabled={disabled}
                id={id}
                muted={muted}
                onChange={setValue}
            />
        </SettingsItem>
    );
}

export type SettingsItemLinkProps<T extends Record<string, any> = object> = Omit<SettingsItemProps, 'children' | 'onContainerClick' | 'routeName' | 'trackEventOnRouteChange' | 'ariaLabel'> & {
    externalLink?: string;
    internalLink?: RouteName;
    internalLinkParams?: RouteParamsMap<T>;
    onClick?(): void;
    disabled?: boolean;
    linkIcon?: IconType;
    trackTelemetryEvent?: SettingsEvent;
    /**
     * Marks the row as leaving the app for the system browser, for rows that
     * do it through a custom `onClick` (e.g. a native RPC that resolves a URL
     * and opens it) rather than `externalLink`. Rows with `externalLink` are
     * detected automatically.
     */
    opensInBrowser?: boolean;
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
    opensInBrowser,
    ...rest
}: SettingsItemLinkProps<T>) {
    const { router, telemetry } = useSettingsStore();

    // `externalLink` always routes to `window.OpenLinkInBrowser` below, so it
    // implies the hint on its own; `opensInBrowser` covers rows that reach the
    // browser through a plain `onClick` instead (e.g. "Report a problem",
    // which resolves its URL on the Swift side before opening it).
    const leavesTheApp = Boolean(externalLink) || opensInBrowser;
    const ariaLabel = leavesTheApp && typeof rest.title === 'string'
        ? `${rest.title}, ${translate('settings.opens.in.browser.aria')}`
        : undefined;
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
        // Without `containerAsButton` the row is a bare clickable `<div>` —
        // unreachable from the keyboard and invisible to VoiceOver.
        <SettingsItem {...rest} ariaLabel={ariaLabel} containerAsButton onContainerClick={handleClick}>
            <Icon className={s.SettingsItemLink_arrow} icon={linkIcon ?? 'arrow_left'} />
        </SettingsItem>
    );
}

export const SettingsItemLink = observer(SettingsItemLinkComponent);
