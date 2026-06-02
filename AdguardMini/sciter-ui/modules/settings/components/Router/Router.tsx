// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import { Layout } from 'UILib';

import { About } from '../About';
import { AdvancedBlocking } from '../AdvancedBlocking';
import { ConvertingStatus } from '../ConvertingStatus/ConvertingStatus';
import { Filters } from '../Filters';
import { LanguageSpecific } from '../LanguageSpecific';
import { License } from '../License';
import { Menu } from '../Menu';
import { Migration } from '../Migration';
import { QuitReaction } from '../QuitReaction';
import { SafariExtension } from '../SafariExtension';
import { SafariProtection } from '../SafariProtection';
import { Settings } from '../Settings';
import { Support } from '../Support';
import { SupportContact } from '../SupportContact';
import { Theme } from '../Theme';
import { UserRule } from '../UserRule';
import { UserRules } from '../UserRules';

import s from './Router.module.pcss';

/**
 * Component for handling Routes. Depending on RouterStore display current page
 */
function RouterComponent() {
    const { router } = useSettingsStore();
    let component = null;
    switch (router.currentPath) {
        case RouteName.safari_protection:
            component = <SafariProtection />;
            break;
        case RouteName.language_specific:
            component = <LanguageSpecific />;
            break;
        case RouteName.advanced_blocking:
            component = <AdvancedBlocking />;
            break;
        case RouteName.user_rules:
            component = <UserRules />;
            break;
        case RouteName.user_rule:
            component = <UserRule />;
            break;
        case RouteName.settings:
            component = <Settings />;
            break;
        case RouteName.safari_extensions:
            component = <SafariExtension />;
            break;
        case RouteName.filters:
            component = <Filters />;
            break;
        case RouteName.license:
            component = <License />;
            break;
        case RouteName.support:
            component = <Support />;
            break;
        case RouteName.contact_support:
            component = <SupportContact />;
            break;
        case RouteName.about:
            component = <About />;
            break;
        case RouteName.quit_reaction:
            component = <QuitReaction />;
            break;
        case RouteName.theme:
            component = <Theme />;
            break;
        case RouteName.migration:
            component = <Migration />;
            break;
    }

    return (
        <Layout type="settings">
            <Menu />
            <div className={s.Router_container}>
                <ConvertingStatus />
                {component}
            </div>
        </Layout>
    );
}

export const Router = observer(RouterComponent);
