// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Input, Dropdown, Checkbox, Text } from 'Common/components';
import theme from 'Theme';

import s from '../UserRule.module.pcss';

import { getExceptionOptions, getLabelByExceptionModifier, validateDomain } from './helpers';

import type { FormErrors } from '../UserRule';
import type { ExceptionSelectModifiers, NoFilteringRule } from '@adguard/rules-editor';
import type { IOption } from 'Common/components';

type DisableFilteringFormProps = {
    // NoFilteringRule form builder
    rule: { rule: NoFilteringRule };
    // Setter for rule
    setRule(rule: { rule: NoFilteringRule }): void;
    // Form errors
    errors: FormErrors;
    // Form errors setter
    setErrors(err: FormErrors): void;
};

/**
 * Form for Disable filtering rule
 */
export function DisableFilteringForm({ rule, setRule, errors, setErrors }: DisableFilteringFormProps) {
    const currentRule = rule.rule;

    const onDomainChange = (e: string) => {
        currentRule.setDomain(e);
        setRule({ rule: currentRule });
    };

    const currentContentOptions: IOption<ExceptionSelectModifiers>[] = currentRule.getContentType()
        .map((c) => ({ value: c, label: getLabelByExceptionModifier(c) }));

    const onContentChange = (option: IOption<ExceptionSelectModifiers>) => {
        const currentTypes = currentRule.getContentType();
        if (currentTypes.includes(option.value)) {
            currentRule.setContentType(currentTypes.filter((c) => c !== option.value));
        } else {
            currentRule.setContentType([...currentTypes, option.value]);
        }
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

    return (
        <div className={cx(theme.layout.content)}>
            <Input
                key="input"
                className={s.UserRule_input}
                error={!!errors.domain}
                errorMessage={errors.domain}
                id="search"
                label={translate('website')}
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
                    itemList={getExceptionOptions()}
                    label={translate('user.rule.filtering.options')}
                    onChange={onContentChange}
                />
            </div>
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
