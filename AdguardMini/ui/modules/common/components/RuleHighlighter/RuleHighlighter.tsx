// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { simpleTokenizer } from '@adguard/rules-editor';

import s from './RuleHighlighter.module.pcss';

type RuleHighlighterProps = {
    rule: string;
};

/**
 * Highlight special parts of userRule, that is parsed with simple tokenizer from @adguard/rules-editor
 */
export function RuleHighlighter({ rule }: RuleHighlighterProps) {
    const ruleTokens = simpleTokenizer(rule);

    return (
        <>
            {ruleTokens.map(({ token, str }) => (
                <div key={str} className={cx(s.RuleHighlighter_token, token && s[`RuleHighlighter_token__${token}`])}>{str}</div>
            ))}
        </>
    );
}
