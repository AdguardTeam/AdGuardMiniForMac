// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { Icon } from 'UILib';
import { SettingsItem } from './SettingsItem';
import s from './SettingsItem.module.pcss';

import type { SettingsItemProps } from './SettingsItem';
import type { RouteParamsMap } from 'Modules/common/stores/interfaces/IRouter';
import type { RouteName, SettingsEvent } from 'SettingsStore/modules';
import type { IconType } from 'UILib';

export type SettingsItemLinkProps<T extends Record<string, unknown> = Record<string, unknown>> = Omit<SettingsItemProps, 'children' | 'onContainerClick' | 'routeName' | 'trackEventOnRouteChange'> & {
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
function SettingsItemLinkComponent<T extends Record<string, unknown>>({
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
