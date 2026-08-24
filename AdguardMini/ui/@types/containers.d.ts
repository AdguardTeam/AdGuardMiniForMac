// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Normalizes generic T to a tuple of arguments for Action.
 * - void -> []
 * - Tuple (any[]) -> as is
 * - Single type -> [Single]
 */
declare type ArgsTuple<T> = [T] extends [void] ? [] : T extends any[] ? T : [T];
