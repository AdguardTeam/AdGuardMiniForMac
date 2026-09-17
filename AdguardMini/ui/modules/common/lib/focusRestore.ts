// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { isActivationKey } from './keyboardActivation';

/**
 * Minimal view of an element competing to receive focus when a surface
 * closes. The DOM adapter builds one from a real element; unit tests build
 * one from a plain object, so the decisions need no DOM.
 */
export type FocusRestoreCandidate = {
    /** Whether the element is still attached to the document. */
    isConnected: boolean;
    /** Whether the element still generates layout boxes. */
    isVisible: boolean;
};

/**
 * Which captured candidate becomes the remembered opener: the activation
 * recorded when the surface was opened (`activation`), the element focused at
 * capture time (`active`), or nothing (`null`).
 */
export type FocusOpenerSource = 'activation' | 'active' | null;

/**
 * Which element receives focus when a surface closes: the control that opened
 * it (`opener`), the heading that was focused before it (`heading`), or the
 * window body (`body`).
 */
export type FocusRestoreTarget = 'opener' | 'heading' | 'body';

/**
 * Pure capture-time decision: a usable activation record wins, the active
 * element is the fallback, and neither means "no opener".
 *
 * The activation record exists because focus alone is not a reliable opener
 * source on WebKit: a mouse click on a native button leaves focus on the body,
 * and an opener removed by the click that opened the surface is gone before
 * the snapshot runs.
 *
 * @param activation State of the element recorded at activation time, if any.
 * @param active State of the element focused at capture time, if any.
 * @returns Which candidate to remember as the opener.
 */
export function resolveFocusOpenerSource(
    activation: FocusRestoreCandidate | null,
    active: FocusRestoreCandidate | null,
): FocusOpenerSource {
    if (isUsableCandidate(activation)) {
        return 'activation';
    }

    if (isUsableCandidate(active)) {
        return 'active';
    }

    return null;
}

/**
 * Pure restore decision: the opener wins while it is connected and visible,
 * the heading is the first fallback, and the body is the last resort.
 *
 * @param opener State of the element that opened the surface, if any.
 * @param heading State of the last heading focused before the surface, if any.
 * @returns The candidate that should receive focus.
 */
export function resolveFocusRestoreTarget(
    opener: FocusRestoreCandidate | null,
    heading: FocusRestoreCandidate | null,
): FocusRestoreTarget {
    if (isUsableCandidate(opener)) {
        return 'opener';
    }

    if (isUsableCandidate(heading)) {
        return 'heading';
    }

    return 'body';
}

/**
 * Whether a candidate can take focus right now.
 *
 * @param candidate Candidate state, or `null` when the element is missing.
 * @returns `true` when the element is connected and rendered.
 */
function isUsableCandidate(candidate: FocusRestoreCandidate | null): boolean {
    return candidate !== null && candidate.isConnected && candidate.isVisible;
}

/**
 * What a surface remembers about where it was opened from. Captured once when
 * the surface mounts and consumed once when it unmounts.
 */
export type FocusRestoreSnapshot = {
    /** Element recorded at activation time or focused at capture; may be `null`. */
    opener: HTMLElement | null;
    /** Heading remembered before the surface opened; `null` when none was. */
    heading: HTMLElement | null;
};

/**
 * Headings focused by `useFocusOnMount`, oldest first. Disconnected entries
 * are pruned on every write, so an unmounted surface stops competing with the
 * page that replaced it.
 */
let rememberedHeadings: HTMLElement[] = [];

/**
 * Remembers a heading `useFocusOnMount` just focused, so it can serve as the
 * fallback when the element that opened a surface is gone.
 *
 * @param element The heading that received focus.
 */
export function rememberFocusedHeading(element: HTMLElement): void {
    rememberedHeadings = rememberedHeadings.filter((heading) => heading.isConnected);
    rememberedHeadings.push(element);
}

/**
 * The most recent remembered heading that is still attached to the document.
 *
 * @returns The fallback heading, or `null` when none is left.
 */
function getRememberedHeading(): HTMLElement | null {
    for (let index = rememberedHeadings.length - 1; index >= 0; index -= 1) {
        if (rememberedHeadings[index].isConnected) {
            return rememberedHeadings[index];
        }
    }

    return null;
}

/**
 * Elements a pointer activation can return focus to. A click on an icon or a
 * text node inside a control resolves to that control, so the anchor is the
 * nearest match, not the raw event target.
 */
const ACTIVATION_TARGET_SELECTOR = 'button, a[href], [role="button"], [tabindex]';

/**
 * The element a pointer activation resolved to.
 *
 * @param target Event target of the activation.
 * @returns The nearest interactive ancestor, or `null` when there is none.
 */
export function resolveActivationTarget(target: Element | null): Element | null {
    return target?.closest(ACTIVATION_TARGET_SELECTOR) ?? null;
}

/**
 * Element the last user activation acted on; see
 * `installFocusActivationTracker`.
 */
let recordedActivation: HTMLElement | null = null;

let activationExpiry: ReturnType<typeof setTimeout> | null = null;

/**
 * Remembers the element a user activation is about to act on. A surface that
 * mounts in the same task reads it through `captureFocusSnapshot`; the
 * record expires at the end of the task, so a surface opened later without a
 * user action (license-state paywall, Swift-driven overlay) cannot adopt a
 * stale activation as its opener.
 *
 * Preact commits in a microtask, which runs before this timer.
 *
 * @param element Element the activation targets, or `null`.
 */
export function rememberActivatedElement(element: HTMLElement | null): void {
    recordedActivation = element;

    if (activationExpiry !== null) {
        clearTimeout(activationExpiry);
    }

    activationExpiry = setTimeout(() => {
        recordedActivation = null;
        activationExpiry = null;
    }, 0);
}

/**
 * Observes user activations in the capture phase, before the component
 * handler runs and before WebKit moves focus: on a click the event target is
 * read directly (a mouse-clicked native button never holds focus), and on an
 * activation keypress the focused element is read. Installed once per module
 * window from `webViewBootstrap`.
 */
export function installFocusActivationTracker(): void {
    document.addEventListener('click', (event: MouseEvent) => {
        const resolved = resolveActivationTarget(event.target as Element | null);

        rememberActivatedElement(resolved instanceof HTMLElement ? resolved : null);
    }, true);

    document.addEventListener('keydown', (event: KeyboardEvent) => {
        if (!isActivationKey(event)) {
            return;
        }

        const active = document.activeElement;

        rememberActivatedElement(
            active instanceof HTMLElement && active !== document.body ? active : null,
        );
    }, true);
}

/**
 * The element focused in the window, or `null` when focus rests on the body,
 * the document root or nothing at all.
 *
 * @returns The active element, or `null`.
 */
function getActiveElement(): HTMLElement | null {
    const active = document.activeElement;

    if (!(active instanceof HTMLElement)) {
        return null;
    }

    if (active === document.body || active === document.documentElement) {
        return null;
    }

    return active;
}

/**
 * Describes an element for the restore decisions.
 *
 * @param element Element to describe, or `null`.
 * @returns The candidate state, or `null` when there is no element.
 */
function describeCandidate(element: HTMLElement | null): FocusRestoreCandidate | null {
    if (element === null) {
        return null;
    }

    return {
        isConnected: element.isConnected,
        // `getClientRects()` is empty when the element generates no layout
        // boxes (`display: none`, or detached), which is when `focus()` would
        // do nothing.
        isVisible: element.getClientRects().length > 0,
    };
}

/**
 * Takes the snapshot a surface needs to restore focus later. Call it before
 * the surface moves focus, so the opener is still available. The activation
 * record is preferred over the focused element; see
 * `resolveFocusOpenerSource`.
 *
 * @returns The captured opener and fallback heading.
 */
export function captureFocusSnapshot(): FocusRestoreSnapshot {
    const activation = recordedActivation;
    const active = getActiveElement();
    const source = resolveFocusOpenerSource(
        describeCandidate(activation),
        describeCandidate(active),
    );

    return {
        opener: source === 'activation' ? activation : (source === 'active' ? active : null),
        heading: getRememberedHeading(),
    };
}

/**
 * Moves focus to the resolved restore target and does nothing else: the page
 * is never scrolled to bring the target into view (a close that follows the
 * user's own scrolling must not drag the viewport back), and input modality
 * is left untouched, so `:focus-visible` (or the old-WebKit modality
 * fallback) decides whether the restored control shows the ring.
 *
 * @param snapshot Snapshot taken by `captureFocusSnapshot`.
 */
export function restoreFocus(snapshot: FocusRestoreSnapshot): void {
    const target = resolveFocusRestoreTarget(
        describeCandidate(snapshot.opener),
        describeCandidate(snapshot.heading),
    );

    if (target === 'opener') {
        snapshot.opener?.focus({ preventScroll: true });
        return;
    }

    if (target === 'heading') {
        snapshot.heading?.focus({ preventScroll: true });
        return;
    }

    document.body.focus();
}
