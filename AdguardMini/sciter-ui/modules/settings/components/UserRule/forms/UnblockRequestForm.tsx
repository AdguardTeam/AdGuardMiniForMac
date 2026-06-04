// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { DomainModifiers } from '@adguard/rules-editor';

import { Input, Dropdown, Textarea, Checkbox, Text, Select } from 'Common/components';
import theme from 'Theme';

import s from '../UserRule.module.pcss';

import { getDomainOptions, getContentUnblockOptions, getLabelByUnblockContentModifier, validateDomain } from './helpers';

import type { FormErrors } from '../UserRule';
import type { UnblockContentTypeModifier, UnblockRequestRule } from '@adguard/rules-editor';
import type { IOption } from 'Common/components';

type UnblockRequestFormProps = {
    // UnblockRequestRule form builder
    rule: { rule: UnblockRequestRule };
    // Setter for rule
    setRule(rule: { rule: UnblockRequestRule }): void;
    // Form errors
    errors: FormErrors;
    // Form errors setter
    setErrors(err: FormErrors): void;
    // If form should autofocus (bug with input value not appear until focus)
    shouldFocus: boolean;
};

/**
 * Form for Unblock request rule
 */
export function UnblockRequestForm({ rule, setRule, errors, setErrors, shouldFocus }: UnblockRequestFormProps) {
    const currentRule = rule.rule as UnblockRequestRule;

    const onDomainChange = (e: string) => {
        currentRule.setDomain(e);
        setRule({ rule: currentRule });
    };

    const currentContentOptions: IOption<UnblockContentTypeModifier>[] = currentRule.getContentType()
        .map((c) => ({ value: c, label: getLabelByUnblockContentModifier(c) }));

    const onContentChange = (option: IOption<UnblockContentTypeModifier>) => {
        const currentTypes = currentRule.getContentType();
        if (currentTypes.includes(option.value)) {
            currentRule.setContentType(currentTypes.filter((c) => c !== option.value));
        } else {
            currentRule.setContentType([...currentTypes, option.value]);
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
                label={translate('user.rule.unblock.domain.label')}
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
                    itemList={getContentUnblockOptions()}
                    label={translate('user.rule.unblock.content.label')}
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
                    className={s.UserRule_input}
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
