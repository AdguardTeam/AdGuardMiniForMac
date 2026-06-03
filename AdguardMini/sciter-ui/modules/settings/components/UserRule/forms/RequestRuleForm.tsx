// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { DomainModifiers } from '@adguard/rules-editor';

import { Input, Select, Textarea, Checkbox, Text, Dropdown } from 'Common/components';
import theme from 'Theme';

import s from '../UserRule.module.pcss';

import {
    getLabelByContentModifier,
    buildContentOptions,
    getDomainOptions,
    validateDomain,
} from './helpers';

import type { FormErrors } from '../UserRule';
import type {
    BlockRequestRule,
    UnblockRequestRule,
    BlockContentTypeModifiers,
    UnblockContentTypeModifier,
} from '@adguard/rules-editor';
import type { IOption } from 'Common/components';

type RequestRuleType = BlockRequestRule | UnblockRequestRule;

interface RequestRuleFormProps<T extends RequestRuleType> {
    /** Rule form builder */
    rule: { rule: T };
    /** Setter for rule */
    setRule(rule: { rule: T }): void;
    /** Form errors */
    errors: FormErrors;
    /** Form errors setter */
    setErrors(err: FormErrors): void;
    /** If form should autofocus */
    shouldFocus: boolean;
    /** Translation key for domain label */
    domainLabelKey: string;
    /** Translation key for content label */
    contentLabelKey: string;
    /** Whether to include "All" in content modifier options */
    hasAllOption: boolean;
    /** Content modifier enum for building options */
    contentModifierEnum: Record<string, BlockContentTypeModifiers | UnblockContentTypeModifier>;
}

/**
 * Generic form for block/unblock request rules.
 * Replaces the previously duplicated BlockRequestForm and UnblockRequestForm.
 *
 * @param props Form configuration including rule type-specific labels and options.
 */
export function RequestRuleForm<T extends RequestRuleType>({
    rule,
    setRule,
    errors,
    setErrors,
    shouldFocus,
    domainLabelKey,
    contentLabelKey,
    hasAllOption,
    contentModifierEnum,
}: RequestRuleFormProps<T>) {
    const currentRule = rule.rule;

    const onDomainChange = (e: string) => {
        currentRule.setDomain(e);
        setRule({ rule: currentRule });
        if (e) {
            setErrors({ ...errors, domain: undefined });
        }
    };

    const contentOptions = buildContentOptions(
        contentModifierEnum as Record<string, string | number>,
        hasAllOption,
    );

    const currentContentOptions: IOption<string | number>[] = (
        currentRule.getContentType() as unknown as (string | number)[]
    )
        .map((c) => ({
            value: c,
            label: getLabelByContentModifier(
                c as unknown as BlockContentTypeModifiers,
            ),
        }));

    const onContentChange = (option: IOption<string | number>) => {
        const currentTypes = currentRule.getContentType() as unknown as (string | number)[];
        if (currentTypes.includes(option.value)) {
            currentRule.setContentType(currentTypes.filter((c) => c !== option.value) as any);
        } else {
            currentRule.setContentType([...currentTypes, option.value] as any);
        }
        setRule({ rule: currentRule });
    };

    const onDomainModifierChange = (option: DomainModifiers) => {
        currentRule.setDomainModifiers(option);
        setRule({ rule: currentRule });
    };

    const showDomainsField = currentRule.getDomainModifiers() === DomainModifiers.onlyListed
        || currentRule.getDomainModifiers() === DomainModifiers.allExceptListed;

    const onDomainsChange = (value: string) => {
        const domains = value.split('\n').map((v) => v.trim());
        currentRule.setDomainModifiers(currentRule.getDomainModifiers(), domains);
        setRule({ rule: currentRule });
    };

    const onPriorityChange = (value: boolean) => {
        currentRule.setHighPriority(value);
        setRule({ rule: currentRule });
    };

    const onDomainBlur = (e: string) => {
        if (!e) {
            setErrors({ ...errors, domain: translate('user.rules.fill.field') });
            return;
        }
        if (!validateDomain(e)) {
            setErrors({ ...errors, domain: translate('user.rules.domain.invalid') });
        } else {
            setErrors({ ...errors, domain: undefined });
        }
    };

    const onWebsitesBlur = (e: string) => {
        if (!e) {
            setErrors({ ...errors, websites: translate('user.rules.fill.field') });
        } else {
            setErrors({ ...errors, websites: undefined });
        }
    };

    return (
        <div className={cx(theme.layout.content)}>
            <Input
                key="input"
                autoFocus={shouldFocus}
                className={s.UserRule_input}
                error={!!errors.domain}
                errorMessage={errors.domain}
                id="search"
                label={domainLabelKey}
                placeholder="example.com"
                value={currentRule.getDomain()}
                allowClear
                onBlur={onDomainBlur}
                onChange={onDomainChange}
            />
            <div className={s.UserRule_input}>
                <Dropdown
                    currentValue={currentContentOptions}
                    id="type"
                    itemList={contentOptions}
                    label={contentLabelKey}
                    onChange={onContentChange}
                />
            </div>
            <div className={s.UserRule_input}>
                <Select<DomainModifiers>
                    currentValue={currentRule.getDomainModifiers()}
                    id="type"
                    itemList={getDomainOptions()}
                    label={translate('user.rule.apply.websites.label')}
                    onChange={onDomainModifierChange}
                />
            </div>
            {showDomainsField && (
                <Textarea
                    key="textarea"
                    className={cx(s.UserRule_input, s.UserRule_textarea)}
                    error={!!errors.websites}
                    errorMessage={errors.websites}
                    id="domainModifierDomains"
                    placeholder="example.com"
                    textAreaClassName={s.UserRule_textarea}
                    value={currentRule.getDomainModifiersDomains().join('\n')}
                    onBlur={onWebsitesBlur}
                    onChange={onDomainsChange}
                />
            )}
            <Checkbox
                checked={currentRule.getHighPriority()}
                className={cx(s.UserRule_input, s.UserRule_checkbox)}
                onChange={onPriorityChange}
            >
                <Text type="t1">
                    {translate('user.rule.priority')}
                </Text>
            </Checkbox>
        </div>
    );
}
