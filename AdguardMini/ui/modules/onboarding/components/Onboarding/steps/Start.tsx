// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId, useState } from 'preact/hooks';

import { UpdateAllowTelemetryRequest } from 'Apis/requests/ConsentService';
import { useFocusOnMount } from 'Common/hooks/useFocusOnMount';
import { getTdsLink, TDS_PARAMS } from 'Modules/common/utils/links';
import { useOnboardingStore } from 'OnboardingLib/hooks';
import { OnboardingSteps } from 'OnboardingStore/modules';
import theme from 'Theme';
import { Text, Checkbox, Button, ExternalLink, AppUsageDataModal } from 'UILib';

import startImage from './images/start.svg';
import s from './Start.module.pcss';

type StartProps = {
    // We have to pass and call this function to track the page view here
    // because user accepts sending telemetry data
    trackPage(): void;
};
/**
 * Step "Start"
 */
function StartComponent({ trackPage }: StartProps) {
    const { steps } = useOnboardingStore();

    const [checked, setChecked] = useState(false);
    const [telemetry, setTelemetry] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // The checkbox labels are siblings rather than `Checkbox` children (they
    // hold links that must not toggle the checkbox), so the inputs have to be
    // named explicitly via `aria-labelledby`.
    const eulaLabelId = useId();
    const telemetryLabelId = useId();

    const titleId = useId();
    const descId = useId();

    useFocusOnMount(titleId);

    const { safariExtensionsStore } = steps;

    const action = async () => {
        if (telemetry) {
            await window.API.Execute(new UpdateAllowTelemetryRequest({ value: true }));
            trackPage();
        }
        steps.setCurrentStep(
            safariExtensionsStore.allExtensionsEnabled
                ? OnboardingSteps.ads
                : OnboardingSteps.extensions,
        );
    };

    const primaryButton = { action, label: translate('onboarding.start.btn'), disabled: !checked };
    return (
        <div className={s.Start_container}>
            <div className={s.Start_content}>
                <div className={s.Start_content_left}>
                    <div className={s.Start_content_text}>
                        <Text
                            ariaLabelledby={`${titleId} ${descId}`}
                            className={s.Start_content_title}
                            id={titleId}
                            tabIndex={0}
                            type="h4"
                        >
                            {translate('onboarding.start.title')}
                        </Text>
                        <Text className={s.Start_content_desc} id={descId} type="t1">{translate('onboarding.start.desc')}</Text>
                    </div>
                    <div className={s.Start_content_checkbox}>
                        <Checkbox
                            ariaLabelledby={eulaLabelId}
                            checked={checked}
                            onChange={() => setChecked(!checked)}
                            withHover
                            title={(
                                <Text className={s.Start_content_checkbox_text} id={eulaLabelId} type="t2" onClick={() => setChecked(!checked)}>
                                    {translate('onboarding.accept', {
                                        eula: (text: string) => (
                                            <ExternalLink href={getTdsLink(TDS_PARAMS.eula)} textType="t2">{text}</ExternalLink>
                                        ),
                                        privacy: (text: string) => (
                                            <ExternalLink href={getTdsLink(TDS_PARAMS.privacy)} textType="t2">{text}</ExternalLink>
                                        ),
                                    })}
                                </Text>
                            )}
                        />
                    </div>
                    <div className={s.Start_content_checkbox}>
                        <Checkbox
                            ariaLabelledby={telemetryLabelId}
                            checked={telemetry}
                            onChange={() => setTelemetry(!telemetry)}
                            withHover
                            title={(
                                <Text className={s.Start_content_checkbox_text} id={telemetryLabelId} type="t2" onClick={() => setTelemetry(!telemetry)}>
                                    {translate('telemetry.accept.send.data', {
                                        link: (text: string) => (
                                            <div
                                                className={s.Start_content_checkbox_link}
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setShowModal(true);
                                                }}
                                            >
                                                {text}
                                            </div>
                                        ),
                                    })}
                                </Text>
                            )}
                        />
                    </div>
                </div>
                <img alt="" className={s.Start_image} src={startImage} />
            </div>
            <div className={s.Start_buttons}>
                <Button className={theme.button.greenSubmit} disabled={primaryButton.disabled} type="submit" onClick={primaryButton.action}>
                    <Text lineHeight="none" type="t1">{primaryButton.label}</Text>
                </Button>
            </div>
            {showModal && <AppUsageDataModal onClose={() => setShowModal(false)} />}
        </div>
    );
}

export const Start = observer(StartComponent);
