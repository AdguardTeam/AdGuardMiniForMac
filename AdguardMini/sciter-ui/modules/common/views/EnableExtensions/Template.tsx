// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { Text } from 'UILib';

import { ActionButton } from './ActionButton';
import s from './Template.module.pcss';

import type { ActionButtonProps } from './ActionButton';
import type { ComponentChild } from 'preact';

export type TemplateProps = {
    image: string;
    imageBig?: boolean;
    isPng?: boolean;
    headerSlot?: ComponentChild;
    title: string;
    description: ComponentChild;
    buttons: [Nullable<ActionButtonProps>, Nullable<ActionButtonProps>?];
    containerClassName?: string;
    pageContainerTestId?: string;
};

/**
 * Template component for EnableExtensions views
 */
export function Template({
    image,
    imageBig,
    isPng,
    headerSlot,
    title,
    description,
    buttons,
    containerClassName,
    pageContainerTestId,
}: TemplateProps) {
    return (
        <div id={pageContainerTestId} className={cx(s.Template_container, containerClassName)}>
            {headerSlot || <div className={s.Template_gap} />}
            <div className={imageBig ? s.Template_imgBig : s.Template_img}>
                <img className={isPng ? s.Template_img_png : s.Template_img_source} src={image} />
            </div>
            <div className={s.Template_content}>
                <Text className={s.Template_content_title} type="h4">{title}</Text>
                <Text className={s.Template_content_desc} type="t1">{description}</Text>
            </div>
            <div className={s.Template_buttons}>
                {buttons.map((props) => (
                    props && <ActionButton key={props.label} {...props} />
                ))}
            </div>
        </div>
    );
}
