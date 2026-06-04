// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
    BlockContentTypeModifiers,
    UnblockContentTypeModifier,
    DomainModifiers,
    ExceptionSelectModifiers,
    RulesBuilder,
} from '@adguard/rules-editor';
import isValidDomain from 'is-valid-domain';

import { getIconByType } from '../../UserRules/components/helpers';
import s from '../UserRule.module.pcss';

import type { BlockRequestRule, CustomRule, Comment, NoFilteringRule, RuleType, UnblockRequestRule } from '@adguard/rules-editor';
import type { IOption } from 'Common/components';

/**
 * Union type for possible rule types
 */
export type RuleTypeOptions = BlockRequestRule | UnblockRequestRule | Comment | NoFilteringRule | CustomRule;

/**
 * Empty rule for block type
 */
const EMPTY_RULE_BLOCK = '||^';

/**
 * Empty rule for unblock type
 */
const EMPTY_RULE_UNBLOCK = '@@||^';

/**
 * Returns the human-readable label for a given rule type.
 *
 * @param type The rule type.
 * @returns The label for the rule type.
 */
export function getLabelByRuleType(type: RuleType): string {
    switch (type) {
        case 'block':
            return translate('user.rule.block');
        case 'unblock':
            return translate('user.rule.unblock');
        case 'noFiltering':
            return translate('user.rule.noFiltering');
        case 'custom':
            return translate('user.rule.custom');
        case 'comment':
            return translate('user.rule.comment');
    }
};

/**
 * Returns the human-readable label for a given block content modifier.
 *
 * @param type The block content modifier.
 * @returns The label for the block content modifier.
 */
export function getLabelByBlockContentModifier(type: BlockContentTypeModifiers): string {
    switch (type) {
        case BlockContentTypeModifiers.all:
            return translate('user.rule.content.all');
        case BlockContentTypeModifiers.webpages:
            return translate('user.rule.content.webpages');
        case BlockContentTypeModifiers.images:
            return translate('user.rule.content.images');
        case BlockContentTypeModifiers.css:
            return translate('user.rule.content.css');
        case BlockContentTypeModifiers.scripts:
            return translate('user.rule.content.scripts');
        case BlockContentTypeModifiers.fonts:
            return translate('user.rule.content.fonts');
        case BlockContentTypeModifiers.media:
            return translate('user.rule.content.media');
        case BlockContentTypeModifiers.xmlhttprequest:
            return translate('user.rule.content.xmlhttprequest');
        case BlockContentTypeModifiers.other:
            return translate('user.rule.content.other');
    }
};

/**
 * Returns the human-readable label for a given unblock content modifier.
 *
 * @param type The unblock content modifier.
 * @returns The label for the unblock content modifier.
 */
export function getLabelByUnblockContentModifier(type: UnblockContentTypeModifier): string {
    switch (type) {
        case UnblockContentTypeModifier.webpages:
            return translate('user.rule.content.webpages');
        case UnblockContentTypeModifier.images:
            return translate('user.rule.content.images');
        case UnblockContentTypeModifier.css:
            return translate('user.rule.content.css');
        case UnblockContentTypeModifier.scripts:
            return translate('user.rule.content.scripts');
        case UnblockContentTypeModifier.fonts:
            return translate('user.rule.content.fonts');
        case UnblockContentTypeModifier.media:
            return translate('user.rule.content.media');
        case UnblockContentTypeModifier.xmlhttprequest:
            return translate('user.rule.content.xmlhttprequest');
        case UnblockContentTypeModifier.other:
            return translate('user.rule.content.other');
    }
};

/**
 * Returns the human-readable label for a given domain modifier.
 *
 * @param type The domain modifier.
 * @returns The label for the domain modifier.
 */
export function getLabelByDomainModifier(type: DomainModifiers): string {
    switch (type) {
        case DomainModifiers.all:
            return translate('user.rule.domain.all');
        case DomainModifiers.onlyThis:
            return translate('user.rule.domain.onlyThis');
        case DomainModifiers.allOther:
            return translate('user.rule.domain.allOther');
        case DomainModifiers.onlyListed:
            return translate('user.rule.domain.onlyListed');
        case DomainModifiers.allExceptListed:
            return translate('user.rule.domain.allExceptListed');
    }
};

/**
 * Returns the human-readable label for a given exception modifier.
 *
 * @param type The exception modifier.
 * @returns The label for the exception modifier.
 */
export function getLabelByExceptionModifier(type: ExceptionSelectModifiers): string {
    switch (type) {
        case ExceptionSelectModifiers.filtering:
            return translate('user.rule.exception.filtering');
        case ExceptionSelectModifiers.urls:
            return translate('user.rule.exception.urls');
        case ExceptionSelectModifiers.hidingRules:
            return translate('user.rule.exception.hidingRules');
        case ExceptionSelectModifiers.jsAndScriplets:
            return translate('user.rule.exception.jsAndScriplets');
        case ExceptionSelectModifiers.userscripts:
            return translate('user.rule.exception.userscripts');
    }
};

/**
 * Array of options for the rule type select.
 */
export function getTypeOptions(): IOption<RuleType>[] {
    return [
        { value: 'block', label: getLabelByRuleType('block'), optionIcon: getIconByType('block', s.UserRule_selectIcon) },
        { value: 'unblock', label: getLabelByRuleType('unblock'), optionIcon: getIconByType('unblock', s.UserRule_selectIcon) },
        { value: 'noFiltering', label: getLabelByRuleType('noFiltering'), optionIcon: getIconByType('noFiltering', s.UserRule_selectIcon) },
        { value: 'custom', label: getLabelByRuleType('custom'), optionIcon: getIconByType('custom', s.UserRule_selectIcon) },
        { value: 'comment', label: getLabelByRuleType('comment'), optionIcon: getIconByType('comment', s.UserRule_selectIcon) },
    ];
}

/**
 * Array of options for the content block type select.
 */
export function getContentBlockOptions(): IOption<BlockContentTypeModifiers>[] {
    return [
        {
            value: BlockContentTypeModifiers.all,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.all) },
        {
            value: BlockContentTypeModifiers.webpages,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.webpages) },
        {
            value: BlockContentTypeModifiers.images,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.images) },
        {
            value: BlockContentTypeModifiers.css,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.css) },
        {
            value: BlockContentTypeModifiers.scripts,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.scripts) },
        {
            value: BlockContentTypeModifiers.fonts,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.fonts) },
        {
            value: BlockContentTypeModifiers.media,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.media),
        },
        {
            value: BlockContentTypeModifiers.xmlhttprequest,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.xmlhttprequest),
        },
        {
            value: BlockContentTypeModifiers.other,
            label: getLabelByBlockContentModifier(BlockContentTypeModifiers.other),
        },
    ];
}

/**
 * Array of options for the content unblock type select.
 */
export function getContentUnblockOptions(): IOption<UnblockContentTypeModifier>[] {
    return [
        {
            value: UnblockContentTypeModifier.webpages,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.webpages),
        },
        {
            value: UnblockContentTypeModifier.images,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.images),
        },
        {
            value: UnblockContentTypeModifier.css,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.css),
        },
        {
            value: UnblockContentTypeModifier.scripts,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.scripts),
        },
        {
            value: UnblockContentTypeModifier.fonts,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.fonts),
        },
        {
            value: UnblockContentTypeModifier.media,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.media),
        },
        {
            value: UnblockContentTypeModifier.xmlhttprequest,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.xmlhttprequest),
        },
        {
            value: UnblockContentTypeModifier.other,
            label: getLabelByUnblockContentModifier(UnblockContentTypeModifier.other),
        },
    ];
}

/**
 * Array of options for the domain modifier select.
 */
export function getDomainOptions(): IOption<DomainModifiers>[] {
    return [
        {
            value: DomainModifiers.all,
            label: getLabelByDomainModifier(DomainModifiers.all),
        },
        {
            value: DomainModifiers.onlyThis,
            label: getLabelByDomainModifier(DomainModifiers.onlyThis),
        },
        {
            value: DomainModifiers.allOther,
            label: getLabelByDomainModifier(DomainModifiers.allOther),
        },
        {
            value: DomainModifiers.onlyListed,
            label: getLabelByDomainModifier(DomainModifiers.onlyListed),
        },
        {
            value: DomainModifiers.allExceptListed,
            label: getLabelByDomainModifier(DomainModifiers.allExceptListed),
        },
    ];
}

/**
 * Array of options for the exception modifier select.
 */
export function getExceptionOptions(): IOption<ExceptionSelectModifiers>[] {
    return [
        {
            value: ExceptionSelectModifiers.filtering,
            label: getLabelByExceptionModifier(ExceptionSelectModifiers.filtering),
        },
        {
            value: ExceptionSelectModifiers.urls,
            label: getLabelByExceptionModifier(ExceptionSelectModifiers.urls),
        },
        {
            value: ExceptionSelectModifiers.hidingRules,
            label: getLabelByExceptionModifier(ExceptionSelectModifiers.hidingRules),
        },
        {
            value: ExceptionSelectModifiers.jsAndScriplets,
            label: getLabelByExceptionModifier(ExceptionSelectModifiers.jsAndScriplets),
        },
        {
            value: ExceptionSelectModifiers.userscripts,
            label: getLabelByExceptionModifier(ExceptionSelectModifiers.userscripts),
        },
    ];
}

/**
 * Validates a domain.
 *
 * @param domain The domain to validate.
 * @returns True if the domain is valid, false otherwise.
 */
export function validateDomain(domain: string): boolean {
    return isValidDomain(domain, {
        subdomain: true,
        wildcard: true,
        allowUnicode: true,
    });
};

/**
 * Convert rule to another type
 *
 * @param currentRule
 * @param currentType
 * @param newType
 */
export function convertRule(currentRule: RuleTypeOptions, currentType: RuleType, newType: RuleType): RuleTypeOptions {
    let newBuilder: RuleTypeOptions;
    switch (currentType) {
        case 'block': {
            const tempRule = currentRule as BlockRequestRule;
            switch (newType) {
                case 'unblock': {
                    const tRule = RulesBuilder.getRuleByType('unblock');
                    tRule.setDomain(tempRule.getDomain());
                    tRule.setHighPriority(tempRule.getHighPriority());
                    const unblockContentType = tempRule
                        .getContentType()
                        .filter((v) => v !== BlockContentTypeModifiers.all) as unknown as UnblockContentTypeModifier[];
                    tRule.setContentType(unblockContentType);

                    tRule.setDomainModifiers(tempRule.getDomainModifiers(), tempRule.getDomainModifiersDomains());
                    newBuilder = tRule;
                    break;
                }
                case 'comment': {
                    const tRule = RulesBuilder.getRuleByType('comment');
                    const prevRuleText = tempRule.buildRule();
                    tRule.setText(prevRuleText === EMPTY_RULE_BLOCK ? '' : prevRuleText);
                    newBuilder = tRule;
                    break;
                }
                case 'custom': {
                    const tRule = RulesBuilder.getRuleByType('custom');
                    const buildRule = tempRule.buildRule();
                    tRule.setRule(EMPTY_RULE_BLOCK === buildRule ? '' : buildRule);
                    newBuilder = tRule;
                    break;
                }
                case 'noFiltering': {
                    const tRule = RulesBuilder.getRuleByType('noFiltering');
                    tRule.setHighPriority(tempRule.getHighPriority());
                    tRule.setDomain(tempRule.getDomain());
                    newBuilder = tRule;
                    break;
                }
            }
            break;
        }
        case 'unblock': {
            const tempRule = currentRule as UnblockRequestRule;
            switch (newType) {
                case 'block': {
                    const tRule = RulesBuilder.getRuleByType('block');
                    tRule.setHighPriority(tempRule.getHighPriority());
                    tRule.setDomain(tempRule.getDomain());
                    tRule.setContentType(
                        tempRule.getContentType() as unknown as BlockContentTypeModifiers[],
                    );

                    tRule.setDomainModifiers(tempRule.getDomainModifiers(), tempRule.getDomainModifiersDomains());
                    newBuilder = tRule;
                    break;
                }
                case 'comment': {
                    const tRule = RulesBuilder.getRuleByType('comment');
                    const prevRuleText = tempRule.buildRule();
                    tRule.setText(prevRuleText === EMPTY_RULE_UNBLOCK ? '' : prevRuleText);
                    newBuilder = tRule;
                    break;
                }
                case 'custom': {
                    const tRule = RulesBuilder.getRuleByType('custom');
                    const buildRule = tempRule.buildRule();
                    tRule.setRule(EMPTY_RULE_UNBLOCK === buildRule ? '' : buildRule);
                    newBuilder = tRule;
                    break;
                }
                case 'noFiltering': {
                    const tRule = RulesBuilder.getRuleByType('noFiltering');
                    tRule.setHighPriority(tempRule.getHighPriority());
                    tRule.setDomain(tempRule.getDomain());
                    newBuilder = tRule;
                    break;
                }
            }
            break;
        }
        case 'noFiltering': {
            const tempRule = currentRule as NoFilteringRule;
            switch (newType) {
                case 'block': {
                    const tRule = RulesBuilder.getRuleByType('block');
                    tRule.setDomain(tempRule.getDomain());
                    tRule.setHighPriority(tempRule.getHighPriority());
                    newBuilder = tRule;
                    break;
                }
                case 'unblock': {
                    const tRule = RulesBuilder.getRuleByType('unblock');
                    tRule.setDomain(tempRule.getDomain());
                    tRule.setHighPriority(tempRule.getHighPriority());
                    newBuilder = tRule;
                    break;
                }
                case 'comment': {
                    const tRule = RulesBuilder.getRuleByType('comment');
                    const prevRuleText = tempRule.buildRule();
                    tRule.setText(prevRuleText === EMPTY_RULE_UNBLOCK ? '' : prevRuleText);
                    newBuilder = tRule;
                    break;
                }
                case 'custom': {
                    const tRule = RulesBuilder.getRuleByType('custom');
                    const buildRule = tempRule.buildRule();
                    tRule.setRule(EMPTY_RULE_UNBLOCK === buildRule ? '' : buildRule);
                    newBuilder = tRule;
                    break;
                }
            }
            break;
        }
        case 'custom': {
            const tRule = RulesBuilder.getRuleByType(newType);
            newBuilder = tRule as RuleTypeOptions;
            if (newType === 'comment') {
                (tRule as Comment).setText(currentRule.buildRule());
            }
            break;
        }
        case 'comment': {
            const tRule = RulesBuilder.getRuleByType(newType);
            newBuilder = tRule as RuleTypeOptions;
            break;
        }
    }
    return newBuilder!;
};
