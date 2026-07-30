// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';

import { Button, Text } from 'Modules/common/components';
import { useSettingsStore } from 'SettingsLib/hooks';
import { RouteName } from 'SettingsStore/modules';

import promoIllustration from './images/promo_illustration.svg';
import s from './Promo.module.pcss';

const SYSTEM_WIDE_ID = 'system_wide_protection';

/**
 * Promo card component for system-wide protection.
 */
export function PromoComponent() {
    const { advancedBlocking, router, settings } = useSettingsStore();
    const { urlFilterState } = advancedBlocking;
    const { enabled } = urlFilterState.configuration;

    const isPromoDismissed = settings.dismissedPromoCards.has(SYSTEM_WIDE_ID);

    if (enabled || isPromoDismissed) {
        return null;
    }

    // Will be used for future promo cards, for now we only have one.
    const promos = [{
        id: SYSTEM_WIDE_ID,
        title: translate('advanced.blocking.system.wide.promo.title'),
        description: translate('advanced.blocking.system.wide.promo.desc'),
        buttonText: translate('advanced.blocking.system.wide.promo.button'),
        dismiss: () => {
            settings.updatePromoDismissedCards([...settings.dismissedPromoCards, SYSTEM_WIDE_ID]);
        },
        action: () => {
            router.changePath(RouteName.system_wide_protection);
        },
    }];

    const promo = promos[0];

    return (
        <div className={s.Promo}>
            <Button
                className={s.Promo_close}
                icon="cross"
                type="icon"
                onClick={promo.dismiss}
            />
            <div className={s.Promo_left}>
                <Text className={s.Promo_title} type="h5">
                    {promo.title}
                </Text>
                <Text className={s.Promo_desc} type="t2">
                    {promo.description}
                </Text>
                <Button type="text" onClick={promo.action}>
                    <Text type="t2">{promo.buttonText}</Text>
                </Button>
            </div>
            <div className={s.Promo_illustration}>
                <img alt="" src={promoIllustration} />
            </div>
        </div>
    );
}

export const Promo = observer(PromoComponent);
