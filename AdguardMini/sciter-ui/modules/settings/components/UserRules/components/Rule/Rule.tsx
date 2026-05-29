// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { propagationStopper } from '@adg/sciter-utils-kit';
import { RulesBuilder } from '@adguard/rules-editor';

import { TooltipArea } from 'Modules/settings/components/Tooltip';
import theme from 'Theme';
import { Checkbox, RuleHighlighter, Button } from 'UILib';

import { getDescriptionByType, getIconByType } from '../helpers';

import s from './Rule.module.pcss';

export type RuleProps = {
    rule: { rule: string; enabled: boolean; index: number };
    onRuleStateUpdate(index: number, state: boolean): void;
    onEdit(index: number): void;
    onDelete(index: number): void;
    muted?: boolean;
};

/**
 * User rule line in User rules page;
 */
export function Rule({
    rule,
    muted,
    onRuleStateUpdate,
    onDelete,
    onEdit,
}: RuleProps) {
    const type = RulesBuilder.getRuleType(rule.rule);

    return (
        <div className={s.rule}>
            {type !== 'comment' ? (
                <Checkbox
                    checked={rule.enabled}
                    className={s.check}
                    muted={muted}
                    testId={`settings-user-rules-rule-${rule.index}-checkbox`}
                    onChange={(e) => onRuleStateUpdate(rule.index, e)}
                />
            ) : (
                <div className={cx(s.check)} />
            )}
            <TooltipArea
                className={s.UserRule_type}
                tooltip={getDescriptionByType(type)}
                onContextMenu={propagationStopper}
            >
                {getIconByType(type, s.icon, muted)}
            </TooltipArea>
            <div className={cx(s.text, theme.typo.t2)} title={rule.rule} onDblClick={() => onEdit(rule.index)}>
                <RuleHighlighter rule={rule.rule} />
            </div>
            <Button testId={`settings-user-rules-rule-${rule.index}-edit`} className={cx(theme.button.greenIcon, s.button)} icon="edit" type="icon" onClick={() => onEdit(rule.index)} />
            <Button testId={`settings-user-rules-rule-${rule.index}-delete`} className={cx(theme.button.redIcon, s.button)} icon="trash" type="icon" onClick={() => onDelete(rule.index)} />
        </div>
    );
}
