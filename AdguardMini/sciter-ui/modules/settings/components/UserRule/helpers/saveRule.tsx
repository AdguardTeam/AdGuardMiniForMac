// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    BlockRequestRule, UnblockRequestRule, CustomRule,
    NoFilteringRule, Comment, DomainModifiers,
} from '@adguard/rules-editor';

import { UserRule as UserRuleType } from 'Apis/types';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName, SettingsEvent } from 'SettingsStore/modules';

import { validateDomain } from '../forms/helpers';
import s from '../UserRule.module.pcss';

import type { FormErrors } from '../UserRule';

type RuleBuilder = any;

interface SaveRuleParams {
    rule: { rule: RuleBuilder };
    setErrors(errors: FormErrors): void;
    rules: UserRuleType[];
    hasRawRule: boolean;
    rawRule: string;
    addComment: { value: boolean; comment: Comment };
    userRules: {
        updateRules(rules: UserRuleType[]): void;
        addUserRule(rule: string): Promise<unknown>;
    };
    notification: { notify(opts: Record<string, unknown>): void };
    telemetry: { layersRelay: { trackEvent(event: string): void } };
    navigateBack(): void;
}

/**
 * Validates and saves a user rule. Handles all 5 rule types, duplicate detection,
 * edit/create branching, and comment attachment.
 */
export async function saveRule(params: SaveRuleParams): Promise<void> {
    const { rule, setErrors, rules, hasRawRule, rawRule, addComment,
        userRules, notification, telemetry, navigateBack } = params;

    const notifyError = () => {
        notification.notify({
            message: getNotificationSomethingWentWrongText(),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.warning,
            iconType: NotificationsQueueIconType.error,
            closeable: true,
        });
    };

    const notifySuccess = (ruleStr: string, undo: () => void) => {
        notification.notify({
            message: translate('notification.user.rules.save', {
                rule: ruleStr,
                b: (text: string) => (<div className={s.UserRule_notificationSuccess}><b>{text}</b></div>),
            }),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            undoAction: undo,
            closeable: true,
        });
    };

    // ---- Validation ----

    if (rule.rule instanceof CustomRule && !rule.rule.getRule()) {
        setErrors({ rule: translate('user.rules.fill.field') }); return;
    }

    if (rule.rule instanceof BlockRequestRule || rule.rule instanceof UnblockRequestRule) {
        const showDomains = rule.rule.getDomainModifiers() === DomainModifiers.onlyListed
            || rule.rule.getDomainModifiers() === DomainModifiers.allExceptListed;
        const errors: FormErrors = {};
        if (!rule.rule.getDomain()) { errors.domain = translate('user.rules.fill.field'); } else if (!validateDomain(rule.rule.getDomain())) { errors.domain = translate('user.rules.domain.invalid'); }
        if (showDomains && !rule.rule.getDomainModifiersDomains().join()) { errors.websites = translate('user.rules.fill.field'); } else if (showDomains && !rule.rule.getDomainModifiersDomains().every((d: string) => validateDomain(d))) { errors.websites = translate('user.rules.domain.invalid'); }
        if (Object.keys(errors).length > 0) { setErrors(errors); return; }
    }

    if (rule.rule instanceof NoFilteringRule) {
        if (!rule.rule.getDomain()) { setErrors({ domain: translate('user.rules.fill.field') }); return; }
        if (!validateDomain(rule.rule.getDomain())) { setErrors({ domain: translate('user.rules.domain.invalid') }); return; }
    }

    if (rule.rule instanceof Comment && !rule.rule.getText()) {
        setErrors({ comment: translate('user.rules.fill.field') }); return;
    }

    const ruleStr = rule.rule.buildRule();
    if (rules.find((r) => r.rule === ruleStr)) {
        notification.notify({
            message: translate('user.rules.rule.exists'),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.warning,
            iconType: NotificationsQueueIconType.error,
            closeable: true,
        });
        return;
    }

    // ---- Save (edit) ----

    if (hasRawRule) {
        let tempRules = [...rules];
        const index = tempRules.findIndex((r) => r.rule === rawRule);
        tempRules[index].rule = ruleStr;
        if (addComment.value && addComment.comment.getText()) {
            tempRules = [
                ...rules.slice(0, index),
                new UserRuleType({ rule: addComment.comment.buildRule(), enabled: true }),
                ...rules.slice(index),
            ];
            const result = await (userRules.updateRules(tempRules) as unknown) as [{ hasError?: boolean }, UserRuleType[]] | undefined;
            const [err, prevRules] = result ?? [{}, []];
            if (err?.hasError) { notifyError(); } else { notifySuccess(ruleStr, () => userRules.updateRules(prevRules)); }
        } else {
            userRules.updateRules(tempRules);
        }
        navigateBack();
        return;
    }

    // ---- Save (create) ----

    const rulesCopy = [...rules];
    const err = await userRules.addUserRule(ruleStr);
    if (err) { notifyError(); return; }
    if (addComment.value && addComment.comment.getText()) {
        const errC = await userRules.addUserRule(addComment.comment.buildRule());
        if (errC) { notifyError(); return; }
    }
    telemetry.layersRelay.trackEvent(SettingsEvent.CreateRuleClick);
    notifySuccess(ruleStr, () => userRules.updateRules(rulesCopy));
    navigateBack();
}
