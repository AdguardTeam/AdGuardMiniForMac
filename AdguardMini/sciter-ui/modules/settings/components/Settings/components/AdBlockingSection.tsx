// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { OpenSafariExtensionPreferencesRequest } from 'Apis/requests/SettingsService';
import { OptionalStringValue } from 'Apis/types';
import { getCountableEntityStatuses } from 'Modules/common/utils/utils';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import { SettingsItemLink } from '../../SettingsItem';
import s from '../Settings.module.pcss';

/**
 * Ad blocking section for settings
 */
export const AdBlockingSection = observer(() => {
    const {
        settings: { safariExtensionsStore: { enabledSafariExtensionsCount, safariExtensionsCount } },
        filters,
    } = useSettingsStore();

    const {
        allDisabled: allExtensionsDisabled,
        allEnabled: allExtensionsEnabled,
        someDisabled: someExtensionsDisabled,
    } = getCountableEntityStatuses(enabledSafariExtensionsCount, safariExtensionsCount);

    const enabledFilters = filters.enabledFilters.size;

    const getDisabledExtensionsStatus = () => {
        const navParam = {
            nav: (text: string) => (
                <Button
                    className={s.Settings_button}
                    type="text"
                    onClick={(e) => {
                        e?.stopPropagation();
                        window.API.Execute(new OpenSafariExtensionPreferencesRequest(new OptionalStringValue()));
                    }}
                >
                    <Text className={theme.color.orange} type="t2">
                        {text}
                    </Text>
                </Button>
            ),
        };

        if (someExtensionsDisabled) {
            return translate('settings.safari.ext.warning', navParam);
        }

        if (allExtensionsDisabled) {
            return translate('settings.safari.ext.all.warning', navParam);
        }
    };

    return (
        <>
            <Text className={s.Settings_sectionTitle} type="h5">{translate('settings.ad.blocking')}</Text>
            <SettingsItemLink
                additionalText={(
                    <Text className={s.Settings_enabled} type="t2">
                        {translate('filters.enabled', {
                            enabled: enabledFilters,
                        })}
                    </Text>
                )}
                description={translate('settings.filters.desc')}
                internalLink={RouteName.filters}
                title={translate('settings.filters')}
            />
            <SettingsItemLink
                additionalText={(
                    <>
                        <Text className={s.Settings_enabled} type="t2">{translate('filters.enabled', { enabled: enabledSafariExtensionsCount })}</Text>
                        {!allExtensionsEnabled && (
                            <Text className={s.Settings_enabled_warning} type="t2">
                                {getDisabledExtensionsStatus()}
                            </Text>
                        )}
                    </>
                )}
                description={translate('settings.safari.ext.desc')}
                internalLink={RouteName.safari_extensions}
                title={translate('settings.safari.ext')}
            />
        </>
    );
});
