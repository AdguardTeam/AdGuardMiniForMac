// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Textarea } from 'Common/components';
import theme from 'Theme';

import s from '../UserRule.module.pcss';

import type { FormErrors } from '../UserRule';
import type { Comment } from '@adguard/rules-editor';

type CommentFormProps = {
    // Comment form builder
    rule: { rule: Comment };
    // Setter for rule
    setRule(rule: { rule: Comment }): void;
    // Form errors
    errors: FormErrors;
    // Form errors setter
    setErrors(err: FormErrors): void;
};

/**
 *  Form for comment
 */
export function CommentForm({ rule, setRule, errors, setErrors }: CommentFormProps) {
    const currentRule = rule.rule;

    const onRuleChange = (e: string) => {
        currentRule.setText(e);
        setRule({ rule: currentRule });
    };

    const onBlur = (e: string) => {
        if (!e) {
            setErrors({ ...errors, comment: translate('user.rules.fill.field') });
        } else {
            setErrors({ ...errors, comment: undefined });
        }
    };

    return (
        <div className={cx(theme.layout.content)}>
            <Textarea
                key="textarea"
                className={s.UserRule_input}
                error={!!errors.comment}
                errorMessage={errors.comment}
                id="domainModifierDomains"
                textAreaClassName={s.UserRule_textarea}
                value={currentRule.getText()}
                onBlur={onBlur}
                onChange={onRuleChange}
            />
        </div>
    );
}
