// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { CompactUnitsBySystem, NotationSystem, NumberLocaleRule } from './types';

/**
 * Numbers below this threshold use grouped (full) formatting;
 * numbers at or above use compact notation.
 */
export const COMPACT_THRESHOLD = 1_000_000;

const DEFAULT_GROUPING = [3];
const INDIAN_GROUPING = [3, 2];

// Persian (Extended Arabic-Indic) digit map: index = Western digit value
const FA_DIGIT_MAP = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Compact unit divisors per notation system.
 * Arrays are in descending order by divisor.
 */
export const COMPACT_UNITS_BY_SYSTEM: CompactUnitsBySystem = {
    western: [
        { divisor: 1_000_000_000_000 },
        { divisor: 1_000_000_000 },
        { divisor: 1_000_000 },
    ],
    indian: [
        { divisor: 100_000_000_000 },
        { divisor: 1_000_000_000 },
        { divisor: 10_000_000 },
        { divisor: 100_000 },
    ],
    ja: [
        { divisor: 1_000_000_000_000 },
        { divisor: 100_000_000 },
        { divisor: 10_000 },
    ],
    ko: [
        { divisor: 1_000_000_000_000 },
        { divisor: 100_000_000 },
        { divisor: 10_000 },
    ],
    zh_cn: [
        { divisor: 1_000_000_000_000 },
        { divisor: 100_000_000 },
        { divisor: 10_000 },
    ],
    zh_tw: [
        { divisor: 1_000_000_000_000 },
        { divisor: 100_000_000 },
        { divisor: 10_000 },
    ],
};

/**
 * Helper to create a locale rule with sensible defaults.
 */
function createRule(
    id: string,
    notationSystem: NotationSystem,
    compactSuffixes: Record<number, string>,
    options: {
        aliases?: string[];
        groupingPattern?: number[];
        thousandsSeparator?: string;
        decimalSeparator?: string;
        direction?: 'ltr' | 'rtl';
        digitMap?: string[];
    } = {},
): NumberLocaleRule {
    return {
        id,
        aliases: options.aliases ?? [],
        notationSystem,
        groupingPattern: options.groupingPattern ?? DEFAULT_GROUPING,
        thousandsSeparator: options.thousandsSeparator ?? ',',
        decimalSeparator: options.decimalSeparator ?? '.',
        direction: options.direction ?? 'ltr',
        digitMap: options.digitMap,
        compactSuffixes,
    };
}

// Compact suffixes extracted from CLDR (via Intl.NumberFormat).
// Spaces are regular ASCII 0x20 for rendering consistency in Sciter.

/* eslint-disable @typescript-eslint/naming-convention */
export const NUMBER_LOCALE_RULES: Record<string, NumberLocaleRule> = {
    ar: createRule('ar', 'western', {
        // RLM (\u200F) is included in suffixes for correct bidi rendering
        [1_000_000]: ' مليون\u200F',
        [1_000_000_000]: ' مليار\u200F',
        [1_000_000_000_000]: ' ترليون\u200F',
    }, {
        aliases: ['ar_ae', 'ar_eg', 'ar_sa'],
        direction: 'rtl',
    }),

    be: createRule('be', 'western', {
        [1_000_000]: ' млн',
        [1_000_000_000]: ' млрд',
        [1_000_000_000_000]: ' трлн',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    cs: createRule('cs', 'western', {
        [1_000_000]: ' mil.',
        [1_000_000_000]: ' mld.',
        [1_000_000_000_000]: ' bil.',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    da: createRule('da', 'western', {
        [1_000_000]: ' mio.',
        [1_000_000_000]: ' mia.',
        [1_000_000_000_000]: ' bio.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    de: createRule('de', 'western', {
        [1_000_000]: ' Mio.',
        [1_000_000_000]: ' Mrd.',
        [1_000_000_000_000]: ' Bio.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    el: createRule('el', 'western', {
        [1_000_000]: ' εκ.',
        [1_000_000_000]: ' δισ.',
        [1_000_000_000_000]: ' τρισ.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    en: createRule('en', 'western', {
        [1_000_000]: 'M',
        [1_000_000_000]: 'B',
        [1_000_000_000_000]: 'T',
    }, {
        aliases: ['en_us', 'en_gb'],
    }),

    en_in: createRule('en_in', 'indian', {
        [100_000]: 'L',
        [10_000_000]: 'Cr',
        [1_000_000_000]: 'Arab',
        [100_000_000_000]: 'Kharab',
    }, {
        aliases: ['en_in', 'en-in', 'hi_in'],
        groupingPattern: INDIAN_GROUPING,
    }),

    es: createRule('es', 'western', {
        // CLDR uses ' M' (millions) for both million and billion ranges.
        // For billions we use ' mil M' ("mil millones" abbreviated) to avoid
        // 4-digit numbers before the suffix (e.g. "1234 M" → "1,2 mil M").
        [1_000_000]: ' M',
        [1_000_000_000]: ' mil M',
        [1_000_000_000_000]: ' B',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    fa: createRule('fa', 'western', {
        [1_000_000]: ' میلیون',
        [1_000_000_000]: ' میلیارد',
        [1_000_000_000_000]: ' تریلیون',
    }, {
        aliases: ['fa_ir'],
        thousandsSeparator: '٬',
        decimalSeparator: '٫',
        direction: 'rtl',
        digitMap: FA_DIGIT_MAP,
    }),

    fi: createRule('fi', 'western', {
        [1_000_000]: ' milj.',
        [1_000_000_000]: ' mrd.',
        [1_000_000_000_000]: ' bilj.',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    fr: createRule('fr', 'western', {
        [1_000_000]: ' M',
        [1_000_000_000]: ' Md',
        [1_000_000_000_000]: ' Bn',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    he: createRule('he', 'western', {
        // RLM (\u200F) is included in suffixes for correct bidi rendering
        [1_000_000]: 'M\u200F',
        [1_000_000_000]: 'B\u200F',
        [1_000_000_000_000]: 'T\u200F',
    }, {
        aliases: ['he_il'],
        direction: 'rtl',
    }),

    hr: createRule('hr', 'western', {
        [1_000_000]: ' mil.',
        [1_000_000_000]: ' mlr.',
        [1_000_000_000_000]: ' bil.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    hu: createRule('hu', 'western', {
        [1_000_000]: ' M',
        [1_000_000_000]: ' Mrd',
        [1_000_000_000_000]: ' B',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    id: createRule('id', 'western', {
        [1_000_000]: ' jt',
        [1_000_000_000]: ' M',
        [1_000_000_000_000]: ' T',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    it: createRule('it', 'western', {
        [1_000_000]: ' Mln',
        [1_000_000_000]: ' Mld',
        [1_000_000_000_000]: ' Bln',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    ja: createRule('ja', 'ja', {
        [10_000]: '万',
        [100_000_000]: '億',
        [1_000_000_000_000]: '兆',
    }),

    ko: createRule('ko', 'ko', {
        [10_000]: '만',
        [100_000_000]: '억',
        [1_000_000_000_000]: '조',
    }),

    nb: createRule('nb', 'western', {
        [1_000_000]: ' mill.',
        [1_000_000_000]: ' mrd.',
        [1_000_000_000_000]: ' bill.',
    }, {
        aliases: ['nb_no', 'no'],
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    nl: createRule('nl', 'western', {
        [1_000_000]: ' mln.',
        [1_000_000_000]: ' mld.',
        [1_000_000_000_000]: ' bln.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    pl: createRule('pl', 'western', {
        [1_000_000]: ' mln',
        [1_000_000_000]: ' mld',
        [1_000_000_000_000]: ' bln',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    pt_br: createRule('pt_br', 'western', {
        [1_000_000]: ' mi',
        [1_000_000_000]: ' bi',
        [1_000_000_000_000]: ' tri',
    }, {
        aliases: ['pt_br', 'pt-br'],
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    pt_pt: createRule('pt_pt', 'western', {
        [1_000_000]: ' M',
        [1_000_000_000]: ' mM',
        [1_000_000_000_000]: ' Bi',
    }, {
        aliases: ['pt_pt', 'pt-pt'],
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    ro: createRule('ro', 'western', {
        [1_000_000]: ' mil.',
        [1_000_000_000]: ' mld.',
        [1_000_000_000_000]: ' tril.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    ru: createRule('ru', 'western', {
        [1_000_000]: ' млн',
        [1_000_000_000]: ' млрд',
        [1_000_000_000_000]: ' трлн',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    sk: createRule('sk', 'western', {
        [1_000_000]: ' mil.',
        [1_000_000_000]: ' mld.',
        [1_000_000_000_000]: ' bil.',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    sl: createRule('sl', 'western', {
        [1_000_000]: ' mio.',
        [1_000_000_000]: ' mrd.',
        [1_000_000_000_000]: ' bil.',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    sr: createRule('sr', 'western', {
        [1_000_000]: ' mil.',
        [1_000_000_000]: ' mlrd.',
        [1_000_000_000_000]: ' bil.',
    }, {
        aliases: ['sr_latn', 'sr-latn', 'sr_rs'],
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    sv: createRule('sv', 'western', {
        [1_000_000]: ' mn',
        [1_000_000_000]: ' md',
        [1_000_000_000_000]: ' bn',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    th: createRule('th', 'western', {
        [1_000_000]: 'M',
        [1_000_000_000]: 'B',
        [1_000_000_000_000]: 'T',
    }),

    tr: createRule('tr', 'western', {
        [1_000_000]: ' Mn',
        [1_000_000_000]: ' Mr',
        [1_000_000_000_000]: ' Tn',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    uk: createRule('uk', 'western', {
        [1_000_000]: ' млн',
        [1_000_000_000]: ' млрд',
        [1_000_000_000_000]: ' трлн',
    }, {
        thousandsSeparator: ' ',
        decimalSeparator: ',',
    }),

    vi: createRule('vi', 'western', {
        [1_000_000]: ' Tr',
        [1_000_000_000]: ' T',
        [1_000_000_000_000]: ' NT',
    }, {
        thousandsSeparator: '.',
        decimalSeparator: ',',
    }),

    zh_cn: createRule('zh_cn', 'zh_cn', {
        [10_000]: '万',
        [100_000_000]: '亿',
        [1_000_000_000_000]: '万亿',
    }, {
        aliases: ['zh_cn', 'zh-cn', 'zh_hans', 'zh-hans', 'zh_hans_cn', 'zh-hans-cn'],
    }),

    zh_tw: createRule('zh_tw', 'zh_tw', {
        [10_000]: '萬',
        [100_000_000]: '億',
        [1_000_000_000_000]: '兆',
    }, {
        aliases: ['zh_tw', 'zh-tw', 'zh_hant', 'zh-hant', 'zh_hant_tw', 'zh-hant-tw'],
    }),
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Canonical locale IDs for all project-supported locales
 * (matches .twosky.json keys + en_in).
 */
export const PROJECT_NUMBER_LOCALE_IDS: string[] = Object.keys(NUMBER_LOCALE_RULES);
