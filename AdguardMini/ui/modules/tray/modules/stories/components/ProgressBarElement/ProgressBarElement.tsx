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
        <div className={s.ProgressBarElement} onClick={onClick}>
            <div className={s.ProgressBarElement_bar} style={{ width }} />
        </div>
    );
}
