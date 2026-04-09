// swift-tools-version: 5.8
// The swift-tools-version declares the minimum version of Swift required to build this package.

// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

import PackageDescription

let package = Package(
    name: "SciterSchema",
    products: [
        .library(
            name: "SciterSchema",
            targets: ["SciterSchema"]),
    ],
    dependencies: [
        .package(
            url: "ssh://git@bit.int.agrd.dev:7999/adguard-mac/sp-sciter-sdk.git",
            branch: "mac/6.0.3.14-rev-1"
        ),
        .package(url: "https://github.com/apple/swift-protobuf.git", exact: "1.31.0")
    ],
    targets: [
        .target(
            name: "SciterSchema",
            dependencies: ["BaseSciterSchema"],
            path: "Initialisers"
        ),
        .target(
            name: "BaseSciterSchema",
            dependencies: [
                .product(name: "SciterSDK", package: "sp-sciter-sdk")
            ],
            path: "Sources"
        )
    ]
)
