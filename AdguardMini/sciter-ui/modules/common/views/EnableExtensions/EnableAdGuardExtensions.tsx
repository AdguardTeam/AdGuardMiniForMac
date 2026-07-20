// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'preact/hooks';

import { ExternalLink } from 'UILib';
import { isDarkColorTheme } from 'Utils/colorThemes';

import dark from './images/extensions-dark.png';
import light from './images/extensions-light.png';
import { Template } from './Template';
import s from './Template.module.pcss';

import type { TemplateProps } from './Template';
import type { UseColorTheme } from 'Utils/colorThemes';

type EnableAdGuardExtensionsProps = {
    privacyPolicyUrl: string;
    useTheme: UseColorTheme;
} & Pick<TemplateProps, 'buttons' | 'containerClassName'>;

/**
 * Enable AdGuard extensions view
 */
export function EnableAdGuardExtensions({
    privacyPolicyUrl,
    useTheme,
    buttons,
    containerClassName,
}: EnableAdGuardExtensionsProps) {
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useTheme((theme) => {
        setIsDarkTheme(isDarkColorTheme(theme));
    });

    return (
        <Template
            buttons={buttons}
            containerClassName={containerClassName}
            description={(
                <div>
                    {translate('onboarding.extensions.desc', {
                        b: (text: string) => <div className={s.Template_content_desc_text}>{text}</div>,
                        policy: (text: string) => (
                            <ExternalLink
                                href={privacyPolicyUrl}
                                textType="t1"
                            >
                                {text}
                            </ExternalLink>
                        ),
                    })}
                </div>
            )}
            image={isDarkTheme ? dark : light}
            title={translate('onboarding.extensions.title')}
            isPng
        />
    );
}
