// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  TelemetryServiceImpl.swift
//  AdguardMini
//

import Foundation
import ProtoSchema
import AML

extension TelemetryServiceImpl:
    ABTestsStorageDependent,
    TelemetryServiceDependent {}

final class TelemetryServiceImpl: TelemetryService.ServiceType {
    var abTestsStorage: ABTests.Storage!
    var telemetryService: Telemetry.Service!

    override init() {
        super.init()
        self.setupServices()
    }

    func recordEvent(_ message: TelemetryEvent, _ promise: @escaping (EmptyValue) -> Void) {
        Task {
            guard let messageEvent = message.kind else {
                // Drop invalid events (log + warn, no debug-only assertion so
                // Debug and Release behave identically on this reachable path).
                promise(EmptyValue())
                LogWarn("Invalid telemetry event")
                return
            }

            let event: Telemetry.Event = switch messageEvent {
            case .customEvent(let event):
                Telemetry.Event.customEvent(
                    .init(
                        // The page is remotely updatable, so cap each field at
                        // The bridge boundary to protect analytics integrity.
                        name: Self.capped(event.name),
                        refName: Self.optionalCapped(event.refName),
                        action: event.hasActionName ? Self.optionalCapped(event.actionName) : nil,
                        label: event.hasLabelName ? Self.optionalCapped(event.labelName) : nil
                    )
                )
            case .pageView(let event):
                Telemetry.Event.pageview(
                    .init(
                        name: Self.capped(event.name),
                        refName: event.hasRefName ? Self.optionalCapped(event.refName) : nil
                    )
                )
            }
            await self.telemetryService.sendEvent(event)
            promise(EmptyValue())
        }
    }

    /// Max length for a telemetry string field (protects against a buggy or
    /// compromised page submitting arbitrarily large payloads).
    private static let maxFieldLength = 512

    private static func capped(_ value: String) -> String {
        String(value.prefix(maxFieldLength))
    }

    private static func optionalCapped(_ value: String) -> String {
        capped(value)
    }

    func getActiveABTests(_ message: EmptyValue, _ promise: @escaping (ActiveABTests) -> Void) {
        Task {
            let tests = await self.abTestsStorage.getActiveTests()

            let activeTests = tests.map { exp, opt in
                ABTest(name: exp.toProto(), option: opt.toProto())
            }

            promise(.activeTests(activeTests))
        }
    }
}
