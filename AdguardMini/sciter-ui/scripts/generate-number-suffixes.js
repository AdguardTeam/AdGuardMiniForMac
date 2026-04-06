// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * One-time dev script to extract compact suffixes and separator data from
 * Node.js Intl.NumberFormat (CLDR). Output is pasted into rules.ts.
 *
 * Run: node AdguardMini/sciter-ui/scripts/generate-number-suffixes.js
 */

const WESTERN_DIVISORS = [1_000_000, 1_000_000_000, 1_000_000_000_000];
const INDIAN_DIVISORS = [100_000, 10_000_000, 1_000_000_000, 100_000_000_000];
const JA_DIVISORS = [10_000, 100_000_000, 1_000_000_000_000];
const KO_DIVISORS = [10_000, 100_000_000, 1_000_000_000_000];
const ZH_CN_DIVISORS = [10_000, 100_000_000, 1_000_000_000_000];
const ZH_TW_DIVISORS = [10_000, 100_000_000, 1_000_000_000_000];

const NUMBER_PART_TYPES = new Set([
    'integer', 'group', 'decimal', 'fraction', 'minusSign', 'plusSign',
]);

function extractCompactSuffix(locale, divisor) {
    const fmt = new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short',
        maximumFractionDigits: 0,
        useGrouping: false,
    });
    const parts = fmt.formatToParts(divisor);
    let numberStarted = false;
    let prefix = '';
    let suffix = '';
    for (const part of parts) {
        if (!numberStarted && NUMBER_PART_TYPES.has(part.type)) {
            numberStarted = true;
            continue;
        }
        if (numberStarted && NUMBER_PART_TYPES.has(part.type)) continue;
        if (!numberStarted) prefix += part.value;
        else suffix += part.value;
    }
    return suffix || '';
}

function extractSeparators(locale) {
    // Thousands separator from 1,234
    const groupFmt = new Intl.NumberFormat(locale, { useGrouping: true });
    const groupParts = groupFmt.formatToParts(1234);
    let thousands = ',';
    for (const p of groupParts) {
        if (p.type === 'group') { thousands = p.value; break; }
    }

    // Decimal separator from 1.5
    const decFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 1 });
    const decParts = decFmt.formatToParts(1.5);
    let decimal = '.';
    for (const p of decParts) {
        if (p.type === 'decimal') { decimal = p.value; break; }
    }

    return { thousands, decimal };
}

function escapeTS(str) {
    return str
        .replace(/\u00A0/g, '\\u00A0')
        .replace(/\u202F/g, '\\u202F')
        .replace(/\u200F/g, '\\u200F');
}

// Locale configs: [ruleId, intlLocale, system, aliases, direction]
const LOCALES = [
    ['ar', 'ar', 'western', "['ar_ae', 'ar_eg', 'ar_sa']", 'rtl'],
    ['be', 'be', 'western', '[]', 'ltr'],
    ['cs', 'cs', 'western', '[]', 'ltr'],
    ['da', 'da', 'western', '[]', 'ltr'],
    ['de', 'de', 'western', '[]', 'ltr'],
    ['el', 'el', 'western', '[]', 'ltr'],
    ['en', 'en', 'western', "['en_us', 'en_gb']", 'ltr'],
    ['en_in', 'en-IN', 'indian', "['en_in', 'en-in', 'hi_in']", 'ltr'],
    ['es', 'es', 'western', '[]', 'ltr'],
    ['fa', 'fa', 'western', "['fa_ir']", 'rtl'],
    ['fi', 'fi', 'western', '[]', 'ltr'],
    ['fr', 'fr', 'western', '[]', 'ltr'],
    ['he', 'he', 'western', "['he_il']", 'rtl'],
    ['hr', 'hr', 'western', '[]', 'ltr'],
    ['hu', 'hu', 'western', '[]', 'ltr'],
    ['id', 'id', 'western', '[]', 'ltr'],
    ['it', 'it', 'western', '[]', 'ltr'],
    ['ja', 'ja', 'ja', '[]', 'ltr'],
    ['ko', 'ko', 'ko', '[]', 'ltr'],
    ['nb', 'nb', 'western', "['nb_no', 'no']", 'ltr'],
    ['nl', 'nl', 'western', '[]', 'ltr'],
    ['pl', 'pl', 'western', '[]', 'ltr'],
    ['pt_br', 'pt-BR', 'western', "['pt_br', 'pt-br']", 'ltr'],
    ['pt_pt', 'pt-PT', 'western', "['pt_pt', 'pt-pt']", 'ltr'],
    ['ro', 'ro', 'western', '[]', 'ltr'],
    ['ru', 'ru', 'western', '[]', 'ltr'],
    ['sk', 'sk', 'western', '[]', 'ltr'],
    ['sl', 'sl', 'western', '[]', 'ltr'],
    ['sr', 'sr-Latn', 'western', "['sr_latn', 'sr-latn', 'sr_rs']", 'ltr'],
    ['sv', 'sv', 'western', '[]', 'ltr'],
    ['th', 'th', 'western', '[]', 'ltr'],
    ['tr', 'tr', 'western', '[]', 'ltr'],
    ['uk', 'uk', 'western', '[]', 'ltr'],
    ['vi', 'vi', 'western', '[]', 'ltr'],
    ['zh_cn', 'zh-Hans', 'zh_cn', "['zh_cn', 'zh-cn', 'zh_hans', 'zh-hans', 'zh_hans_cn', 'zh-hans-cn']", 'ltr'],
    ['zh_tw', 'zh-Hant', 'zh_tw', "['zh_tw', 'zh-tw', 'zh_hant', 'zh-hant', 'zh_hant_tw', 'zh-hant-tw']", 'ltr'],
];

const SYSTEM_DIVISORS = {
    western: WESTERN_DIVISORS,
    indian: INDIAN_DIVISORS,
    ja: JA_DIVISORS,
    ko: KO_DIVISORS,
    zh_cn: ZH_CN_DIVISORS,
    zh_tw: ZH_TW_DIVISORS,
};

console.log('=== Compact suffixes and separators for rules.ts ===\n');

for (const [id, intlLocale, system] of LOCALES) {
    const divisors = SYSTEM_DIVISORS[system];
    const sep = extractSeparators(intlLocale);
    const suffixes = {};
    for (const d of divisors) {
        suffixes[d] = extractCompactSuffix(intlLocale, d);
    }

    console.log(`// ${id} (${intlLocale})`);
    console.log(`//   thousands: '${escapeTS(sep.thousands)}'  decimal: '${escapeTS(sep.decimal)}'`);
    for (const [d, s] of Object.entries(suffixes)) {
        console.log(`//   ${d}: '${escapeTS(s)}'`);
    }
    console.log('');
}
