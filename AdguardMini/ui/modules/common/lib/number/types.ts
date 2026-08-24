// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

export type NotationSystem = 'western' | 'indian' | 'ja' | 'ko' | 'zh_cn' | 'zh_tw';

export interface CompactUnit {
    divisor: number;
}

export interface NumberLocaleRule {
    id: string;
    aliases: string[];
    notationSystem: NotationSystem;
    groupingPattern: number[];
    thousandsSeparator: string;
    decimalSeparator: string;
    direction: 'ltr' | 'rtl';
    digitMap?: string[];
    compactSuffixes: Record<number, string>;
}

export type CompactUnitsBySystem = Record<NotationSystem, CompactUnit[]>;
