// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import finish from './images/finish.svg';
import { Template } from './Template';

import type { ActionButtonProps } from './ActionButton';
import type { TemplateProps } from './Template';

type YouAreAllSetProps = {
    handler: Omit<ActionButtonProps, 'buttonType'>;
} & Pick<TemplateProps, 'headerSlot' | 'description'> & { testIdDone?: string };

/**
 * You're all set view
 */
export function YouAreAllSet({
    handler,
    testIdDone,
    ...props
}: YouAreAllSetProps) {
    return (
        <Template
            imageBig
            {...props}
            buttons={[
                { testId: testIdDone, buttonType: 'submit', ...handler },
            ]}
            image={finish}
            title={translate('onboarding.finish.title')}
        />
    );
}
