// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Input } from 'Common/components';
import theme from 'Theme';

import s from '../UserRule.module.pcss';

import type { FormErrors } from '../UserRule';
import type { CustomRule } from '@adguard/rules-editor';

type CustomRuleFormProps = {
    // CustomRule form builder
    rule: { rule: CustomRule };
    // Setter for rule
    setRule(rule: { rule: CustomRule }): void;
    // Form errors
    errors: FormErrors;
    // Form errors setter
    setErrors(err: FormErrors): void;
};

/**
 * Form for Custom rule
 */
export function CustomRuleForm({ rule, setRule, errors, setErrors }: CustomRuleFormProps) {
    const currentRule = rule.rule as CustomRule;

    const onRuleChange = (e: string) => {
        currentRule.setRule(e);
        setRule({ rule: currentRule });
    };

    const onBlur = (e: string) => {
        if (!e) {
            setErrors({ ...errors, rule: translate('user.rules.fill.field') });
        } else {
            setErrors({ ...errors, rule: undefined });
        }
    };

    return (
        <div className={cx(theme.layout.content)}>
            <Input
                key="input"
                className={s.UserRule_input}
                error={!!errors.rule}
                errorMessage={errors.rule}
                id="customRule"
                label={translate('rule')}
                placeholder="||example.com^"
                value={currentRule.getRule()}
                allowClear
                onBlur={onBlur}
                onChange={onRuleChange}
            />
        </div>
    );
}
