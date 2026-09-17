// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The two input modalities the keyboard-focus ring distinguishes: the ring is
 * drawn for `keyboard` and suppressed for `pointer`.
 */
export type InputModality = 'keyboard' | 'pointer';

/**
 * Root-element attribute the tracker reflects the current modality on. The
 * old-WebKit fallback stylesheet (`theme/default/focusFallback.css`) keys its
 * `:focus` rule on this attribute, so the name is a contract between the two.
 */
export const INPUT_MODALITY_ATTRIBUTE = 'data-input-modality';

/**
 * Modality before any interaction: no ring appears on load.
 */
export const INITIAL_INPUT_MODALITY: InputModality = 'pointer';

/**
 * Pure modality transition: `keyboard` on any key press, `pointer` on any
 * pointer press, unchanged for events the tracker does not observe.
 *
 * @param current Modality observed so far.
 * @param eventType DOM event type of the newly observed interaction.
 * @returns The modality after this event.
 */
export function nextModality(current: InputModality, eventType: string): InputModality {
    if (eventType === 'keydown') {
        return 'keyboard';
    }

    if (eventType === 'pointerdown') {
        return 'pointer';
    }

    return current;
}

/**
 * Reflect the last input modality on the root element so the old-WebKit
 * fallback stylesheet can gate its `:focus` ring on keyboard interaction.
 * Listens in the capture phase - components may stop propagation, and a
 * missed pointer press would leave a stale ring on the previously focused
 * element. The attribute is written only when the modality actually changes,
 * so a burst of events cannot thrash style recalculation.
 *
 * Install once per module window, from `webViewBootstrap`.
 */
export function installInputModalityTracker(): void {
    const root = document.documentElement;
    let modality: InputModality = INITIAL_INPUT_MODALITY;

    root.setAttribute(INPUT_MODALITY_ATTRIBUTE, modality);

    const handleEvent = (event: Event): void => {
        const next = nextModality(modality, event.type);

        if (next === modality) {
            return;
        }

        modality = next;
        root.setAttribute(INPUT_MODALITY_ATTRIBUTE, next);
    };

    document.addEventListener('keydown', handleEvent, true);
    document.addEventListener('pointerdown', handleEvent, true);
}
