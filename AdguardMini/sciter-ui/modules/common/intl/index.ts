// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { createI18nInstance, createTranslatorShortcut } from '@adg/sciter-utils-kit';

import arLang from './locales/ar.json';
import beLang from './locales/be.json';
import csLang from './locales/cs.json';
import daLang from './locales/da.json';
import deLang from './locales/de.json';
import elLang from './locales/el.json';
import enLang from './locales/en.json';
import esLang from './locales/es.json';
import faLang from './locales/fa.json';
import fiLang from './locales/fi.json';
import frLang from './locales/fr.json';
import heLang from './locales/he.json';
import hrLang from './locales/hr.json';
import huLang from './locales/hu.json';
import idLang from './locales/id.json';
import itLang from './locales/it.json';
import jaLang from './locales/ja.json';
import koLang from './locales/ko.json';
import nbLang from './locales/nb.json';
import nlLang from './locales/nl.json';
import plLang from './locales/pl.json';
import ptBRLang from './locales/pt-BR.json';
import ptPTLang from './locales/pt-PT.json';
import roLang from './locales/ro.json';
import ruLang from './locales/ru.json';
import skLang from './locales/sk.json';
import slLang from './locales/sl.json';
import srLatnLang from './locales/sr-Latn.json';
import svLang from './locales/sv.json';
import thLang from './locales/th.json';
import trLang from './locales/tr.json';
import ukLang from './locales/uk.json';
import viLang from './locales/vi.json';
import zhHansLang from './locales/zh-Hans.json';
import zhHantLang from './locales/zh-Hant.json';

import type { I18nMessages, TranslatorShortcut } from '@adg/sciter-utils-kit';

const messages: I18nMessages = {
    ar: arLang,
    be: beLang,
    cs: csLang,
    da: daLang,
    de: deLang,
    el: elLang,
    en: enLang,
    es: esLang,
    fa: faLang,
    fi: fiLang,
    fr: frLang,
    he: heLang,
    hr: hrLang,
    hu: huLang,
    id: idLang,
    it: itLang,
    ja: jaLang,
    ko: koLang,
    nb: nbLang,
    nl: nlLang,
    pl: plLang,
    pt_pt: ptPTLang,
    pt_br: ptBRLang,
    ro: roLang,
    ru: ruLang,
    sk: skLang,
    sl: slLang,
    sr: srLatnLang,
    sv: svLang,
    th: thLang,
    tr: trLang,
    uk: ukLang,
    vi: viLang,
    zh_cn: zhHansLang,
    zh_tw: zhHantLang,
};

type Locale = keyof typeof messages;

/**
 * Provide plugin type
 */
declare global {
    const translate: TranslatorShortcut;
}

/**
 * I18n library translator instance
 */
export const i18nInstance = createI18nInstance(messages, 'en');

/**
 * Update current locale in translator library with custom function
 *
 * @param language - language code
 */
export function updateLanguage(language: string) {
    const locale = language.toLowerCase();
    if (messages[language as keyof typeof messages]) {
        i18nInstance.updateLanguage(locale as Locale);
    } else if (locale.includes('_')) {
        const [lang] = locale.split('_');
        if (messages[lang as keyof typeof messages]) {
            i18nInstance.updateLanguage(lang as Locale);
        }
    } else if (locale.includes('-')) {
        const [lang] = locale.split('-');
        if (messages[locale.replace('-', '_') as keyof typeof messages]) {
            const loc = locale.replace('-', '_') as Locale;
            i18nInstance.updateLanguage(loc);
        } else if (messages[lang as keyof typeof messages]) {
            i18nInstance.updateLanguage(lang as Locale);
        }
    } else {
        i18nInstance.updateLanguage('en' as Locale);
    }
}

/**
 * Translator shortcut
 */
const intl = createTranslatorShortcut(i18nInstance, () => log);

export default intl;
