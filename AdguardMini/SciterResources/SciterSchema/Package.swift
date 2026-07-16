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
        .package(id: "mac.sp-sciter-sdk", exact: "6.0.3-18.mac.rev.14.main.thread"),
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
                .product(name: "SciterSDK", package: "mac.sp-sciter-sdk")
            ],
            path: "Sources"
        )
    ]
)
