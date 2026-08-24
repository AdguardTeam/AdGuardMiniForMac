// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

type Group = {
    groupId: number;
    groupName: string;
    displayNumber: number;
};

export type GroupWithFilters = Group & { filters: number[] };
