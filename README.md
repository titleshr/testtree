# TestTree

> Grow scenario-based fixtures from base data.

TestTree is an open-source CLI tool that helps developers create and maintain test fixtures using a **base template + variants** approach. Instead of duplicating large JSON files for every scenario, you define one base template and a list of targeted patches.

---

## Why Base Template + Variants?

Without TestTree, you end up with many large fixture files that are hard to keep in sync:

```
order_complete.json        ← 50 lines
order_pending.json         ← 50 lines (almost identical)
order_bank_unpaid.json     ← 50 lines (almost identical)
```

With TestTree, you write the shared structure once and only describe what changes:

```
base-template.json  +  variants.json  →  fixtures/
```

Benefits:
- No duplicated data
- Easy to add new scenarios
- Clear intent — each variant only shows what is different
- Works with any JSON domain: orders, users, products, events, API payloads

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/testtree.git
cd testtree

# Install dependencies
npm install

# Run using tsx (no build required)
npx tsx src/cli/index.ts --help
```

---

## Quick Start

### 1. Initialize a workspace

```bash
npx tsx src/cli/index.ts init --out ./examples/order
```

This creates the following files in `./examples/order/`:

```
sample.json           ← paste a real data sample here
condition-catalog.json ← list the fields that vary across scenarios
scenario-plan.json    ← plan which scenarios to generate
base-template.json    ← the shared base data
variants.json         ← the patches for each scenario
```

### 2. Edit the files

Fill in `base-template.json` with your shared base data, then add patches to `variants.json`.

### 3. Generate fixtures

```bash
npx tsx src/cli/index.ts generate \
  --base ./examples/order/base-template.json \
  --variants ./examples/order/variants.json \
  --out ./examples/order/fixtures
```

Output:

```
Generated 4 fixture(s) in ./examples/order/fixtures
```

---

## CLI Reference

### `testtree generate`

Generate fixture files from a base template and a variants list.

```bash
testtree generate --base <path> --variants <path> --out <dir>
```

| Option | Description |
|---|---|
| `--base` | Path to `base-template.json` |
| `--variants` | Path to `variants.json` |
| `--out` | Output directory for generated fixture files |

### `testtree init`

Initialize a workspace with template files to start the workflow.

```bash
testtree init --out <dir> [--force]
```

| Option | Description |
|---|---|
| `--out` | Directory to create workspace files in |
| `--force` | Overwrite existing files (default: false) |

### `testtree inspect`

Inspect all generated fixture files and summarize the unique values found in each field.

This command reads fixture JSON files only — it does **not** scan your source code.

```bash
testtree inspect --fixtures <dir> --out <path>
```

| Option | Description |
|---|---|
| `--fixtures` | Path to the directory containing generated fixture files |
| `--out` | Output path for `fixture-summary.json` |

**Example output (`fixture-summary.json`):**

```json
{
  "fields": {
    "status": {
      "count": 3,
      "values": ["COMPLETE", "PENDING", "PRE_PENDING"]
    },
    "payment.type": {
      "count": 2,
      "values": ["COD", "BANK"]
    },
    "payment.isCompleted": {
      "count": 2,
      "values": [true, false]
    },
    "basket.products.0.isFree": {
      "count": 2,
      "values": [false, true]
    }
  }
}
```

### `testtree catalog`

Generate `condition-catalog.json` from a `fixture-summary.json` file. Marks fields with more than one unique value as condition fields.

```bash
testtree catalog --summary <path> --out <path> --domain <name>
```

| Option | Description |
|---|---|
| `--summary` | Path to `fixture-summary.json` |
| `--out` | Output path for `condition-catalog.json` |
| `--domain` | Domain name label (e.g. `order`, `user`) |

### `testtree scan-code`

Scan source files for condition patterns using **text-based regex matching** (no AST). Best-effort accuracy.

```bash
testtree scan-code --project <dir> --out <path> [--include <globs>] [--ignore <names>]
```

| Option | Description |
|---|---|
| `--project` | Source directory to scan |
| `--out` | Output path for `code-conditions.json` |
| `--include` | Comma-separated glob patterns to include (e.g. `"src/**/*.ts"`) |
| `--ignore` | Comma-separated directory names to ignore (default: node_modules,dist,build,coverage,.git) |

Detects: `===`, `!==`, `==`, `!=` comparisons, and `switch/case` patterns.

### `testtree scan-ts`

Scan TypeScript source files using **AST analysis via ts-morph**. Higher accuracy than `scan-code`.

```bash
testtree scan-ts --project <dir> --out <path> [--tsconfig <path>]
```

| Option | Description |
|---|---|
| `--project` | Source directory to scan |
| `--out` | Output path for `ts-conditions.json` |
| `--tsconfig` | Optional path to `tsconfig.json` |

Detects: binary expressions, switch statements, enum declarations, const object string values.

### `testtree summarize-conditions`

Convert `code-conditions.json` or `ts-conditions.json` into a field summary compatible with the `catalog` command.

```bash
testtree summarize-conditions --conditions <path> --out <path>
```

| Option | Description |
|---|---|
| `--conditions` | Path to `code-conditions.json` or `ts-conditions.json` |
| `--out` | Output path for summary JSON (same format as `fixture-summary.json`) |

The output can be piped directly into `testtree catalog`:

```bash
testtree summarize-conditions --conditions ./ts-conditions.json --out ./ts-summary.json
testtree catalog --summary ./ts-summary.json --out ./condition-catalog.json --domain order
```

---

### `testtree merge-summary`

Compare values discovered from source code with values covered by your fixtures. Generates a `coverage-summary.json` that shows which values are missing and what percentage of code-discovered conditions your fixtures cover.

**Purpose:** After scanning your code and generating fixtures, use this command to answer: *"Which enum values or conditions does my code handle that my fixtures don't cover yet?"*

```bash
testtree merge-summary --code-summary <path> --fixture-summary <path> --out <path>
```

| Option | Description |
|---|---|
| `--code-summary` | Path to `ts-summary.json` or `code-summary.json` |
| `--fixture-summary` | Path to `fixture-summary.json` |
| `--out` | Output path for `coverage-summary.json` |

**Example output:**

```json
{
  "fields": {
    "payment.type": {
      "codeValues": ["COD", "BANK", "QR"],
      "fixtureValues": ["COD", "BANK"],
      "missingInFixtures": ["QR"],
      "extraInFixtures": [],
      "coverage": {
        "covered": 2,
        "total": 3,
        "percent": 66.67
      }
    }
  }
}
```

**How to identify missing fixture values:**

- `missingInFixtures` — values your code handles but no fixture covers yet; add variants for these
- `extraInFixtures` — values in fixtures not seen in code; may be legacy or over-specified
- `coverage.percent` — percentage of code-discovered values covered by fixtures; aim for 100%

**Full coverage workflow:**

```bash
# 1. Scan your project
testtree scan-ts --project ./src --out ./ts-conditions.json

# 2. Summarize conditions
testtree summarize-conditions --conditions ./ts-conditions.json --out ./ts-summary.json

# 3. Generate and inspect fixtures
testtree generate --base ./base-template.json --variants ./variants.json --out ./fixtures
testtree inspect --fixtures ./fixtures --out ./fixture-summary.json

# 4. Check coverage
testtree merge-summary --code-summary ./ts-summary.json --fixture-summary ./fixture-summary.json --out ./coverage-summary.json
```

---

### `testtree scan-db`

Scan a MongoDB collection for distinct field values. **Read-only** — never writes to the database.

> **Prerequisite:** `scan-db` requires two packages — `mongodb` and `socks`. The `socks` package is needed by the MongoDB driver when connecting via DNS SRV (`mongodb+srv://`) or through a proxy. Install both before running:
> ```bash
> npm install mongodb socks
> ```

```bash
testtree scan-db \
  --uri "$MONGO_URI" \
  --database <name> \
  --collection <name> \
  --fields <field1,field2,...> \
  --out <path>
```

| Option | Description |
|---|---|
| `--uri` | MongoDB connection URI (keep in env var, never hardcode) |
| `--database` | Database name |
| `--collection` | Collection name |
| `--fields` | Comma-separated field names to scan |
| `--out` | Output path for `db-summary.json` |

**Usage:**

```bash
testtree scan-db \
  --uri "$MONGO_URI" \
  --database mydb \
  --collection orders \
  --fields status,payment.type,channel \
  --out ./testtree/db-summary.json
```

**Example output (`db-summary.json`):**
```json
{
  "fields": {
    "status": {
      "count": 3,
      "values": ["PENDING", "COMPLETE", "CANCEL"]
    },
    "payment.type": {
      "count": 2,
      "values": ["COD", "BANK"]
    }
  },
  "meta": {
    "source": "mongodb",
    "database": "mydb",
    "collection": "orders"
  }
}
```

> **Safety notes:**
> - `scan-db` is **read-only**. It only runs `distinct` queries — no insert, update, delete, or index operations.
> - The MongoDB URI is **never logged**. Always pass it via an environment variable (`$MONGO_URI`), never hardcode it.
> - Dotted field paths (e.g. `payment.type`) are supported — MongoDB `distinct` handles nested fields natively.
> - If you see `Error: Optional module 'socks' not found`, run `npm install socks` — the MongoDB driver requires it for `mongodb+srv://` URIs and proxy connections.

---

### `testtree scan-schema`

Scan TypeScript source files for schema definitions and validation rules. Detects TypeScript enums, Zod schemas, and class-validator decorators.

```bash
testtree scan-schema --project <dir> --out <path>
```

| Option | Description |
|---|---|
| `--project` | Project source directory to scan |
| `--out` | Output path for `schema-summary.json` |
| `--tsconfig` | Path to `tsconfig.json` (optional) |

**Detects:**
- TypeScript enums → values + rule `"enum"`
- `z.enum([...])` inside `z.object()` → values + rule `"enum"`, supports nested paths
- `z.nativeEnum(X)` → rule `"nativeEnum"`
- `z.number().min(N)` / `.max(N)` → rules `"min:N"` / `"max:N"`
- `z.string().minLength(N)` / `.maxLength(N)` → rules
- `@IsEnum`, `@IsNotEmpty`, `@Min`, `@Max`, `@MinLength`, `@MaxLength` on class properties

**Usage:**

```bash
testtree scan-schema \
  --project ./src \
  --out ./testtree/schema-summary.json
```

**Example output (`schema-summary.json`):**
```json
{
  "fields": {
    "status": {
      "values": ["PENDING", "COMPLETE", "CANCEL"],
      "rules": ["enum"]
    },
    "payment.type": {
      "values": [],
      "rules": ["nativeEnum"]
    },
    "amount": {
      "values": [],
      "rules": ["min:0", "max:999999"]
    }
  }
}
```

---

### `testtree show-summary`

Display any summary JSON file in human-readable plain text. Works with `ts-summary.json`, `code-summary.json`, and `fixture-summary.json`.

```bash
testtree show-summary --summary <path> [--fields <fields>]
```

| Option | Description |
|---|---|
| `--summary` | Path to any summary JSON file |
| `--fields` | Comma-separated list of fields to display (optional) |
| `--out` | Save output to a `.txt` or `.md` file instead of printing (optional) |

**Show all fields in terminal:**

```bash
testtree show-summary --summary ./testtree/ts-summary.json
```

```
status:
- PRE_PENDING
- PENDING
- COMPLETE

payment.type:
- COD
- BANK
- QR
```

**Show specific fields only:**

```bash
testtree show-summary --summary ./testtree/ts-summary.json --fields status,payment.type
```

**Save output to file:**

```bash
testtree show-summary --summary ./testtree/ts-summary.json --out ./testtree/ts-summary.txt
testtree show-summary --summary ./testtree/ts-summary.json --out ./testtree/ts-summary.md
```

---

### `testtree generate-template`

Generate `base-template.json` from a real sample JSON file. Removes unstable fields (`_id`, `id`, `createdAt`, `updatedAt`, `deletedAt`) at all nesting levels by default.

```bash
testtree generate-template --sample <path> --out <path>
```

| Option | Description |
|---|---|
| `--sample` | Path to sample JSON file |
| `--out` | Output path for base-template.json |
| `--ignore` | Comma-separated extra fields to remove (optional) |

**Basic usage:**

```bash
testtree generate-template \
  --sample ./testtree/sample.json \
  --out ./testtree/base-template.json
```

**With custom ignore list:**

```bash
testtree generate-template \
  --sample ./testtree/sample.json \
  --out ./testtree/base-template.json \
  --ignore "internalRef,secretToken"
```

**Example:**

Input (`sample.json`):
```json
{
  "_id": "64a1f2e3b4c5d6e7f8a9b0c1",
  "status": "COMPLETE",
  "payment": {
    "_id": "64a1f2e3b4c5d6e7f8a9b0c2",
    "type": "COD",
    "amount": 250
  },
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

Output (`base-template.json`):
```json
{
  "status": "COMPLETE",
  "payment": {
    "type": "COD",
    "amount": 250
  }
}
```

---

### `testtree suggest-variants`

Generate suggested variant patches from values missing in `coverage-summary.json`. Each missing value becomes a draft variant patch with a descriptive name.

```bash
testtree suggest-variants --coverage <path> --out <path>
```

| Option | Description |
|---|---|
| `--coverage` | Path to coverage-summary.json |
| `--out` | Output path for suggested-variants.json |

**Usage:**

```bash
testtree suggest-variants \
  --coverage ./testtree/coverage-summary.json \
  --out ./testtree/suggested-variants.json
```

**Example:**

Input (`coverage-summary.json`):
```json
{
  "fields": {
    "payment.type": {
      "missingInFixtures": ["QR"],
      "..."
    }
  }
}
```

Output (`suggested-variants.json`):
```json
[
  {
    "name": "payment_type_qr_case",
    "purpose": "Cover missing value payment.type=QR",
    "patch": {
      "payment.type": "QR"
    }
  }
]
```

Variant names follow `<field_snake_case>_<value_snake_case>_case` pattern.

---

## Example Input / Output

**base-template.json**

```json
{
  "status": "PENDING",
  "payment": {
    "type": "COD",
    "balance": 250,
    "isCompleted": true
  }
}
```

**variants.json**

```json
[
  {
    "name": "order_complete",
    "purpose": "Completed COD order",
    "patch": {
      "status": "COMPLETE"
    }
  },
  {
    "name": "order_bank_unpaid",
    "purpose": "Unpaid bank transfer order",
    "patch": {
      "payment.type": "BANK",
      "payment.balance": 100,
      "payment.isCompleted": false
    }
  }
]
```

**Generated: `fixtures/order_complete.json`**

```json
{
  "status": "COMPLETE",
  "payment": {
    "type": "COD",
    "balance": 250,
    "isCompleted": true
  }
}
```

**Generated: `fixtures/order_bank_unpaid.json`**

```json
{
  "status": "PENDING",
  "payment": {
    "type": "BANK",
    "balance": 100,
    "isCompleted": false
  }
}
```

---

## Patch Path Syntax

| Syntax | Description | Example |
|---|---|---|
| `"field"` | Top-level field | `"status": "COMPLETE"` |
| `"a.b"` | Nested field path | `"payment.type": "BANK"` |
| `"a.0.b"` | Array index path | `"basket.products.0.isFree": true` |
| `"field": null` | Replace with null | `"payment": null` |
| `"field": {...}` | Replace with object | `"payment": { "type": "QR" }` |
| `"field": [...]` | Replace with array | `"tags": ["A", "B"]` |

---

## Phase 2 Workflow

Phase 2 adds manual-assisted planning files to help you think through your test scenarios before generating fixtures.

```
sample.json
  → condition-catalog.json   (which fields vary and how)
  → scenario-plan.json       (which scenarios to cover)
  → base-template.json       (the shared base)
  → variants.json            (the patches)
  → fixtures/                (generated output)
  → fixture-summary.json     (inspect output — unique values per field)
```

**`condition-catalog.json`** — document the fields that affect behavior:

```json
{
  "domain": "order",
  "fields": [
    {
      "fieldPath": "payment.type",
      "sampleValue": "COD",
      "possibleValues": ["COD", "BANK", "QR"],
      "sources": ["sample", "manual"],
      "isConditionField": true,
      "notes": "Payment method affects payment behavior"
    }
  ]
}
```

**`scenario-plan.json`** — plan which combinations to test:

```json
{
  "domain": "order",
  "strategy": "balanced",
  "scenarios": [
    {
      "name": "order_complete_cod",
      "purpose": "Complete COD order",
      "coveredConditions": ["status=COMPLETE", "payment.type=COD"],
      "priority": "HIGH"
    }
  ]
}
```

---

## Phase 7 — Project-local Usage

After installing TestTree as a dependency in any project, run two commands to get started:

```bash
npx testtree init-config
npx testtree flow
```

### `testtree init-config`

Creates `testtree.config.json` and the default workspace files in the current directory.

```bash
testtree init-config [--force]
```

Files created:

```
testtree.config.json       ← config file (edit domain, paths, etc.)
testtree/
  base-template.json       ← base fixture template
  variants.json            ← variant patches
  fixtures/                ← generated fixtures will go here
```

Use `--force` to overwrite existing files.

### `testtree flow`

Runs the full 6-step workflow using `testtree.config.json` (or defaults if no config file is present):

```bash
testtree flow [--config <path>]
```

Steps:

1. `scan-ts` — scan your project for conditions
2. `summarize-conditions` — group conditions by field
3. `catalog` — generate condition catalog
4. `generate` — generate fixtures from base + variants
5. `inspect` — summarize fixture field values
6. `merge-summary` — compare code conditions vs fixture coverage

Output files:

```
testtree/
  ts-conditions.json
  ts-summary.json
  condition-catalog.json
  fixtures/
  fixture-summary.json
  coverage-summary.json
```

### Config file: `testtree.config.json`

```json
{
  "project": "./src",
  "outputDir": "./testtree",
  "domain": "order",
  "base": "./testtree/base-template.json",
  "variants": "./testtree/variants.json",
  "fixtures": "./testtree/fixtures"
}
```

Config resolution priority:
1. CLI options (`--config`) override everything
2. `testtree.config.json` values override defaults
3. Defaults are used when no config is present

If `./src` does not exist, `project` automatically falls back to `"."`.

### Full workflow for a new project

```bash
# Install TestTree
npm install -D testtree

# Initialize workspace
npx testtree init-config

# Edit testtree.config.json to set your domain
# Edit testtree/base-template.json with your data shape
# Edit testtree/variants.json with your scenarios

# Run the full workflow
npx testtree flow
```

---

## Project Philosophy

- **Simple over clever** — the code is beginner-friendly by design
- **Minimal scope** — each phase adds exactly one capability
- **Domain-agnostic** — works with orders, users, products, or any JSON data
- **No magic** — what you patch is what you get

---

## Roadmap

### Phase 3 — Condition Catalog Generator ✓

- Generate `condition-catalog.json` from `fixture-summary.json`
- Automatically marks fields with multiple values as condition fields

### Phase 4 — Simple Code Scanner ✓

- Regex-based condition detection from source files
- Detects `===`, `!==`, `==`, `!=`, and `switch/case` patterns
- Best-effort accuracy, supports glob `--include` patterns

### Phase 5 — TypeScript AST Scanner ✓

- AST-based scanning using `ts-morph`
- Detects binary expressions, switch statements, enum declarations, const objects
- Higher accuracy than Phase 4

### Phase 6 — Fixture Coverage ✓

- `merge-summary` command compares code-discovered values vs fixture coverage
- Reports missing and extra fixture values, coverage percentage

### Phase 7 — Project-local Usage & Config ✓

- `init-config` command creates `testtree.config.json` and workspace files
- `flow` command runs the full workflow from a single command
- Config resolution with CLI > config file > defaults priority

### Phase 7.5 — Show Summary ✓

- `show-summary` command renders summary JSON as readable plain text
- Supports `--fields` filter and `--out` to save to file

### Phase 8 — Generate Base Template From Sample ✓

- `generate-template` command generates `base-template.json` from a real sample JSON
- Removes unstable fields (`_id`, `id`, `createdAt`, `updatedAt`, `deletedAt`) recursively
- Supports custom `--ignore` list

### Phase 9 — Suggest Variants From Coverage ✓

- `suggest-variants` command generates suggested variant patches from coverage gaps
- Naming rule: `<field>_<value>_case` in snake_case

### Phase 10 — DTO / Schema Scanner ✓

- `scan-schema` command scans TypeScript enums, Zod, and class-validator
- Detects values from `z.enum()`, rules from `@Min`, `@IsNotEmpty`, etc.
- Supports nested `z.object()` → dotted field paths like `payment.type`

### Phase 11 — Database Scanner ✓

- `scan-db` command discovers real values from MongoDB (read-only)
- Runs `distinct` queries only — never writes to the database
- URI is never logged to protect credentials

### Phase 12 — Multi-source Condition Merger

- `merge-conditions` command merges code, fixture, schema, and DB summaries

---

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Run example: generate fixtures
npm run generate:example

# Run example: init workspace
npm run init:example

# Run example: inspect fixtures
npm run inspect:example

# Run example: generate condition catalog from fixture summary
npm run catalog:example

# Run example: scan source code (regex)
npm run scan-code:example

# Run example: scan TypeScript (AST)
npm run scan-ts:example

# Run example: summarize code scanner output
npm run summarize-code:example

# Run example: summarize ts scanner output
npm run summarize-ts:example
```

---

## License

ISC
