// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export enum Elements {
    Checkbox = 'Checkbox',
    Link = 'Link',
    Header = 'Header',
    Description = 'Description',
    Switch = 'Switch',
    Navigation = 'Navigation',
    Select = 'Select',
    Radio = 'Radio',
    ExclusionCheckbox = 'ExclusionCheckbox',
    Button = 'Button',
}

/**
 * Helper record for aria labels
 */
const messages: Record<Elements, (text: string, checked?: boolean) => string> = {
    [Elements.Checkbox]: (text, checked) => translate('aria.elements.checkbox', { text: `${text} ${checked ? translate('aria.switch.enabled') : translate('aria.switch.disabled')}` }),
    [Elements.Link]: (text) => translate('aria.elements.link', { text }),
    [Elements.Header]: (text) => translate('aria.elements.header', { text }),
    [Elements.Description]: (text) => translate('aria.elements.description', { text }),
    [Elements.Switch]: (text, checked) => translate('aria.elements.switch', { text: `${text} ${checked ? translate('aria.switch.enabled') : translate('aria.switch.disabled')}` }),
    [Elements.Navigation]: (text) => translate('aria.elements.navigation', { text }),
    [Elements.Select]: (text) => translate('aria.elements.select', { text }),
    [Elements.Radio]: (text, checked) => translate('aria.elements.radio', { text: `${text} ${checked ? translate('aria.switch.enabled') : translate('aria.switch.disabled')}` }),
    [Elements.ExclusionCheckbox]: (text) => translate('aria.elements.checkbox', { text }),
    [Elements.Button]: (text) => translate('aria.elements.button', { text }),
};

declare global {
    const aria: typeof messages;
}

export const aria = {
    ...messages,
};
