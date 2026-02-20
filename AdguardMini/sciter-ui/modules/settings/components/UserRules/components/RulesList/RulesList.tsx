// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType } from 'SettingsStore/modules';

import { Rule } from '..';

import s from './RulesList.module.pcss';

export type RulesListProps = {
    rulesList: { rule: string; enabled: boolean; index: number }[];
    muted?: boolean;
    onEdit(index: number): void;
};

/**
 * User Rules list in User Rules page [Settings module]
 */
export function RulesList({
    rulesList,
    muted,
    onEdit,
}: RulesListProps) {
    const {
        userRules,
        userRules: { userRules: { rules } },
        notification,
    } = useSettingsStore();

    const handleDelete = async (index: number) => {
        const [err, prevRules] = await userRules.updateRules(rules.filter((_, i) => i !== index));
        if (err?.hasError) {
            notification.notify({
                message: getNotificationSomethingWentWrongText(),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
        } else {
            notification.notify({
                message: translate('notification.user.rules.delete', {
                    rule: prevRules[index].rule,
                    b: (text: string) => (<div className={s.RulesList_rule}><b>{text}</b></div>),
                }),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.success,
                iconType: NotificationsQueueIconType.done,
                undoAction: () => {
                    userRules.updateRules(prevRules);
                },
                closeable: true,
            }, true);
        }
    };

    const handleStateChange = (index: number, state: boolean) => {
        const newRules = [...rules];
        newRules[index].enabled = state;
        userRules.updateRules(newRules);
    };

    return (
        <>
            {rulesList.map((r) => (
                <Rule
                    key={r.rule + r.index}
                    muted={muted}
                    rule={r}
                    onDelete={handleDelete}
                    onEdit={onEdit}
                    onRuleStateUpdate={handleStateChange}
                />
            ))}
        </>
    );
}
