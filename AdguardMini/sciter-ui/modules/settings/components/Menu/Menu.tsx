// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { RequestRenewRequest } from 'Apis/requests/AccountService';
import { Subscription, ABTestOption, ActiveABTest } from 'Apis/types';
import { useABTest, useSettingsStore, useTheme } from 'SettingsLib/hooks';
import { RouteName, SettingsEvent } from 'SettingsStore/modules';
import { Logo, Layout, Text, Button } from 'UILib';
import { isDarkColorTheme } from 'Utils/colorThemes';

import { MenuItem } from './components';
import s from './Menu.module.pcss';

/**
 * Main menu in settings app
 */
function MenuComponent() {
    const { account, settings, telemetry } = useSettingsStore();

    const {
        isFreeware,
        isTrialActive,
        isTrialExpired,
        isLicenseBlockedAppId,
        isAppStoreSubscription,
        isLicenseExpired,
    } = account;

    const showGetFullVersionButton = isFreeware
        || isTrialExpired
        || isLicenseBlockedAppId
        || isLicenseExpired
        // We do not show buy button for App Store trial versions.
        // Apple trial license is packed with full subscription.
        || (isTrialActive && !account.isAppStoreSubscription);

    const handleGetFullVersionClick = () => {
        const key = account.license.license?.licenseKey?.getHiddenValue() || '';
        if (isTrialActive) {
            window.API.Execute(new RequestRenewRequest({ value: key }));
        } else if (isLicenseExpired) {
            account.requestRenewLicense(key);
        } else if (isAppStoreSubscription || (settings.isMASReleaseVariant && isFreeware)) {
            account.showPaywall();
        } else {
            account.requestWebSubscription(Subscription.standalone);
        }

        telemetry.layersRelay.trackEvent(SettingsEvent.GetFullVersionClick);
    };

    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useTheme((theme) => {
        setIsDarkTheme(isDarkColorTheme(theme));
    });

    const isTest = useABTest(ActiveABTest.AG_51019_advanced_settings) === ABTestOption.option_b;

    return (
        <Layout className={s.Menu} type="settingsMenu">
            <Logo className={s.Menu_logo} isDarkTheme={isDarkTheme} />
            <div className={s.Menu_menuItems}>
                <MenuItem
                    activeRoutes={[RouteName.language_specific]}
                    icon="safari"
                    route={RouteName.safari_protection}
                    title={translate('menu.safari.protection')}
                />
                <MenuItem
                    icon="advanced"
                    route={RouteName.advanced_blocking}
                    title={isTest ? translate('menu.advanced.blocking.AG_51019_advanced_settings') : translate('menu.advanced.blocking')}
                />
                <div className={s.Menu_menuItems_delimiter}>
                    <Text type="t3">{translate('menu.delimiter.custom')}</Text>
                </div>
                <MenuItem
                    activeRoutes={[RouteName.user_rule]}
                    icon="custom_rule"
                    route={RouteName.user_rules}
                    title={translate('menu.user.rules')}
                />
                <div className={s.Menu_menuItems_delimiter}>
                    <Text type="t3">{translate('menu.delimiter.preferences')}</Text>
                </div>
                <MenuItem
                    activeRoutes={[
                        RouteName.filters,
                        RouteName.safari_extensions,
                        RouteName.quit_reaction,
                    ]}
                    icon="settings"
                    route={RouteName.settings}
                    title={translate('menu.settings')}
                />
                <MenuItem
                    icon="user"
                    route={RouteName.license}
                    title={translate('menu.license')}
                />
                <MenuItem
                    activeRoutes={[RouteName.contact_support]}
                    icon="message"
                    route={RouteName.support}
                    title={translate('menu.support')}
                />
                <MenuItem
                    icon="info"
                    route={RouteName.about}
                    title={translate('menu.about')}
                />
            </div>
            {showGetFullVersionButton && (
                <div className={s.Menu_getFullVersion}>
                    <Button
                        className={cx(tx.button.greenSubmit, s.Menu_getFullVersion_button)}
                        type="submit"
                        small
                        onClick={handleGetFullVersionClick}
                    >
                        <Text type="t2" semibold>
                            {translate('license.get.full.version')}
                        </Text>
                    </Button>
                </div>
            )}
        </Layout>
    );
}

export const Menu = observer(MenuComponent);
