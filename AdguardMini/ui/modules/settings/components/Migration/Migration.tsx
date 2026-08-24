// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useState } from 'preact/hooks';

import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Layout, Button, Text } from 'UILib';

import migration1 from './images/migration1.svg';
import migration2 from './images/migration2.svg';
import s from './Migration.module.pcss';

import type { LicenseRouterParams } from 'SettingsStore/modules';

/**
 * Migration screens component
 */
export const Migration = observer(() => {
    const { router } = useSettingsStore();
    const [step, setStep] = useState<0 | 1>(0);

    const contents = {
        0: {
            title: translate('migration.step.1.title'),
            description1: translate('migration.step.1.description.1'),
            description2: translate('migration.step.1.description.2'),
            image: migration1,
            buttonSubmit: {
                title: translate('migration.step.1.button.submit'),
                action: () => setStep(1),
            },
            buttonOther: {
                title: translate('migration.step.1.button.other'),
                action: () => {
                    window.OpenLinkInBrowser(getTdsLink(
                        TDS_PARAMS.ag_mini_mac_release_blogpost,
                        RouteName.migration,
                    ));
                },
            },
        },
        1: {
            title: translate('migration.step.2.title'),
            description1: translate('migration.step.2.description.1'),
            description2: translate('migration.step.2.description.2'),
            image: migration2,
            buttonSubmit: {
                title: translate('migration.step.2.button.submit'),
                action: () => {
                    router.changePath(RouteName.safari_protection);
                },
            },
            buttonOther: {
                title: translate('migration.step.2.button.other'),
                action: () => {
                    const params: LicenseRouterParams = { alreadyPurchased: true };
                    router.changePath(RouteName.license, params);
                },
            },
        },
    };

    const content = contents[step];

    return (
        <Layout className={s.Migration} type="migration">
            <div className={s.Migration_container}>
                <div className={s.Migration_container_text}>
                    <Text className={s.Migration_container__title} type="h4">{content.title}</Text>
                    <Text className={s.Migration_container__description} type="t1">{content.description1}</Text>
                    <Text type="t1">{content.description2}</Text>
                </div>
                <div className={s.Migration_container_image}>
                    <img alt={content.title} src={content.image} />
                </div>
            </div>
            <div className={s.Migration_buttons}>
                <Button
                    className={theme.button.greenSubmit}
                    type="submit"
                    onClick={content.buttonSubmit.action}
                >
                    <Text lineHeight="none" type="t1">{content.buttonSubmit.title}</Text>
                </Button>
                <Button type="outlined" onClick={content.buttonOther.action}>
                    <Text lineHeight="none" type="t1">{content.buttonOther.title}</Text>
                </Button>
            </div>
        </Layout>
    );
});
