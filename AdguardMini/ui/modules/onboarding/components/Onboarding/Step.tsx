// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

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
    /** Renders the step illustration as a Lottie animation container. */
    lottie?: 'ads' | 'trackers' | 'annoyances';
    /**
     * Ref to the Lottie container `<div>`. The web Lottie renderer
     * (`lottie-web` via `useLottieElementAdapter`) draws into this element.
     */
    elLottieRef?: RefObject<HTMLDivElement>;
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
}: StepProps) {
    return (
        <div className={s.Step_container}>
            <StepHeader />
            <div>
                {image && <img className={imageSmall ? s.Step_imageSmall : s.Step_image} src={image} />}
                {lottie && elLottieRef && (
                    <div
                        ref={elLottieRef}
                        className={cx(s.Step_lottie, imageSmall ? s.Step_imageSmall : s.Step_image)}
                    />
                )}
            </div>
            <div className={s.Step_content}>
                <Text className={s.Step_content_title} type="h4">{title}</Text>
                <Text className={s.Step_content_desc} type="t1">{description}</Text>
                {checkbox && (
                    <Checkbox
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
                        <Button type="outlined" onClick={secondaryButton.action}>
                            <Text lineHeight="none" type="t1">{secondaryButton.label}</Text>
                        </Button>
                    )}
                    <Button className={theme.button.greenSubmit} disabled={primaryButton.disabled} type="submit" onClick={primaryButton.action}>
                        <Text lineHeight="none" type="t1">{primaryButton.label}</Text>
                    </Button>
                </div>
            </div>
        </div>
    );
}
