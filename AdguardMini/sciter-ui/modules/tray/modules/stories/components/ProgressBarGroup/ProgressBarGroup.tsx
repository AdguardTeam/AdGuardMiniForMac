// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import theme from 'Theme';
import { Button } from 'UILib';

import { ProgressBarElement } from '../ProgressBarElement/ProgressBarElement';

import s from './ProgressBarGroup.module.pcss';

type ProgressBarGroupProps = {
    framesCount: number;
    currentFrameIndex: number;
    onFrameClick(index: number): void;
    onClose(): void;
};

/**
 * Progress bar component for story constructor
 */
export function ProgressBarGroup({
    framesCount,
    currentFrameIndex,
    onFrameClick,
    onClose,
}: ProgressBarGroupProps) {
    const framesRunner = Array.from({ length: framesCount }, (_, index) => index);

    const showProgressBar = framesCount > 1;

    return (
        <div className={s.ProgressBar}>
            {showProgressBar && framesRunner.map((frameIndex) => (
                <ProgressBarElement
                    key={frameIndex}
                    currentFrameIndex={currentFrameIndex}
                    frameIndex={frameIndex}
                    onFrameClick={onFrameClick}
                />
            ))}
            <Button
                className={cx(s.ProgressBar_close, !showProgressBar && s.ProgressBar_close__solo)}
                icon="cross"
                iconClassName={theme.button.whiteIcon}
                type="icon"
                onClick={onClose}
            />
        </div>
    );
}
