// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEnter, focusOnBody } from '@adg/sciter-utils-kit';
import {
    BlockRequestRule,
    UnblockRequestRule,
    CustomRule,
    NoFilteringRule,
    Comment,
    DomainModifiers,
    RulesBuilder,
} from '@adguard/rules-editor';
import { observer } from 'mobx-react-lite';
import { useCallback, useRef, useState } from 'preact/hooks';

import { UserRule as UserRuleType } from 'Apis/types';
import { useSettingsStore } from 'SettingsLib/hooks';
import { getNotificationSomethingWentWrongText } from 'SettingsLib/utils/translate';
import { NotificationContext, NotificationsQueueIconType, NotificationsQueueType, RouteName, SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Layout, Text, RuleHighlighter, Textarea, Checkbox, Button, Select, Modal } from 'UILib';

import { ContextMenu } from '../ContextMenu';

import { BlockRequestForm, UnblockRequestForm, CommentForm, CustomRuleForm, DisableFilteringForm } from './forms';
import { convertRule, getLabelByRuleType, getTypeOptions, validateDomain } from './forms/helpers';
import s from './UserRule.module.pcss';

import type { RuleTypeOptions } from './forms/helpers';
import type {
    RuleType } from '@adguard/rules-editor';
import type { IOption } from 'UILib';

type Params = { index?: number };

type RuleTypeParam<T> = { rule: T };

type ErrorFields = 'domain' | 'websites' | 'additionalComment' | 'comment' | 'rule';

export type FormErrors = Partial<Record<ErrorFields, string>>;

/**
 * User rule create edit page in settings module
 */
function UserRuleComponent() {
    const { router, userRules, notification, telemetry } = useSettingsStore();
    const editRef = useRef(false);

    const { userRules: { rules } } = userRules;

    const params = router.castParams<Params>();
    const rawRule = userRules.rules[typeof params?.index === 'number' ? params.index : -1]?.rule;

    const initialType = (rawRule ? RulesBuilder.getRuleType(rawRule) : 'block') || 'custom';

    const [type, setType] = useState<IOption<RuleType>>({ value: initialType, label: getLabelByRuleType(initialType) });
    let initialValue = rawRule
        ? RulesBuilder.getRuleFromRuleString(rawRule)
        : RulesBuilder.getRuleByType('block');

    if (!initialValue && rawRule) {
        initialValue = RulesBuilder.getRuleByType('custom');
        initialValue.setRule(rawRule);
    }
    const [rule, setRuleRaw] = useState({ rule: initialValue! });
    const [errors, setErrors] = useState<FormErrors>({});
    const [showExitModal, setShowExitModal] = useState(false);
    const [addComment, setAddComment] = useState({ value: false, comment: RulesBuilder.getRuleByType('comment') });
    const typeOptions = getTypeOptions();

    const safeRef = useRef(false);

    const divRef = useCallback((node: HTMLDivElement | null) => {
        if (node) {
            focusOnBody();
        }
    }, []);

    const setRule: typeof setRuleRaw = (data) => {
        editRef.current = true;
        setRuleRaw(data);
    };

    const notifyError = () => {
        notification.notify({
            message: getNotificationSomethingWentWrongText(),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.warning,
            iconType: NotificationsQueueIconType.error,
            closeable: true,
        });
    };

    const notifySuccess = (r: string, undo: () => void) => {
        notification.notify({
            message: translate('notification.user.rules.save', {
                rule: r,
                b: (text: string) => (<div className={s.UserRule_notificationSuccess}><b>{text}</b></div>),
            }),
            notificationContext: NotificationContext.info,
            type: NotificationsQueueType.success,
            iconType: NotificationsQueueIconType.done,
            undoAction: undo,
            closeable: true,
        });
    };

    const onRuleTypeChange = (e: RuleType) => {
        const currentType = type.value;
        const { rule: currentRule } = rule;
        const newType = e;

        if (currentType === newType) {
            return;
        }

        if (rawRule && newType === initialType && currentRule.buildRule() === rawRule) {
            setType({ value: initialType, label: getLabelByRuleType(initialType) });
            setRule({ rule: RulesBuilder.getRuleFromRuleString(rawRule)! });
            return;
        }

        if (currentType === 'comment') {
            const tempComment = RulesBuilder.getRuleByType('comment');
            tempComment.setText((currentRule as Comment).getText());
            setAddComment({ value: true, comment: tempComment });
        }
        const newBuilder = convertRule(currentRule as RuleTypeOptions, currentType, newType);

        setType(typeOptions.find((t) => t.value === e)!);
        setRule({ rule: newBuilder! });
    };

    const onSave = async () => {
        if (safeRef.current) {
            return;
        }

        safeRef.current = true;

        if (rule.rule instanceof CustomRule && !rule.rule.getRule()) {
            setErrors({ ...errors, rule: translate('user.rules.fill.field') });
            safeRef.current = false;
            return;
        }

        if (rule.rule instanceof BlockRequestRule || rule.rule instanceof UnblockRequestRule) {
            const showDomainsField = rule.rule.getDomainModifiers() === DomainModifiers.onlyListed
                || rule.rule.getDomainModifiers() === DomainModifiers.allExceptListed;
            let hasError = false;

            if (!rule.rule.getDomain()) {
                setErrors({ ...errors, domain: translate('user.rules.fill.field') });
                hasError = true;
            }
            if (rule.rule.getDomain() && !validateDomain(rule.rule.getDomain())) {
                setErrors({ ...errors, domain: translate('user.rules.domain.invalid') });
                hasError = true;
            }

            if (showDomainsField && !rule.rule.getDomainModifiersDomains().join()) {
                setErrors({ ...errors, websites: translate('user.rules.fill.field') });
                hasError = true;
            }
            if (showDomainsField && rule.rule.getDomainModifiersDomains().join()) {
                const isValid = rule.rule.getDomainModifiersDomains().every((d) => validateDomain(d));
                if (!isValid) {
                    setErrors({ ...errors, websites: translate('user.rules.domain.invalid') });
                    hasError = true;
                }
            }
            if (hasError) {
                safeRef.current = false;
                return;
            }
        }

        if (rule.rule instanceof NoFilteringRule) {
            if (!rule.rule.getDomain()) {
                setErrors({ ...errors, domain: translate('user.rules.fill.field') });
                safeRef.current = false;
                return;
            }
            if (rule.rule.getDomain() && !validateDomain(rule.rule.getDomain())) {
                setErrors({ ...errors, domain: translate('user.rules.domain.invalid') });
                safeRef.current = false;
                return;
            }
        }

        if (rule.rule instanceof Comment) {
            if (!rule.rule.getText()) {
                setErrors({ ...errors, comment: translate('user.rules.fill.field') });
                safeRef.current = false;
                return;
            }
        }

        if (rules.find((r) => (r.rule === rule.rule.buildRule()))) {
            notification.notify({
                message: translate('user.rules.rule.exists'),
                notificationContext: NotificationContext.info,
                type: NotificationsQueueType.warning,
                iconType: NotificationsQueueIconType.error,
                closeable: true,
            });
            safeRef.current = false;
            return;
        }

        if (rawRule) {
            let tempRules = [...rules];
            const index = tempRules.findIndex((r) => r.rule === rawRule);
            tempRules[index].rule = rule.rule.buildRule();
            if (addComment.value && addComment.comment.getText()) {
                tempRules = [
                    ...rules.slice(0, index),
                    new UserRuleType({ rule: addComment.comment.buildRule(), enabled: true }),
                    ...rules.slice(index),
                ];
                const [err, prevRules] = await userRules.updateRules(tempRules);
                if (err?.hasError) {
                    notifyError();
                } else {
                    notifySuccess(rule.rule.buildRule(), () => {
                        userRules.updateRules(prevRules);
                    });
                }
            } else {
                userRules.updateRules(tempRules);
            }
            safeRef.current = false;
            router.changePath(RouteName.user_rules);
            return;
        }

        const rulesCopy = [...rules];
        const err = await userRules.addUserRule(rule.rule.buildRule());
        if (err) {
            notifyError();
            safeRef.current = false;
            return;
        }
        if (addComment.value && addComment.comment.getText()) {
            const errComment = await userRules.addUserRule(addComment.comment.buildRule());
            if (errComment) {
                notifyError();
                safeRef.current = false;
                return;
            }
        }
        telemetry.layersRelay.trackEvent(SettingsEvent.CreateRuleClick);
        notifySuccess(rule.rule.buildRule(), () => {
            userRules.updateRules(rulesCopy);
        });
        safeRef.current = false;
        router.changePath(RouteName.user_rules);
    };

    useEnter(onSave);

    const onCancel = () => {
        if (editRef.current) {
            setShowExitModal(true);
            return;
        }
        router.changePath(RouteName.user_rules);
    };

    /**
     * If save/create button should be disabled
     * If raw rule exist  === user edit rule, so if initialRule(rawRule) same as rule from form,
     * then button should be disabled
     * Else rule is new, so button should be enabled always
     */
    const canSave = (
        rawRule && (rule.rule.buildRule() !== rawRule || (addComment.value && addComment.comment.getText()))
    ) || !rawRule;

    return (
        <Layout navigation={{ router, onClick: onCancel, title: translate('menu.user.rules') }} type="settingsPage">
            <div ref={divRef} className={cx(s.UserRule_title, theme.layout.content)}>
                <Text type="h4" className={s.UserRule_title_text}>
                    {rawRule ? translate('user.rules.edit') : translate('user.rules.create')}
                </Text>
                <ContextMenu navigateContactSupport={{ subject: 'report_bug' }} />
            </div>
            <div className={cx(theme.layout.content, s.UserRule_form, s.UserRule_input)}>
                <Select<RuleType>
                    currentValue={type.value}
                    id="rule_type"
                    itemList={typeOptions}
                    onChange={onRuleTypeChange}
                />
            </div>
            {(type.value === 'block') && (
                <BlockRequestForm
                    errors={errors}
                    rule={rule as RuleTypeParam<BlockRequestRule>}
                    setRule={setRule}
                    setErrors={setErrors}
                    // TODO: AG-40506
                    shouldFocus={!!(rule as RuleTypeParam<BlockRequestRule>).rule.getDomain()}
                />
            )}
            {(type.value === 'unblock') && (
                <UnblockRequestForm
                    errors={errors}
                    rule={rule as RuleTypeParam<UnblockRequestRule>}
                    setRule={setRule}
                    setErrors={setErrors}
                    // TODO: AG-40506
                    shouldFocus={!!(rule as RuleTypeParam<UnblockRequestRule>).rule.getDomain()}
                />
            )}
            {(type.value === 'noFiltering') && (
                <DisableFilteringForm
                    errors={errors}
                    rule={rule as RuleTypeParam<NoFilteringRule>}
                    setRule={setRule}
                    setErrors={setErrors}
                    // TODO: AG-40506
                    shouldFocus={!!(rule as RuleTypeParam<NoFilteringRule>).rule.getDomain()}
                />
            )}
            {(type.value === 'custom') && (
                <CustomRuleForm
                    errors={errors}
                    rule={rule as RuleTypeParam<CustomRule>}
                    setRule={setRule}
                    setErrors={setErrors}
                    // TODO: AG-40506
                    shouldFocus={!!(rule as RuleTypeParam<CustomRule>).rule.getRule()}
                />
            )}
            {(type.value === 'comment') && (
                <CommentForm
                    errors={errors}
                    rule={rule as RuleTypeParam<Comment>}
                    setRule={setRule}
                    setErrors={setErrors}
                    // TODO: AG-40506
                    shouldFocus={!!(rule as RuleTypeParam<Comment>).rule.getText()}
                />
            )}
            {/* User can add a comment to any new rule type except comment, when creating a new rule */}
            {/* if rawRule exist - it means user is editing an existing rule */}
            {type.value !== 'comment' && !rawRule && (
                <div className={cx(theme.layout.content)}>
                    <Checkbox
                        checked={addComment.value}
                        className={cx(s.UserRule_input, s.UserRule_commentCheckbox)}
                        onChange={(e) => setAddComment({ ...addComment, value: e })}
                    >
                        <Text type="t1">
                            {translate('user.rule.add.comment')}
                        </Text>
                    </Checkbox>
                    {addComment.value && (
                        <Textarea
                            className={s.UserRule_input}
                            id="domainModifierDomains"
                            textAreaClassName={s.UserRule_textarea}
                            value={addComment.comment.getText()}
                            onChange={(e) => {
                                addComment.comment.setText(e);
                                setAddComment({ ...addComment });
                            }}
                        />
                    )}
                </div>
            )}

            {(type.value !== 'comment') && (type.value !== 'custom') && (
                <div className={cx(theme.layout.content, s.UserRule_highlight)}>
                    <Text className={s.UserRule_label} type="t2" div>
                        {translate('user.rule.preview')}
                    </Text>
                    {' '}
                    <RuleHighlighter
                        rule={rule.rule.buildRule()}
                    />
                </div>
            )}
            <div className={cx(theme.layout.content)}>
                <div className={s.UserRule_buttons}>
                    <Button
                        className={cx(s.UserRule_buttons_button, theme.button.greenSubmit)}
                        disabled={!canSave}
                        type="submit"
                        small
                        onClick={onSave}
                    >
                        <Text lineHeight="none" type="t1" semibold>{rawRule ? translate('save') : translate('create')}</Text>
                    </Button>
                    <Button
                        className={s.UserRule_buttons_button}
                        type="outlined"
                        small
                        onClick={onCancel}
                    >
                        <Text lineHeight="none" type="t1" semibold>{translate('cancel')}</Text>
                    </Button>
                </div>
            </div>
            {showExitModal && (
                <Modal
                    cancelText={translate('user.rule.leave.cancel')}
                    description={rawRule ? translate('user.rule.leave.desc.edit') : translate('user.rule.leave.desc.new')}
                    submitAction={() => router.changePath(RouteName.user_rules)}
                    submitClassName={theme.button.redSubmit}
                    submitText={translate('user.rule.leave.ok')}
                    title={translate('user.rule.leave')}
                    cancel
                    submit
                    onClose={() => setShowExitModal(false)}
                />
            )}
        </Layout>
    );
}

export const UserRule = observer(UserRuleComponent);
