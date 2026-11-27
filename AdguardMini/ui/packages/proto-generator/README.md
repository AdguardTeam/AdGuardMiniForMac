# Proto generator

`@adg/proto-generator` is the local Yarn workspace package that generates
Swift and TypeScript sources from the Protobuf schema in
`AdguardMini/ui/schema`. The converter code lives in `proto-parser/src`.

## Requirements

The Python dependencies are pinned in `requirements.txt`:

- `Jinja2==3.1.6`
- `protobuf==7.36.2`

`./configure.sh dev` creates the `.venv` virtual environment from `python3`
on `PATH` (3.10+ is required by the `protobuf` pin; pip rejects an older
interpreter), activates it, and installs these pins. It recreates an existing
`.venv` that a different Python version built.
`./Support/Scripts/update_proto_schema.sh` runs the generator with the `.venv`
interpreter, so the calling shell does not need an active virtual
environment.

The generator does not parse `.proto` files itself. It compiles the schema
once with `protoc --descriptor_set_out --include_source_info`, reads the
services, the RPC methods and the doc comments from the descriptor with the
`protobuf` runtime, and feeds them to the templates. `protoc` 31.1 is
therefore required and is pinned by `.protoc-version`; the `proto-check` CI
job verifies its downloaded Linux archive against `.protoc-checksum`.

Swift generation runs `protoc` with the `protoc-gen-swift` plugin;
`update_proto_schema.sh` puts `build/protoc-tools/bin` on `PATH`. TypeScript
generation runs `protoc` with the `protoc-gen-ts` plugin from
`node_modules/.bin`, which `yarn install` provides.

## Regeneration

Run the wrapper from the repository root:

```bash
./Support/Scripts/update_proto_schema.sh
```

The wrapper regenerates both languages, generates the service method
allowlist, and adds SPDX headers to the generated Swift sources.

The wrapper writes:

- Swift: `AdguardMini/MiniResources/ProtoSchema/Sources` with the `services`,
  `types`, and `callbacks` folders. The hand-written `WebView` folder is not
  regenerated.
- TypeScript: `AdguardMini/ui/modules/common/apis` with the `types`,
  `requests`, and `callbacks` folders, plus the `impl` folder for the callback
  implementations.

`protoc` with the language plugin generates the `types` trees. The templates
generate the Swift service files, the TypeScript request classes, and the
callback classes.

Files whose service postfix is listed in `seed_dirs` are seeds for
implementation files. The generator writes such a file only when it does not
exist, and never overwrites it. The wrapper never deletes that folder, so a
hand-written implementation is safe across regeneration.

## Command-line interface

The generator accepts four required flags:

- `-l`, `--languages`: language to generate. Repeat the flag to generate
  several languages; the accepted values are `swift` and `typescript`.
- `-i`, `--input-dir`: directory that holds the `services`, `types`, and
  `callbacks` schema folders.
- `-o`, `--output-dir`: directory for the generated trees.
- `-c`, `--configs-dir`: directory that holds the `<language>.json` config
  files.

Example:

`protoc` and `protoc-gen-swift` are resolved from `PATH`, so the example puts
the pinned tools installed by `./configure.sh dev` first:

```bash
export PATH="$PWD/build/protoc-tools/bin:$PATH"
.venv/bin/python3 \
    AdguardMini/ui/packages/proto-generator/proto-parser/src/main.py \
    -l swift -l typescript \
    -i AdguardMini/ui/schema \
    -o .temp/generated \
    -c AdguardMini/ui/schema/.protocfg
```

## Configuration

The configs directory holds one file per language:

- `swift.json`: `service_class_name` (`WebViewBridge`),
  `callback_class_name` (`WebViewCallbackBridge`), and `service_protocol`
  (`Service`).
- `typescript.json`: `param_name` (`param`), `array_buffer_type_name`
  (`ArrayBuffer`), `service_postfixes` (`["", "Internal"]`), and
  `seed_dirs` (postfix to output subdirectory, here
  `{"Internal": "impl"}`).

## Templates

The `proto-parser/templates` directory holds six Jinja2 templates. Per-file
templates use the pattern `%type%_%language%%postfix%.j2`:

- `services_swift.j2`: Swift service protocol and bridge class.
- `callbacks_swift.j2`: Swift callback bridge class.
- `requests_typescript.j2`: TypeScript request class for one service method.
- `callbacks_typescript.j2`: TypeScript callback service with its public and
  internal interfaces.
- `callbacks_typescriptInternal.j2`: seed for a hand-written TypeScript
  `*Internal` callback class. The `Internal` service postfix selects this
  template, and `seed_dirs` sends its output to the `impl` folder. An existing file is never overwritten.

The aggregate pattern `super_<type>_<language>.j2` emits one barrel file:

- `super_types_typescript.j2`: the `types/index.ts` barrel that re-exports
  every generated type.

In the per-file pattern, `%type%` is the file type (`services`,
`callbacks`, or `requests`), `%language%` is the language name, and
`%postfix%` is a service postfix from the language config or empty. In the
aggregate pattern, `%type%` names the output family (`types`).
