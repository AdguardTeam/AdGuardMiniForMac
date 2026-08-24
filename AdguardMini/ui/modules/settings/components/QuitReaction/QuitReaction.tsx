// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { QuitReaction as QuitReactionEnum } from 'Apis/types';
import { Layout, Radio, Text } from 'Common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { quitReactionText } from 'SettingsLib/utils/translate';
import { RouteName } from 'SettingsStore/modules';

import { SettingsTitle } from '../SettingsTitle';

import s from './QuitReaction.module.pcss';

import type { IOption } from 'Common/components';

const QUIT_REACTIONS = [
    QuitReactionEnum.ask,
    QuitReactionEnum.quit,
    QuitReactionEnum.keepRunning,
];

/**
 * Page for choose QuitReaction
 */
function QuitReactionComponent() {
    const { router, settings: { settings: { quitReaction } }, settings } = useSettingsStore();

    const onReactionChange = (e: QuitReactionEnum) => () => {
        settings.updateQuitReaction(e);
    };

    const quitReactions = QUIT_REACTIONS.reduce<IOption<QuitReactionEnum>[]>((prev, v) => {
        if (v === QuitReactionEnum.unknown) {
            return prev;
        }
        prev.push({ value: v as QuitReactionEnum, label: quitReactionText(v as QuitReactionEnum) });
        return prev;
    }, []);

    return (
        <Layout navigation={{ router, route: RouteName.settings, title: translate('menu.settings') }} type="settingsPage">
            <SettingsTitle
                description={translate('settings.hardware.quit.reaction.desc')}
                title={translate('settings.hardware.quit.reaction')}
            />
            <div>
                {quitReactions.map((reaction) => (
                    <Radio
                        key={reaction.value}
                        checked={reaction.value === quitReaction}
                        className={s.QuitReaction_option}
                        id={reaction.value.toString()}
                        onClick={onReactionChange(reaction.value)}
                    >
                        <Text type="t1">{reaction.label}</Text>
                    </Radio>
                ))}
            </div>
        </Layout>
    );
}

export const QuitReaction = observer(QuitReactionComponent);
