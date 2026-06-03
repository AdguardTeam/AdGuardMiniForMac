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
 * Content modifier key map shared by block and unblock content modifiers.
 * Keys are the string values of the enum members.
 */
const CONTENT_MODIFIER_KEY_MAP: Record<string, string> = {
    webpages: translate('user.rule.content.webpages'),
    images: translate('user.rule.content.images'),
    css: translate('user.rule.content.css'),
    scripts: translate('user.rule.content.scripts'),
    fonts: translate('user.rule.content.fonts'),
    media: translate('user.rule.content.media'),
    xmlhttprequest: translate('user.rule.content.xmlhttprequest'),
    other: translate('user.rule.content.other'),
};

/**
 * Returns the human-readable label for a content modifier.
 * Works for both BlockContentTypeModifiers and UnblockContentTypeModifier.
 *
 * @param type The content modifier enum value.
 * @returns The translated label for the modifier.
 */
export function getLabelByContentModifier(
    type: BlockContentTypeModifiers | UnblockContentTypeModifier,
): string {
    if (type === BlockContentTypeModifiers.all) {
        return translate('user.rule.content.all');
    }
    return CONTENT_MODIFIER_KEY_MAP[type as string]
        || translate('user.rule.content.other');
}

/**
 * @deprecated Use {@link getLabelByContentModifier} instead.
 */
export function getLabelByBlockContentModifier(type: BlockContentTypeModifiers): string {
    return getLabelByContentModifier(type);
}

/**
 * @deprecated Use {@link getLabelByContentModifier} instead.
 */
export function getLabelByUnblockContentModifier(type: UnblockContentTypeModifier): string {
    return getLabelByContentModifier(type);
}

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
 * Generic builder for content modifier option arrays.
 *
 * @param modifiersEnum The enum object with modifier values.
 * @param includeAll Whether to include the "All" option (block only).
 * @returns Array of options for the dropdown.
 */
export function buildContentOptions<T extends string | number>(
    modifiersEnum: Record<string, T>,
    includeAll: boolean,
): IOption<T>[] {
    const options: IOption<T>[] = [];
    for (const key of Object.keys(modifiersEnum)) {
        const value = modifiersEnum[key];
        // Skip numeric reverse mappings from TypeScript enums
        if (typeof value === 'number' && isNaN(Number(key))) {
            continue;
        }
        // For block: skip "all" in main loop, prepend it later
        if (includeAll && value === (BlockContentTypeModifiers.all as unknown as T)) {
            continue;
        }
        options.push({
            value,
            label: getLabelByContentModifier(
                value as unknown as BlockContentTypeModifiers,
            ),
        });
    }
    if (includeAll) {
        options.unshift({
            value: BlockContentTypeModifiers.all as unknown as T,
            label: getLabelByContentModifier(BlockContentTypeModifiers.all),
        });
    }
    // Deduplicate by value (numeric enums produce duplicate entries)
    const seen = new Set<T>();
    return options.filter((opt) => {
        if (seen.has(opt.value)) {
            return false;
        }
        seen.add(opt.value);
        return true;
    });
}

/**
 * @deprecated Use {@link buildContentOptions}(BlockContentTypeModifiers, true) instead.
 */
export function getContentBlockOptions(): IOption<BlockContentTypeModifiers>[] {
    return buildContentOptions(BlockContentTypeModifiers, true);
}

/**
 * @deprecated Use {@link buildContentOptions}(UnblockContentTypeModifier, false) instead.
 */
export function getContentUnblockOptions(): IOption<UnblockContentTypeModifier>[] {
    return buildContentOptions(UnblockContentTypeModifier, false);
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
                case 'block':
                    break;
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
                case 'unblock':
                    break;
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
                case 'noFiltering':
                    break;
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
