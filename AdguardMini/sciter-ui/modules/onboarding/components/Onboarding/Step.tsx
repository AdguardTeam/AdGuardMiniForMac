// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/* eslint-disable @typescript-eslint/ban-ts-comment */

import theme from 'Theme';
import { Button, Checkbox, Text } from 'UILib';

import s from './Step.module.pcss';
import { StepHeader } from './StepHeader';

import type { RefObject } from 'preact';

type StepButton = {
    label: string;
    action(): void;
    disabled?: boolean;
};

export type StepProps = {
    lottie?: 'ads' | 'trackers' | 'annoyances';
    elLottieRef?: RefObject<HTMLLottieElement | null>;
    image?: string;
    imageSmall?: boolean;
    title: string;
    description: string;
    checkbox?: {
        label: string;
        checked: boolean;
        onChange(checked: boolean): void;
    };
    primaryButton: StepButton;
    secondaryButton?: StepButton;
    pageContainerTestId?: string;
    testIdPrimaryButton?: string;
    testIdSecondaryButton?: string;
    testIdCheckbox?: string;
};

/**
 * Onboarding step template component
 */
export function Step({
    image,
    lottie,
    elLottieRef,
    imageSmall,
    title,
    description,
    primaryButton,
    secondaryButton,
    checkbox,
    pageContainerTestId,
    testIdPrimaryButton,
    testIdSecondaryButton,
    testIdCheckbox,
}: StepProps) {
    return (
        <div id={pageContainerTestId} className={s.Step_container}>
            <StepHeader />
            <div>
                {image && <img className={imageSmall ? s.Step_imageSmall : s.Step_image} src={image} />}
                {/* @ts-ignore */}
                {lottie && elLottieRef && <lottie ref={elLottieRef} autoplay={false} className={imageSmall ? s.Step_imageSmall : s.Step_image} src={`${lottie}.json`} />}
            </div>
            <div className={s.Step_content}>
                <Text className={s.Step_content_title} type="h4">{title}</Text>
                <Text className={s.Step_content_desc} type="t1">{description}</Text>
                {checkbox && (
                    <Checkbox
                        testId={testIdCheckbox}
                        checked={checkbox.checked}
                        className={s.Step_content_checkbox}
                        onChange={checkbox.onChange}
                    >
                        <Text className={s.Step_content_checkbox_text} type="t1">
                            {checkbox.label}
                        </Text>
                    </Checkbox>
                )}
                <div className={s.Step_content_buttons}>
                    {secondaryButton && (
                        <Button testId={testIdSecondaryButton} type="outlined" onClick={secondaryButton.action}>
                            <Text lineHeight="none" type="t1">{secondaryButton.label}</Text>
                        </Button>
                    )}
                    <Button testId={testIdPrimaryButton} className={theme.button.greenSubmit} disabled={primaryButton.disabled} type="submit" onClick={primaryButton.action}>
                        <Text lineHeight="none" type="t1">{primaryButton.label}</Text>
                    </Button>
                </div>
            </div>
        </div>
    );
}
