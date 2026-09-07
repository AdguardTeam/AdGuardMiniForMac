// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useCallback } from 'preact/hooks';

import s from './ProgressBarElement.module.pcss';

type ProgressBarElementProps = {
    frameIndex: number;
    currentFrameIndex: number;
    onFrameClick(index: number): void;
};

/**
 * One progress bar element
 */
export function ProgressBarElement({
    frameIndex,
    currentFrameIndex,
    onFrameClick,
}: ProgressBarElementProps) {
    const onClick = useCallback(() => onFrameClick(frameIndex), [frameIndex, onFrameClick]);

    // Active and completed segments show full width; upcoming segments show 0%
    const width = frameIndex <= currentFrameIndex ? '100%' : '0%';

    return (
        // Hidden from the accessibility tree: the segments are a visual
        // progress affordance with tiny hit targets; VoiceOver users move
        // between frames with the named back/next zones instead.
        <div className={s.ProgressBarElement} aria-hidden onClick={onClick}>
            <div className={s.ProgressBarElement_bar} style={{ width }} />
        </div>
    );
}
