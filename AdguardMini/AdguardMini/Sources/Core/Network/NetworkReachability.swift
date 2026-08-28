// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  NetworkReachability.swift
//  AdguardMini
//

import Foundation
import Network

import AML

extension NWPath {
    /// Returns primary interface name we care about (wifi/cellular/ethernet, excluding utun)
    fileprivate func primaryInterfaceName() -> String? {
        for iface in self.availableInterfaces {
            switch iface.type {
            case .wifi, .cellular, .wiredEthernet:
                if !iface.name.hasPrefix("utun") {
                    return iface.name
                }
            default:
                continue
            }
        }
        return nil
    }
}

protocol NetworkReachability {
    func isAvailable() -> Bool
}

/// Minimal reachability wrapper.
final class NetworkReachabilityImpl: NetworkReachability {
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkReachability.monitor")

    private let eventBus: EventBus

    init(eventBus: EventBus) {
        self.eventBus = eventBus
        self.startMonitoring()
    }

    deinit {
        self.stopMonitoring()
    }

    /// Returns current known status.
    func isAvailable() -> Bool {
        self.monitor.currentPath.status == .satisfied
    }

    private func startMonitoring() {
        var prevIface: String?
        // By design
        // swiftlint:disable:next discouraged_optional_boolean
        var wasReachable: Bool?

        self.monitor.pathUpdateHandler = { [weak self] path in
            guard let self else { return }

            // Compute simple values first (helps the type-checker)
            let iface: String? = path.primaryInterfaceName()
            let isCurrentlyReachable: Bool = (path.status == .satisfied)

            // Logging current snapshot
            LogDebug("PathUpdateHandler: iface=\(iface ?? "nil"), reachable=\(isCurrentlyReachable)")

            var notifyNetworkChanged = false

            if prevIface != iface {
                prevIface = iface
                notifyNetworkChanged = true
            }

            if let prev = wasReachable {
                if prev != isCurrentlyReachable {
                    notifyNetworkChanged = true
                    LogInfo("Network is \(isCurrentlyReachable ? "reachable" : "unreachable")")
                }
            } else {
                notifyNetworkChanged = true
                LogDebug("Initial reachability observation")
            }

            wasReachable = isCurrentlyReachable

            if notifyNetworkChanged, iface != nil {
                self.eventBus.post(event: .networkStatusChanged, userInfo: isCurrentlyReachable)
            }
        }

        self.monitor.start(queue: self.queue)
    }

    private func stopMonitoring() {
        self.monitor.cancel()
    }
}
