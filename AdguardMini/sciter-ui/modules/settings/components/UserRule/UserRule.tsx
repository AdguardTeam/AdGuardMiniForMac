// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useEnter, focusOnBody } from '@adg/sciter-utils-kit';
import {
    RulesBuilder, BlockContentTypeModifiers, UnblockContentTypeModifier,
} from '@adguard/rules-editor';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';
import theme from 'Theme';
import { Layout, Text, RuleHighlighter, Textarea, Checkbox, Button, Select, Modal } from 'UILib';

import { ContextMenu } from '../ContextMenu';

import { RequestRuleForm, CommentForm, CustomRuleForm, DisableFilteringForm } from './forms';
import { convertRule, getLabelByRuleType, getTypeOptions } from './forms/helpers';
import { saveRule } from './helpers/saveRule';
import s from './UserRule.module.pcss';

import type { RuleTypeOptions } from './forms/helpers';
import type {
    RuleType,
    BlockRequestRule,
    UnblockRequestRule,
    CustomRule,
    NoFilteringRule,
    Comment,
} from '@adguard/rules-editor';
import type { IOption } from 'UILib';

type Params = { index?: number };

type ErrorFields = 'domain' | 'websites' | 'additionalComment' | 'comment' | 'rule';

export type FormErrors = Partial<Record<ErrorFields, string>>;

/**
 * User rule create edit page in settings module
 */
function UserRuleComponent() {
    const { router, userRules, notification, telemetry, ui } = useSettingsStore();
    const editRef = useRef(false);

    const { userRules: { rules } } = userRules;

    const params = router.castParams<Params>();
    const rawRule = userRules.rules[typeof params?.index === 'number' ? params.index : -1]?.rule;
    const hasRawRule = typeof rawRule === 'string';

    useEffect(() => {
        return () => {
            if (router.currentPath !== RouteName.user_rules) {
                ui.resetUserRulesScrollTop();
            }
        };
    }, [router, ui]);

    const initialType = (hasRawRule ? RulesBuilder.getRuleType(rawRule) : 'block') || 'custom';

    const [type, setType] = useState<IOption<RuleType>>({ value: initialType, label: getLabelByRuleType(initialType) });
    let initialValue = hasRawRule
        ? RulesBuilder.getRuleFromRuleString(rawRule)
        : RulesBuilder.getRuleByType('block');

    if (!initialValue && hasRawRule) {
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

    const onRuleTypeChange = (e: RuleType) => {
        const currentType = type.value;
        const { rule: currentRule } = rule;
        const newType = e;

        if (currentType === newType) {
            return;
        }

        if (hasRawRule && newType === initialType && currentRule.buildRule() === rawRule) {
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

        await saveRule({
            rule, setErrors, rules, hasRawRule, rawRule, addComment,
            userRules: userRules,
            notification: notification,
            telemetry: telemetry,
            navigateBack: () => router.changePath(RouteName.user_rules),
        });
        safeRef.current = false;
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
        hasRawRule && (rule.rule.buildRule() !== rawRule || (addComment.value && Boolean(addComment.comment.getText())))
    ) || !hasRawRule;

    const FORM_MAP: Record<RuleType, any> = {
        block: (props: any) => (
            <RequestRuleForm<BlockRequestRule>
                contentLabelKey={translate('user.rule.block.content.label')}
                contentModifierEnum={BlockContentTypeModifiers as unknown as Record<string, BlockContentTypeModifiers>}
                domainLabelKey={translate('user.rule.block.domain.label')}
                shouldFocus={!!(props.rule.rule as BlockRequestRule).getDomain()}
                hasAllOption
                {...props}
            />
        ),
        unblock: (props: any) => (
            <RequestRuleForm<UnblockRequestRule>
                contentLabelKey={translate('user.rule.unblock.content.label')}
                contentModifierEnum={
                    UnblockContentTypeModifier as unknown as Record<string, UnblockContentTypeModifier>
                }
                domainLabelKey={translate('user.rule.unblock.domain.label')}
                hasAllOption={false}
                shouldFocus={!!(props.rule.rule as UnblockRequestRule).getDomain()}
                {...props}
            />
        ),
        noFiltering: (props: any) => (
            <DisableFilteringForm
                shouldFocus={!!(props.rule.rule as NoFilteringRule).getDomain()}
                {...props}
            />
        ),
        custom: (props: any) => (
            <CustomRuleForm
                shouldFocus={!!(props.rule.rule as CustomRule).getRule()}
                {...props}
            />
        ),
        comment: (props: any) => (
            <CommentForm
                shouldFocus={!!(props.rule.rule as Comment).getText()}
                {...props}
            />
        ),
    };

    const FormComponent = FORM_MAP[type.value];

    return (
        <Layout navigation={{ router, onClick: onCancel, title: translate('menu.user.rules') }} type="settingsPage">
            <div ref={divRef} className={cx(s.UserRule_title, theme.layout.content)}>
                <Text className={s.UserRule_title_text} type="h4">
                    {hasRawRule ? translate('user.rules.edit') : translate('user.rules.create')}
                </Text>
                <ContextMenu reportBug />
            </div>
            <div className={cx(theme.layout.content, s.UserRule_form, s.UserRule_input)}>
                <Select<RuleType>
                    currentValue={type.value}
                    id="rule_type"
                    itemList={typeOptions}
                    onChange={onRuleTypeChange}
                />
            </div>
            {FormComponent && (
                <FormComponent
                    errors={errors}
                    rule={rule}
                    setErrors={setErrors}
                    setRule={setRule}
                />
            )}
            {/* User can add a comment to any new rule type except comment, when creating a new rule */}
            {/* if rawRule exist - it means user is editing an existing rule */}
            {type.value !== 'comment' && !hasRawRule && (
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
                        <Text lineHeight="none" type="t1" semibold>{hasRawRule ? translate('save') : translate('create')}</Text>
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
                    description={hasRawRule ? translate('user.rule.leave.desc.edit') : translate('user.rule.leave.desc.new')}
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
