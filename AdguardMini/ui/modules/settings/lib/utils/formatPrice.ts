// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Format price to 2 decimal places
 * @param price - price to format number
 * @returns formatted price, with only 2 number after dot, or integer part if there is no dot
 */
export const formatPrice = (price?: number) => {
    if (!price) {
        return '';
    }

    const stringPrice = price.toString();
    const [integerPart, decimalPart] = stringPrice.split('.');

    if (decimalPart) {
        const formattedDecimalPart = decimalPart.slice(0, 2);
        return `${integerPart}.${formattedDecimalPart}`;
    }
    return integerPart;
};
