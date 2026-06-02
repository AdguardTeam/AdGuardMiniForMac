// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { SafariExtensionStatus } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Text } from 'UILib';

import { SettingsItem } from '../../SettingsItem';
import s from '../SafariExtension.module.pcss';

import type { SafariExtension as SafariExtensionEnt } from 'Apis/types';

/**
 * Safari extension statuses considered as errors
 */
const smthWrongErrors = [
    SafariExtensionStatus.unknown,
    SafariExtensionStatus.limit_exceeded,
    SafariExtensionStatus.converter_error,
    SafariExtensionStatus.safari_error,
];

/**
 * Returns icon configuration for the given extension status
 */
const iconFromStatus = (status: SafariExtensionStatus) => {
    switch (status) {
        case SafariExtensionStatus.unknown:
            return { icon: 'info', iconColor: 'red' } as const;
        case SafariExtensionStatus.ok:
            return { icon: 'logo_check', iconColor: 'green' } as const;
        case SafariExtensionStatus.loading:
            return { icon: 'loading', iconColor: 'green', iconRotate: true } as const;
        case SafariExtensionStatus.disabled:
            return { icon: 'info', iconColor: 'orange' } as const;
        case SafariExtensionStatus.limit_exceeded:
        case SafariExtensionStatus.converter_error:
        case SafariExtensionStatus.safari_error:
            return { icon: 'info', iconColor: 'red' } as const;
    }
};

interface SafariExtensionRowProps {
    extension: SafariExtensionEnt;
    filtersIds: number[];
    title: string;
    description: string;
}

/**
 * Renders a single Safari extension status row with rules count, filter names, and error messages.
 */
export function SafariExtensionRow({ extension, filtersIds, title, description }: SafariExtensionRowProps) {
    const { filters, router, settings } = useSettingsStore();
    const { contentBlockersRulesLimit } = settings;
    const { filtersMap } = filters;

    const openSafariPref = (id: string) => {
        window.API.Execute(new OpenSafariExtensionPreferencesRequest({ value: id }));
    };

    const name = filtersIds
        .map((id) => filtersMap.get(id)?.title)
        .filter((v) => !!v)
        .slice(0, 3)
        .join(', ');

    const infoText = (
        <>
            <Text className={cx(s.SafariExtension_rules, extension.status === SafariExtensionStatus.limit_exceeded && s.SafariExtension_rules__red)} type="t2">
                <div>
                    {translate('settings.rules.count', { rules: Math.max(extension.rulesEnabled, 0), total: contentBlockersRulesLimit })}
                </div>
            </Text>
            <Text className={cx(s.SafariExtension_rules)} type="t2">
                {filtersIds.length > 0
                    ? (
                        <div>
                            {translate('settings.filter.enabled.names')}
                            {' '}
                            <b>
                                {name}
                                {' '}
                                {filtersIds.length > 4 ? translate('and.more', { value: filtersIds.length - 4 }) : ''}
                            </b>
                        </div>
                    )
                    : translate('settings.no.filters.enabled')}
            </Text>
            {extension.status === SafariExtensionStatus.disabled && (
                <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__orange)} type="t2" div>
                    {translate('settings.disabled.fix', { nav: (text: string) => (<div className={s.SafariExtension_rules_link} onClick={() => openSafariPref(extension.id)}>{text}</div>) })}
                </Text>
            )}
            {extension.status === SafariExtensionStatus.limit_exceeded && (
                <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__red)} type="t2" div>
                    {translate('settings.rule.limit.exceeded', { nav: (text: string) => (<div className={s.SafariExtension_rules_link} onClick={() => router.changePath(RouteName.filters, { filtersIds, backLink: RouteName.safari_extensions })}>{text}</div>) })}
                </Text>
            )}
            {smthWrongErrors.includes(extension.status) && (
                <Text className={cx(s.SafariExtension_rules, s.SafariExtension_rules__red)} type="t2">
                    {translate('settings.converter.error')}
                </Text>
            )}
        </>
    );

    return (
        <SettingsItem
            {...iconFromStatus(extension.status)}
            additionalText={infoText}
            contentClassName={s.SafariExtension_settings}
            description={description}
            title={title}
        />
    );
}
