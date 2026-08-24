// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resolveNumberLocale, formatLocalizedNumber, compactThreshold, projectSupportedNumberLocales } from '../../modules/common/lib/number/index';
import { NUMBER_LOCALE_RULES } from '../../modules/common/lib/number/rules';

import twosky from '../../../../.twosky.json';

test('resolves locale aliases to canonical formatter locales', () => {
    assert.equal(resolveNumberLocale('pt-BR').id, 'pt_br');
    assert.equal(resolveNumberLocale('pt_BR').id, 'pt_br');
    assert.equal(resolveNumberLocale('zh-Hans').id, 'zh_cn');
    assert.equal(resolveNumberLocale('zh-Hant').id, 'zh_tw');
    assert.equal(resolveNumberLocale('sr-Latn').id, 'sr');
    assert.equal(resolveNumberLocale('fr-CA').id, 'fr');
    assert.equal(resolveNumberLocale('en-IN').id, 'en_in');
    assert.equal(resolveNumberLocale('unknown').id, 'en');
});

test('covers every locale from TwoSky plus the indian alias', () => {
    const supportedLanguages = Object.keys(twosky[0].languages) as string[];
    const resolvedLocales = supportedLanguages.map(
        (languageCode: string) => resolveNumberLocale(languageCode).id,
    );

    assert.equal(resolvedLocales.length, supportedLanguages.length);
    assert.ok(projectSupportedNumberLocales.includes('zh_cn'));
    assert.ok(projectSupportedNumberLocales.includes('zh_tw'));
    assert.equal(resolveNumberLocale('en-IN').id, 'en_in');
});

test('requires explicit number formatting coverage for each TwoSky language', () => {
    const supportedLanguages = Object.keys(twosky[0].languages) as string[];

    const explicitLocaleInputs = new Set<string>();
    for (const rule of Object.values(NUMBER_LOCALE_RULES)) {
        explicitLocaleInputs.add(rule.id.toLowerCase());
        explicitLocaleInputs.add(rule.id.toLowerCase().replace(/_/g, '-'));
        for (const alias of rule.aliases) {
            explicitLocaleInputs.add(alias.toLowerCase());
            explicitLocaleInputs.add(alias.toLowerCase().replace(/_/g, '-'));
        }
    }
    const missingLanguages = supportedLanguages.filter(
        (languageCode: string) => !explicitLocaleInputs.has(languageCode.toLowerCase()),
    );

    assert.deepEqual(
        missingLanguages,
        [],
        `Missing number locale coverage for TwoSky languages: ${missingLanguages.join(', ')}. `
        + 'Update number suffix/separator rules for new locales.',
    );
});

test('keeps exact grouped output below the compact threshold', () => {
    assert.equal(compactThreshold, 1_000_000);
    assert.equal(formatLocalizedNumber(999999, 'en'), '999,999');
    assert.equal(formatLocalizedNumber(123456, 'en-IN'), '1,23,456');
    assert.equal(formatLocalizedNumber(123456, 'de'), '123.456');
    assert.equal(formatLocalizedNumber(123456, 'fa'), '۱۲۳٬۴۵۶');
});

test('formats compact values for representative western locales', () => {
    assert.equal(formatLocalizedNumber(1234567, 'en'), '1.2M');
    assert.equal(formatLocalizedNumber(1234567, 'ru'), '1,2 млн');
    assert.equal(formatLocalizedNumber(1234567, 'pt-BR'), '1,2 mi');
    assert.equal(formatLocalizedNumber(1234567, 'sr-Latn'), '1,2 mil.');
    assert.equal(formatLocalizedNumber(1000000000, 'ru'), '1 млрд');
    assert.equal(formatLocalizedNumber(2000000, 'en'), '2M');
    // Spanish uses 'mil M' for billions (es: mil millones)
    assert.equal(formatLocalizedNumber(1234567890, 'es'), '1,2 mil M');
    assert.equal(formatLocalizedNumber(1000000000, 'es'), '1 mil M');
});

test('formats compact values for asian and indian numbering systems', () => {
    assert.equal(formatLocalizedNumber(1000000, 'ja'), '100万');
    assert.equal(formatLocalizedNumber(1234567, 'ja'), '123.5万');
    assert.equal(formatLocalizedNumber(1234567, 'ko'), '123.5만');
    assert.equal(formatLocalizedNumber(1234567, 'zh-Hans'), '123.5万');
    assert.equal(formatLocalizedNumber(1234567, 'zh-Hant'), '123.5萬');
    assert.equal(formatLocalizedNumber(1234567, 'en-IN'), '12.3L');
    assert.equal(formatLocalizedNumber(10000000, 'en-IN'), '1Cr');
});

test('preserves readable output for rtl locales', () => {
    assert.equal(formatLocalizedNumber(1234567, 'he'), '1.2M\u200F');
    assert.equal(formatLocalizedNumber(1234567, 'ar'), '1.2 مليون\u200F');
    assert.equal(formatLocalizedNumber(1234567, 'fa'), '۱٫۲ میلیون');
});

test('does not round across the next compact unit boundary', () => {
    assert.equal(formatLocalizedNumber(999950000, 'en'), '999.9M');
});

test('returns safe output for edge-case inputs', () => {
    assert.equal(formatLocalizedNumber(NaN, 'en'), '0');
    assert.equal(formatLocalizedNumber(Number.POSITIVE_INFINITY, 'en'), '0');
    assert.equal(formatLocalizedNumber(-1234567, 'en'), '-1.2M');
    assert.equal(formatLocalizedNumber(1234.6, 'en'), '1,235');
});

test('produces a non-empty result for every project locale across representative values', () => {
    const supportedLanguages = Object.keys(twosky[0].languages) as string[];
    const sampleValues = [0, 999999, 1000000, 12345678, 1234567890];

    for (const languageCode of supportedLanguages) {
        for (const value of sampleValues) {
            const formatted = formatLocalizedNumber(value, languageCode);
            assert.ok(
                formatted.length > 0,
                `${languageCode} should format ${value}`,
            );
        }
    }
});