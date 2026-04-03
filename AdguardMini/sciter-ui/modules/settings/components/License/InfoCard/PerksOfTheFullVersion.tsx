// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { StringValue, Subscription } from 'Apis/types';
import { provideTrialDaysParam } from 'Common/utils/translate';
import { useSettingsStore } from 'SettingsLib/hooks';
import { SettingsEvent } from 'SettingsStore/modules';
import theme from 'Theme';
import { Button, Text } from 'UILib';

import { InfoCard } from './InfoCard';
import s from './PerksOfTheFullVersion.module.pcss';

enum ComparisonCase {
    no = 'no',
    yes = 'yes',
    partly = 'partly',
}

type ComparisonItem = {
    title: string;
    firstCase: ComparisonCase;
    secondCase: ComparisonCase;
};

const renderComparisonItems = (items: ComparisonItem[]) => {
    const getCaseClassName = (comparisonCase: ComparisonCase): string => {
        switch (comparisonCase) {
            case ComparisonCase.no:
                return s.PerksOfTheFullVersion_item__invalid;
            case ComparisonCase.partly:
                return s.PerksOfTheFullVersion_item__invalid;
            case ComparisonCase.yes:
                return s.PerksOfTheFullVersion_item__valid;
        }
    };

    const getCaseLabel = (comparisonCase: ComparisonCase): string => {
        switch (comparisonCase) {
            case ComparisonCase.no:
                return translate('no');
            case ComparisonCase.yes:
                return translate('yes');
            case ComparisonCase.partly:
                return translate('partly');
        }
    };

    return items.map((item, index) => {
        const { title, firstCase, secondCase } = item;

        const isBordered = index !== 0;
        const withBottomMargin = index === items.length - 1;

        return (
            <div
                key={title}
                className={cx(
                    s.PerksOfTheFullVersion_item,
                    isBordered && s.PerksOfTheFullVersion_item__bordered,
                    withBottomMargin && s.PerksOfTheFullVersion_item__bottomMargin,
                )}
            >
                <Text
                    className={s.PerksOfTheFullVersion_item_title}
                    lineHeight="none"
                    type="t2"
                >
                    {title}
                </Text>
                <Text
                    className={getCaseClassName(firstCase)}
                    lineHeight="none"
                    type="t2"
                    semibold
                >
                    {getCaseLabel(firstCase)}
                </Text>
                <Text
                    className={getCaseClassName(secondCase)}
                    lineHeight="none"
                    type="t2"
                    semibold
                >
                    {getCaseLabel(secondCase)}
                </Text>
            </div>
        );
    });
};

type PerksOfTheFullVersionProps = {
    withBottomMargin?: boolean;
};

/**
 * "Perks of the full version" table for License screen
 */
function PerksOfTheFullVersionComponent({
    withBottomMargin,
}: PerksOfTheFullVersionProps) {
    const {
        account,
        settings: { isMASReleaseVariant },
        telemetry,
    } = useSettingsStore();

    const comparisonItems: ComparisonItem[] = [
        {
            title: translate('license.perks.safari.protection'),
            firstCase: ComparisonCase.yes,
            secondCase: ComparisonCase.yes,
        },
        {
            title: translate('license.perks.advanced.ad.blocking'),
            firstCase: ComparisonCase.partly,
            secondCase: ComparisonCase.yes,
        },
        {
            title: translate('license.perks.automatic.filter.updates'),
            firstCase: ComparisonCase.no,
            secondCase: ComparisonCase.yes,
        },
        {
            title: translate('license.perks.protection.for.all.platforms'),
            firstCase: ComparisonCase.no,
            secondCase: ComparisonCase.yes,
        },
    ];

    const { trialAvailableDays, isTrialActive, isLicenseExpired, isAppStoreSubscription, isFreeware } = account;

    const renderTitle = () => {
        return (
            <>
                <Text
                    className={s.PerksOfTheFullVersion_title}
                    lineHeight="none"
                    type="h6"
                >
                    {translate('license.perks')}
                </Text>
                <Text
                    className={s.PerksOfTheFullVersion_case}
                    lineHeight="none"
                    type="t2"
                >
                    {translate('license.free')}
                </Text>
                <Text
                    className={s.PerksOfTheFullVersion_case}
                    lineHeight="none"
                    type="t2"
                >
                    {translate('license.full')}
                </Text>
            </>
        );
    };

    const renderButton = () => {
        const renderLabel = () => {
            if (isMASReleaseVariant) {
                if (trialAvailableDays > 0 && !isTrialActive) {
                    return translate.plural('license.try.for.free', trialAvailableDays, provideTrialDaysParam(trialAvailableDays));
                }

                return (isAppStoreSubscription || isFreeware) ? translate('license.subscribe') : translate('license.get.full.version');
            }

            if (isLicenseExpired) {
                return translate('license.renew.license');
            }

            return translate('license.get.full.version');
        };

        const onClickHandler = () => {
            const key = account.license.license?.licenseKey?.getHiddenValue() || '';
            if (isTrialActive) {
                window.API.accountService.RequestRenew(new StringValue({ value: key }));
            } else if (isLicenseExpired) {
                account.requestRenewLicense(key);
            } else if (isAppStoreSubscription || (isMASReleaseVariant && isFreeware)) {
                account.showPaywall();
            } else {
                account.requestWebSubscription(Subscription.standalone);
            }

            if (isMASReleaseVariant) {
                if (trialAvailableDays > 0 && !isTrialActive) {
                    telemetry.trackEvent(SettingsEvent.Try14DaysClick);
                } else if (isAppStoreSubscription || isFreeware) {
                    telemetry.trackEvent(SettingsEvent.SubscribeTrialEndClick);
                } else {
                    telemetry.trackEvent(SettingsEvent.GetFullVersionClick);
                }
            } else {
                if (!isLicenseExpired) {
                    telemetry.trackEvent(SettingsEvent.GetFullVersionClick);
                } else {
                    telemetry.trackEvent(SettingsEvent.SubscribeTrialEndClick);
                }
            }
        };

        return (
            <Button
                className={cx(
                    theme.button.greenSubmit,
                    s.PerksOfTheFullVersion_button,
                )}
                type="submit"
                small
                onClick={onClickHandler}
            >
                <Text lineHeight="none" type="t1">
                    {renderLabel()}
                </Text>
            </Button>
        );
    };

    return (
        <InfoCard
            buttonSlot={renderButton()}
            className={s.PerksOfTheFullVersion}
            titleSlot={renderTitle()}
            withBottomMargin={withBottomMargin}
            withHeaderPadding
        >
            {renderComparisonItems(comparisonItems)}
        </InfoCard>
    );
}

export const PerksOfTheFullVersion = observer(PerksOfTheFullVersionComponent);
