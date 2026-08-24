import type { I18nInterface, Locale } from '@adguard/translate';
/** i18n messages grouped by locale. */
export type I18nMessages = Partial<Record<Locale, Record<string, string>>>;
export type SubscribeCallback = () => void;
/** `I18nInterface` with language update and subscriptions. */
export type I18nUpdatableInterface = I18nInterface & {
    updateLanguage(locale: string): void;
    subscribe(cb: SubscribeCallback): void;
    unsubscribe(cb: SubscribeCallback): void;
};
/** Shortcut for singular/plural translation functions. */
export type TranslatorShortcut = ReturnType<typeof createTranslatorInstance>['getMessage'] & {
    plural: ReturnType<typeof createTranslatorInstance>['getPlural'];
};
/** Create i18n instance from messages and base locale. */
export declare function createI18nInstance(messages: I18nMessages, baseLocale: Locale): I18nUpdatableInterface;
/** Create Preact translator instance.
 * @internal Use `createTranslatorShortcut` outside this library.
 */
export declare function createTranslatorInstance(i18nInstance: I18nUpdatableInterface): import("@adguard/translate").Translator<any>;
/** Create translator shortcut with logger. */
export declare function createTranslatorShortcut(i18nInstance: I18nUpdatableInterface, getLogger: () => Logger): TranslatorShortcut;
/** Create translator shortcut with explicit translator and logger. */
export declare function createTranslatorShortcut(i18nInstance: I18nUpdatableInterface, translator: ReturnType<typeof createTranslatorInstance>, getLogger: () => Logger): TranslatorShortcut;
