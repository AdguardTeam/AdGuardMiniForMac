// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type { ComponentChildren } from 'preact';

/*
 * Minimal UI-kit stand-ins for the node:test runs: tests render real
 * components, and the kit's own dependencies (images, themes, animations) are
 * irrelevant there. Props used by the rendered components are kept, the icon
 * name is exposed as `data-icon` so tests can assert on it.
 */

/** Icon identifier; structurally compatible with the UI kit's union. */
export type IconType = string;

/**
 * Renders the icon name as an inert element.
 */
export function Icon({ icon, className }: { icon: IconType; className?: string }) {
    return <span className={className} data-icon={icon} />;
}

/**
 * Renders a button that forwards the click handler.
 */
export function Button({
    onClick,
    icon,
    className,
    children,
}: {
    onClick?(): void;
    icon?: IconType;
    iconClassName?: string;
    className?: string;
    type?: string;
    size?: string;
    children?: ComponentChildren;
}) {
    return (
        <button className={className} data-icon={icon} type="button" onClick={onClick}>
            {children}
        </button>
    );
}

/**
 * Renders text content as a span, forwarding the attributes tests assert on.
 */
export function Text({
    children,
    className,
    type,
    id,
    tabIndex,
    ariaLabelledby,
}: {
    children?: ComponentChildren;
    className?: string;
    type?: string;
    id?: string;
    tabIndex?: number;
    ariaLabelledby?: string;
    lineHeight?: string;
    semibold?: boolean;
}) {
    return (
        <span
            aria-labelledby={ariaLabelledby}
            className={className}
            data-text-type={type}
            id={id}
            tabIndex={tabIndex}
        >
            {children}
        </span>
    );
}
