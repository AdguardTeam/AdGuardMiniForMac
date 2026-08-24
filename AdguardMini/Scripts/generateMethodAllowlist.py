#!/usr/bin/env python3
# SPDX-FileCopyrightText: AdGuard Software Limited
#
# SPDX-License-Identifier: GPL-3.0-or-later

"""Emits ServiceMethodAllowlist.swift from schema/services/*.proto.

Post-processing step appended to updateProtoSchema.sh. The external
@adg/proto-generator package is NOT modified; this script reads the same
schema/*.proto files the codegen already consumes and publishes each inbound
service's declared rpc method names as a Swift Set so the WKWebViewBridge
dispatcher can reject undeclared methods before dispatch.
"""

import re
import sys
from pathlib import Path

SERVICE_RE = re.compile(r"service\s+(\w+)\s*\{", re.MULTILINE)
RPC_RE = re.compile(r"\brpc\s+(\w+)\s*\(", re.MULTILINE)

HEADER = """\
/// This code was generated automatically by `generateMethodAllowlist.py`
/// from `AdguardMini/ui/schema/services/*.proto`. Do not edit by
/// hand — re-run `Support/Scripts/update_proto_schema.sh` to regenerate.

import Foundation

/// Schema-derived allowlist of method names each inbound RPC service
/// declares. Consulted by `WKWebViewBridge` before dispatch: a method
/// absent from its service's set is rejected at the bridge, the
/// service implementation is never entered, and the caller resolves with an
/// empty payload — identical to today's unknown-method outcome.
public enum ServiceMethodAllowlist {
    /// Returns the set of method names the named service declares in the
    /// schema, or `nil` if `serviceName` is not a generated service.
    ///
    /// `nil` (not an empty set) is returned for non-generated services so
    /// hand-written and test services keep their existing behaviour — the
    /// empty default never silently applies to them. A generated service
    /// with zero declared methods returns an empty set (accepts none).
    public static func declaredMethods(for serviceName: String) -> Set<String>? {
        switch serviceName {
"""

FOOTER = """\
        default:
            return nil
        }
    }
}
"""

# Validated against the proto files.
CASE_TEMPLATE = '        case "{service}":\n            return {set}\n'


def parse_services(services_dir: Path) -> list[tuple[str, set[str]]]:
    """Return [(serviceName, {rpc names})] for every proto service file.

    Only `schema/services/*.proto` (inbound RPC services) are parsed; the
    `schema/callbacks/*.proto` services are Swift->TS pushes routed via
    `dispatchCallback`, not `handleRequest`, and are intentionally excluded.
    """
    result: list[tuple[str, set[str]]] = []
    for proto in sorted(services_dir.glob("*.proto")):
        text = proto.read_text(encoding="utf-8")
        # Strip C-style /* */ comments so an `rpc` inside a doc comment is
        # never mistaken for a real method.
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
        service_match = SERVICE_RE.search(text)
        if service_match is None:
            continue
        name = service_match.group(1)
        methods = set(RPC_RE.findall(text))
        result.append((name, methods))
    return result


def format_set(methods: set[str]) -> str:
    if not methods:
        return "Set<String>()"
    quoted = sorted(f'"{m}"' for m in methods)
    return "[" + ", ".join(quoted) + "]"


def emit(services: list[tuple[str, set[str]]]) -> str:
    body = "".join(
        CASE_TEMPLATE.format(service=name, set=format_set(methods))
        for name, methods in services
    )
    return HEADER + body + FOOTER


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        sys.stderr.write(
            "usage: generateMethodAllowlist.py <services_proto_dir> <output_swift_path>\n"
        )
        return 1
    services_dir = Path(argv[1])
    output_path = Path(argv[2])
    services = parse_services(services_dir)
    if not services:
        # Fail closed: a missing/empty/unparsable services dir must NOT emit
        # an allowlist that only contains `default: return nil` — that would
        # silently disable the schema-level method check for every service
        # (the exact security boundary this script enforces).
        sys.stderr.write(
            f"error: no services parsed from {services_dir}; refusing to emit an "
            "allowlist that silently disables schema-level RPC method checks\n"
        )
        return 1
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(emit(services), encoding="utf-8")
    print(f"ServiceMethodAllowlist: emitted {len(services)} services to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
