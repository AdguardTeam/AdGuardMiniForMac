// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { COMPACT_THRESHOLD, COMPACT_UNITS_BY_SYSTEM, NUMBER_LOCALE_RULES, PROJECT_NUMBER_LOCALE_IDS } from './rules';

import type { CompactUnit, NumberLocaleRule } from './types';

// --- Locale resolution ---

/**
 * Map from every known locale code (canonical + aliases) to a canonical rule id.
 */
const localeAliasMap = new Map<string, string>();

for (const rule of Object.values(NUMBER_LOCALE_RULES)) {
    localeAliasMap.set(rule.id, rule.id);
    for (const alias of rule.aliases) {
        localeAliasMap.set(alias, rule.id);
    }
}

/**
 * Normalize a language code: lowercase and replace hyphens with underscores.
 */
export function normalizeNumberLocale(languageCode: string): string {
    return languageCode.trim().toLowerCase().replace(/-/g, '_');
}

/**
 * Resolve a language code to a canonical NumberLocaleRule.
 * Tries exact match, then base subtag, then falls back to English.
 */
export function resolveNumberLocale(languageCode: string): NumberLocaleRule {
    const normalized = normalizeNumberLocale(languageCode || 'en');

    // Exact match (canonical id or alias)
    const exactId = localeAliasMap.get(normalized);
    if (exactId) {
        return NUMBER_LOCALE_RULES[exactId];
    }

    // Base subtag fallback (e.g. "fr_ca" → "fr")
    const baseLocale = normalized.split('_')[0];
    const baseId = localeAliasMap.get(baseLocale);
    if (baseId) {
        return NUMBER_LOCALE_RULES[baseId];
    }

    return NUMBER_LOCALE_RULES.en;
}

// --- Value normalization ---

/**
 * Clamp non-finite values to 0 and round fractional values to integers.
 */
function normalizeNumericValue(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Number.isInteger(value) ? value : Math.round(value);
}

// --- Grouped formatting (below compact threshold) ---

/**
 * Apply digit grouping to an integer string.
 * `pattern` defines group sizes from right to left.
 * The last element repeats for remaining digits.
 */
function applyGrouping(digits: string, pattern: number[], separator: string): string {
    if (digits.length <= pattern[0]) {
        return digits;
    }

    const groups: string[] = [];
    let cursor = digits.length;
    let patternIndex = 0;

    while (cursor > 0) {
        const groupSize = pattern[Math.min(patternIndex, pattern.length - 1)];
        const start = Math.max(cursor - groupSize, 0);
        groups.unshift(digits.slice(start, cursor));
        cursor = start;
        patternIndex += 1;
    }

    return groups.join(separator);
}

/**
 * Substitute Western ASCII digits with locale-specific digits.
 */
function applyDigitMap(formatted: string, digitMap: string[]): string {
    let result = '';
    for (let i = 0; i < formatted.length; i++) {
        const code = formatted.charCodeAt(i);
        // ASCII digits 0x30..0x39
        if (code >= 0x30 && code <= 0x39) {
            result += digitMap[code - 0x30];
        } else {
            result += formatted[i];
        }
    }
    return result;
}

/**
 * Format a number below the compact threshold with digit grouping.
 */
function formatGroupedNumber(value: number, rule: NumberLocaleRule): string {
    const absValue = Math.abs(Math.trunc(value));
    const grouped = applyGrouping(absValue.toString(), rule.groupingPattern, rule.thousandsSeparator);
    const signed = value < 0 ? `-${grouped}` : grouped;

    return rule.digitMap ? applyDigitMap(signed, rule.digitMap) : signed;
}

// --- Compact formatting (at or above compact threshold) ---

function roundToSingleDecimal(value: number): number {
    return Math.round(value * 10) / 10;
}

function floorToSingleDecimal(value: number): number {
    return Math.floor(value * 10) / 10;
}

/**
 * Select the appropriate compact unit for a value.
 * Skips units that have no suffix defined for this locale.
 */
function selectCompactUnit(
    absoluteValue: number,
    units: CompactUnit[],
    rule: NumberLocaleRule,
): CompactUnit | undefined {
    for (const unit of units) {
        if (absoluteValue >= unit.divisor && rule.compactSuffixes[unit.divisor] !== undefined) {
            return unit;
        }
    }
    return undefined;
}

/**
 * Compute the compact value, preventing rounding that would cross
 * into the next higher compact unit (FR-017).
 */
function getCompactValue(
    absoluteValue: number,
    units: CompactUnit[],
    selectedUnit: CompactUnit,
    rule: NumberLocaleRule,
): number {
    const rawCompact = absoluteValue / selectedUnit.divisor;
    const rounded = roundToSingleDecimal(rawCompact);

    // Find the next higher unit that has a suffix for this locale
    const selectedIndex = units.indexOf(selectedUnit);
    let higherUnit: CompactUnit | undefined;
    for (let i = selectedIndex - 1; i >= 0; i--) {
        if (rule.compactSuffixes[units[i].divisor] !== undefined) {
            higherUnit = units[i];
            break;
        }
    }

    if (higherUnit && rounded >= higherUnit.divisor / selectedUnit.divisor) {
        return floorToSingleDecimal(rawCompact);
    }

    return rounded;
}

/**
 * Format a number at or above the compact threshold.
 */
function formatCompactNumber(value: number, rule: NumberLocaleRule): string {
    const absoluteValue = Math.abs(value);
    const units = COMPACT_UNITS_BY_SYSTEM[rule.notationSystem];

    const selectedUnit = selectCompactUnit(absoluteValue, units, rule);
    if (!selectedUnit) {
        // Fallback: format as grouped if no compact unit matches
        return formatGroupedNumber(value, rule);
    }

    const compactValue = getCompactValue(absoluteValue, units, selectedUnit, rule);
    const isInteger = Number.isInteger(compactValue);
    const sign = value < 0 ? '-' : '';

    let numericPart: string;
    if (isInteger) {
        numericPart = compactValue.toString();
    } else {
        // Format with locale decimal separator
        const intPart = Math.trunc(compactValue).toString();
        const fracPart = Math.round((compactValue - Math.trunc(compactValue)) * 10).toString();
        numericPart = `${intPart}${rule.decimalSeparator}${fracPart}`;
    }

    const suffix = rule.compactSuffixes[selectedUnit.divisor];
    let result = `${sign}${numericPart}${suffix}`;

    if (rule.digitMap) {
        result = applyDigitMap(result, rule.digitMap);
    }

    return result;
}

// --- Public API ---

/**
 * Format a number for display using locale-appropriate grouping or compact
 * notation. Numbers below 1,000,000 are digit-grouped; numbers at or above
 * use compact notation with locale-specific suffixes.
 *
 * @param value - The number to format
 * @param languageCode - BCP 47 or underscore-separated language code
 * @returns Formatted string (e.g. "1,234,567" or "1.2M")
 */
export function formatLocalizedNumber(value: number, languageCode: string): string {
    const rule = resolveNumberLocale(languageCode);
    const normalized = normalizeNumericValue(value);
    const absoluteValue = Math.abs(normalized);

    if (absoluteValue < COMPACT_THRESHOLD) {
        return formatGroupedNumber(normalized, rule);
    }

    return formatCompactNumber(normalized, rule);
}

export { COMPACT_THRESHOLD as compactThreshold };
export { PROJECT_NUMBER_LOCALE_IDS as projectSupportedNumberLocales };
