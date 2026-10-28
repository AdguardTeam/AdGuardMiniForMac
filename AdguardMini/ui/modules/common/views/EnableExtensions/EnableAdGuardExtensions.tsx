// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { useState } from 'preact/hooks';

import { ExternalLink } from 'UILib';
import { isDarkColorTheme } from 'Utils/colorThemes';

import dark from './images/extensions-dark.png';
import light from './images/extensions-light.png';
import { Template } from './Template';

import type { TemplateProps } from './Template';
import type { UseColorTheme } from 'Utils/colorThemes';

type EnableAdGuardExtensionsProps = {
    center?: boolean;
    privacyPolicyUrl: string;
    useTheme: UseColorTheme;
} & Pick<TemplateProps, 'buttons' | 'containerClassName' | 'asDialog'>;

/**
 * Enable AdGuard extensions view
 */
export function EnableAdGuardExtensions({
    privacyPolicyUrl,
    useTheme,
    buttons,
    containerClassName,
    center,
    asDialog,
}: EnableAdGuardExtensionsProps) {
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    useTheme((theme) => {
        setIsDarkTheme(isDarkColorTheme(theme));
    });

    return (
        <Template
            asDialog={asDialog}
            buttons={buttons}
            center={center}
            containerClassName={containerClassName}
            description={(
                <>
                    {translate('onboarding.extensions.desc', {
                        b: (text: string) => <b>{text}</b>,
                        policy: (text: string) => (
                            <ExternalLink
                                href={privacyPolicyUrl}
                                textType="t1"
                            >
                                {text}
                            </ExternalLink>
                        ),
                    })}
                </>
            )}
            image={isDarkTheme ? dark : light}
            title={translate('onboarding.extensions.title')}
            isPng
        />
    );
}
