// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { observer } from 'mobx-react-lite';
import { useId } from 'preact/hooks';

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
    const titleId = useId();
    const descId = useId();

    const { advancedBlocking, router, settings } = useSettingsStore();
    const { urlFilterState } = advancedBlocking;
    const { enabled } = urlFilterState;

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
            {/* Several of these cards can stack, so "Close" alone would not say which. */}
            <Button
                ariaLabel={translate('close.titled.aria', { title: promo.title })}
                className={s.Promo_close}
                icon="cross"
                type="icon"
                onClick={promo.dismiss}
            />
            <div className={s.Promo_left}>
                {/*
                  * The heading names itself together with the description, so
                  * the card is announced in one go; the action button below
                  * stays its own stop rather than being folded into that name.
                  */}
                <Text
                    ariaLabelledby={`${titleId} ${descId}`}
                    className={s.Promo_title}
                    id={titleId}
                    tabIndex={0}
                    type="h5"
                >
                    {promo.title}
                </Text>
                <Text className={s.Promo_desc} id={descId} type="t2">
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
