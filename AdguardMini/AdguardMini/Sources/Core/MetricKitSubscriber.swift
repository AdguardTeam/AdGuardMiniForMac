// SPDX-FileCopyrightText: AdGuard Software Limited
//
// SPDX-License-Identifier: GPL-3.0-or-later

//
//  MetricKitSubscriber.swift
//  AdguardMini
//

import Foundation
import MetricKit

import AML

// MARK: - MetricKitSubscriber

protocol MetricKitSubscriber: RestartableService {
    /// Returns a human-readable summary of the most recent MetricKit payloads.
    func stateDescription() -> String
}

// MARK: - MetricKitSubscriberImpl

/// Subscribes to `MXMetricManager` and writes daily metric and diagnostic payloads to the log.
///
/// - Warning: Not thread-safe. `start()` and `stop()` must be called from the same thread.
///   `MXMetricManagerSubscriber` callbacks may arrive on any thread.
final class MetricKitSubscriberImpl: NSObject, MetricKitSubscriber, MXMetricManagerSubscriber {
    private static let tag = "[MetricKit]"

    private(set) var isStarted: Bool = false

    func start() {
        guard !self.isStarted else { return }
        self.isStarted = true
        MXMetricManager.shared.add(self)
        LogInfo("\(Self.tag) Subscriber registered")
    }

    func stop() {
        guard self.isStarted else { return }
        self.isStarted = false
        MXMetricManager.shared.remove(self)
        LogInfo("\(Self.tag) Subscriber removed")
    }

    // MARK: - MXMetricManagerSubscriber

    func didReceive(_ payloads: [MXMetricPayload]) {
        for payload in payloads {
            self.logMetricPayload(payload)
        }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads {
            self.logDiagnosticPayload(payload)
        }
    }

    // MARK: - MetricKitSubscriber

    func stateDescription() -> String {
        let metricLines = MXMetricManager.shared.pastPayloads.map { payload in
            let period = self.period(begin: payload.timeStampBegin, end: payload.timeStampEnd)
            return "    \(period): \(self.metricParts(from: payload).summaryOrNone)"
        }
        let diagLines = MXMetricManager.shared.pastDiagnosticPayloads.compactMap { payload -> String? in
            let period = self.period(begin: payload.timeStampBegin, end: payload.timeStampEnd)
            let parts = self.diagnosticParts(from: payload)
            guard !parts.isEmpty else { return nil }
            return "    \(period): \(parts.joined(separator: ", "))"
        }
        var lines = ["MetricKit:"]
        lines += metricLines.isEmpty ? ["    no data"] : metricLines
        if !diagLines.isEmpty {
            lines.append("Diagnostics:")
            lines += diagLines
        }
        return lines.joined(separator: "\n")
    }

    // MARK: - Private

    private static let dateFormatter: DateFormatter = {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt
    }()

    /// Formats a date range as `yyyy-MM-dd`, or a single date if begin and end fall on the same day.
    private func period(begin: Date, end: Date) -> String {
        let begin = Self.dateFormatter.string(from: begin)
        let end = Self.dateFormatter.string(from: end)
        return begin == end ? begin : "\(begin) - \(end)"
    }

    /// Returns all metric log parts: resource usage, timing, and exits.
    private func metricParts(from payload: MXMetricPayload) -> [String] {
        self.resourceParts(from: payload)
            + self.timingParts(from: payload)
            + self.exitParts(from: payload)
    }

    /// Logs a single daily `MXMetricPayload` as one INFO line with all available metrics.
    private func logMetricPayload(_ payload: MXMetricPayload) {
        let period = self.period(begin: payload.timeStampBegin, end: payload.timeStampEnd)
        LogInfo("\(Self.tag) Metrics (\(period)): \(self.metricParts(from: payload).summaryOrNone)")
    }

    /// Returns log parts for resource usage: CPU, memory, disk writes, GPU time, fg/bg time.
    private func resourceParts(from payload: MXMetricPayload) -> [String] {
        var parts: [String] = []
        if let cpu = payload.cpuMetrics {
            parts.append("cpu=\(cpu.cumulativeCPUTime.seconds1f)")
        }
        if let memory = payload.memoryMetrics {
            parts.append("peakMem=\(memory.peakMemoryUsage.megabytes1f)")
        }
        if let diskIO = payload.diskIOMetrics {
            parts.append("diskWrites=\(diskIO.cumulativeLogicalWrites.megabytes1f)")
        }
        if let gpu = payload.gpuMetrics {
            parts.append("gpu=\(gpu.cumulativeGPUTime.seconds1f)")
        }
        if let time = payload.applicationTimeMetrics {
            parts.append("fgTime=\(time.cumulativeForegroundTime.seconds1f)")
            parts.append("bgTime=\(time.cumulativeBackgroundTime.seconds1f)")
        }
        return parts
    }

    /// Returns log parts for user-visible latency: cold launch P50, resume P50, hang time P90.
    private func timingParts(from payload: MXMetricPayload) -> [String] {
        var parts: [String] = []
        if let launch = payload.applicationLaunchMetrics {
            if let p50 = launch.histogrammedTimeToFirstDraw.p50Seconds {
                parts.append("coldLaunchP50=\(p50.seconds2f)")
            }
            if let p50 = launch.histogrammedApplicationResumeTime.p50Seconds {
                parts.append("resumeP50=\(p50.seconds2f)")
            }
        }
        if let responsiveness = payload.applicationResponsivenessMetrics {
            if let p90 = responsiveness.histogrammedApplicationHangTime.p90Seconds {
                parts.append("hangP90=\(p90.seconds2f)")
            }
        }
        return parts
    }

    /// Returns log parts for abnormal exits (watchdog, crash) and OOM kills. Empty if all counts are zero.
    private func exitParts(from payload: MXMetricPayload) -> [String] {
        guard let exits = payload.applicationExitMetrics else { return [] }
        var parts: [String] = []
        let fg = exits.foregroundExitData
        let bg = exits.backgroundExitData
        let abnormal = fg.cumulativeAbnormalExitCount
            + fg.cumulativeAppWatchdogExitCount
            + bg.cumulativeAbnormalExitCount
            + bg.cumulativeAppWatchdogExitCount
        let oom = fg.cumulativeMemoryResourceLimitExitCount
            + bg.cumulativeMemoryResourceLimitExitCount
        if abnormal > 0 { parts.append("abnormalExits=\(abnormal)") }
        if oom > 0 { parts.append("oomExits=\(oom)") }
        return parts
    }

    /// Returns parts for diagnostics: hangs (with durations), crashes, CPU exceptions, disk write exceptions.
    private func diagnosticParts(from payload: MXDiagnosticPayload) -> [String] {
        var parts: [String] = []

        if let hangs = payload.hangDiagnostics, !hangs.isEmpty {
            let durations = hangs
                .map { $0.hangDuration.seconds1f }
                .joined(separator: ", ")
            parts.append("hangs=\(hangs.count) (\(durations))")
        }

        if let crashes = payload.crashDiagnostics, !crashes.isEmpty {
            parts.append("crashes=\(crashes.count)")
        }

        if let cpuExceptions = payload.cpuExceptionDiagnostics, !cpuExceptions.isEmpty {
            parts.append("cpuExceptions=\(cpuExceptions.count)")
        }

        if let diskExceptions = payload.diskWriteExceptionDiagnostics, !diskExceptions.isEmpty {
            parts.append("diskExceptions=\(diskExceptions.count)")
        }

        return parts
    }

    /// Logs a single `MXDiagnosticPayload` as one WARN line. Skipped if the payload contains no diagnostics.
    private func logDiagnosticPayload(_ payload: MXDiagnosticPayload) {
        let period = self.period(begin: payload.timeStampBegin, end: payload.timeStampEnd)
        let parts = self.diagnosticParts(from: payload)
        guard !parts.isEmpty else { return }
        LogWarn("\(Self.tag) Diagnostics (\(period)): \(parts.joined(separator: ", "))")
    }
}

// MARK: - Formatting helpers

private extension [String] {
    var summaryOrNone: String { self.isEmpty ? "no data" : self.joined(separator: ", ") }
}

private extension Measurement where UnitType == UnitDuration {
    var seconds1f: String { String(format: "%.1fs", self.converted(to: .seconds).value) }
}

private extension Measurement where UnitType == UnitInformationStorage {
    var megabytes1f: String { String(format: "%.1fMB", self.converted(to: .megabytes).value) }
}

private extension Double {
    var seconds2f: String { String(format: "%.2fs", self) }
}

// MARK: - MXHistogram + percentile

private extension MXHistogram where UnitType == UnitDuration {
    /// Returns the midpoint of the bucket containing the given percentile (0–1), in seconds.
    func percentileSeconds(_ percentile: Double) -> Double? {
        // Tuple is private and used only within this function; a dedicated type would be over-engineering
        // swiftlint:disable:next large_tuple
        var buckets: [(start: Double, end: Double, count: Int)] = []
        let enumerator = self.bucketEnumerator
        while let bucket = enumerator.nextObject() as? MXHistogramBucket<UnitDuration> {
            guard bucket.bucketCount > 0 else { continue }
            buckets.append((
                start: bucket.bucketStart.converted(to: .seconds).value,
                end: bucket.bucketEnd.converted(to: .seconds).value,
                count: bucket.bucketCount
            ))
        }
        let total = buckets.reduce(0) { $0 + $1.count }
        guard total > 0 else { return nil }
        let threshold = Int((Double(total) * percentile).rounded(.up))
        var cumulative = 0
        for bucket in buckets {
            cumulative += bucket.count
            if cumulative >= threshold {
                return (bucket.start + bucket.end) / 2
            }
        }
        return buckets.last.map { ($0.start + $0.end) / 2 }
    }

    var p50Seconds: Double? { self.percentileSeconds(0.5) }
    var p90Seconds: Double? { self.percentileSeconds(0.9) }
}
