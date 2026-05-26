````md
# TestTree Phase Tasks

Version: Phase 1 → Phase 12

---

# Global Rules

TestTree is a TypeScript CLI tool.

Do:
- Keep code simple and readable
- Add unit tests for every phase
- Update README after each phase
- Run test and build after each phase
- Prefer JSON file-based workflow
- Keep commands deterministic

Do not:
- Add AI API yet
- Add frontend UI
- Add database write/seed yet
- Add complex plugin architecture yet
- Over-engineer abstractions

---

# Phase 1 — Fixture Generator

## Goal

Generate fixture JSON files from one base template and multiple variants.

## Command

```bash
testtree generate \
  --base ./testtree/base-template.json \
  --variants ./testtree/variants.json \
  --out ./testtree/fixtures
````

## Behavior

* Read `base-template.json`
* Read `variants.json`
* Validate variants
* Clone base data for each variant
* Apply variant patch to cloned base
* Write one fixture JSON file per variant
* Create output directory if missing

## Patch Support

Must support:

```json
{
  "status": "COMPLETE",
  "payment.type": "COD",
  "basket.products.0.isFree": true,
  "payment": null
}
```

## Output

```text
fixtures/
  order_complete.json
  order_pending.json
```

## Files

```text
src/core/apply-patch.ts
src/core/generate-fixtures.ts
src/core/read-json.ts
src/core/write-json.ts
src/validation/variant-schema.ts
tests/apply-patch.test.ts
tests/generate-fixtures.test.ts
```

---

# Phase 2 — Workspace Init

## Goal

Create starter workflow files.

## Command

```bash
testtree init --out ./testtree
```

Optional:

```bash
testtree init --out ./testtree --force
```

## Behavior

Create:

```text
sample.json
condition-catalog.json
scenario-plan.json
base-template.json
variants.json
fixtures/
```

Rules:

* Do not overwrite existing files by default
* Overwrite only with `--force`
* Log created/skipped files

## Files

```text
src/core/init-workspace.ts
src/templates/*
tests/init-workspace.test.ts
```

---

# Phase 2.5 — Inspect Fixtures

## Goal

Summarize values from generated fixtures.

## Command

```bash
testtree inspect \
  --fixtures ./testtree/fixtures \
  --out ./testtree/fixture-summary.json
```

## Behavior

* Read all `.json` files in fixtures folder
* Flatten nested objects into field paths
* Support array index paths
* Collect unique values per field
* Count unique values
* Export summary JSON

## Output

```json
{
  "fields": {
    "status": {
      "count": 3,
      "values": ["PRE_PENDING", "PENDING", "COMPLETE"]
    },
    "payment.type": {
      "count": 2,
      "values": ["COD", "BANK"]
    }
  }
}
```

## Value Rules

* Primitive values stay as-is
* Object value becomes `"[object]"`
* Array value becomes `"[array]"`

## Files

```text
src/core/inspect-fixtures.ts
src/core/flatten-object.ts
tests/inspect-fixtures.test.ts
```

---

# Phase 3 — Condition Catalog Generator

## Goal

Convert summary file into condition catalog.

## Command

```bash
testtree catalog \
  --summary ./testtree/fixture-summary.json \
  --out ./testtree/condition-catalog.json \
  --domain order
```

## Behavior

* Read summary file
* Convert every field into catalog item
* Use first value as `sampleValue`
* Use all values as `possibleValues`
* Set `isConditionField = true` when count > 1
* Set `sources = ["fixtures"]`
* Export catalog JSON

## Output

```json
{
  "domain": "order",
  "fields": [
    {
      "fieldPath": "payment.type",
      "sampleValue": "COD",
      "possibleValues": ["COD", "BANK"],
      "sources": ["fixtures"],
      "isConditionField": true,
      "notes": ""
    }
  ]
}
```

## Files

```text
src/core/generate-condition-catalog.ts
tests/generate-condition-catalog.test.ts
```

---

# Phase 4 — Text Code Scanner

## Goal

Scan source code with simple text/regex patterns.

## Command

```bash
testtree scan-code \
  --project ./src \
  --out ./testtree/code-conditions.json
```

## Behavior

* Scan `.ts`, `.tsx`, `.js`, `.jsx`
* Ignore `node_modules`, `dist`, `build`, `coverage`, `.git`
* Detect simple comparisons:

  * `a.b === "VALUE"`
  * `a.b !== "VALUE"`
  * `a.b == "VALUE"`
  * `a.b != "VALUE"`
* Detect switch cases:

  * `case "VALUE":`
* Capture file and line number

## Output

```json
{
  "conditions": [
    {
      "fieldPath": "payment.type",
      "operator": "===",
      "value": "COD",
      "file": "src/order.service.ts",
      "line": 25,
      "sourceType": "comparison"
    }
  ],
  "meta": {
    "scanner": "text",
    "accuracy": "best-effort"
  }
}
```

## Files

```text
src/core/scan-code.ts
src/core/find-source-files.ts
tests/scan-code.test.ts
```

---

# Phase 5 — TypeScript AST Scanner

## Goal

Scan TypeScript source code more accurately using `ts-morph`.

## Command

```bash
testtree scan-ts \
  --project ./src \
  --out ./testtree/ts-conditions.json
```

Optional:

```bash
testtree scan-ts \
  --project ./src \
  --out ./testtree/ts-conditions.json \
  --tsconfig ./tsconfig.json
```

## Behavior

Use `ts-morph` to detect:

* Binary expressions
* Switch cases
* Enum declarations
* Simple const object string values

Examples:

```ts
if (order.status === "COMPLETE") {}
switch (payment.type) { case "COD": break }
enum Status { COMPLETE = "COMPLETE" }
const PaymentType = { COD: "COD", BANK: "BANK" }
```

## Output

```json
{
  "conditions": [
    {
      "fieldPath": "order.status",
      "operator": "===",
      "value": "COMPLETE",
      "file": "src/order.service.ts",
      "line": 20,
      "sourceType": "binary-expression"
    }
  ],
  "meta": {
    "scanner": "ts-morph",
    "accuracy": "ast-based"
  }
}
```

## Files

```text
src/core/scan-typescript.ts
tests/scan-typescript.test.ts
```

---

# Phase 5.5 — Summarize Conditions

## Goal

Convert condition scanner output into summary format.

## Command

```bash
testtree summarize-conditions \
  --conditions ./testtree/ts-conditions.json \
  --out ./testtree/ts-summary.json
```

## Behavior

* Read `conditions` array
* Group records by `fieldPath`
* Collect unique values
* Count unique values
* Ignore invalid records safely
* Export summary format compatible with `fixture-summary.json`

## Output

```json
{
  "fields": {
    "payment.type": {
      "count": 3,
      "values": ["COD", "BANK", "QR"]
    }
  }
}
```

## Files

```text
src/core/summarize-conditions.ts
tests/summarize-conditions.test.ts
```

---

# Phase 6 — Merge Summary / Fixture Coverage

## Goal

Compare code-discovered values with fixture values.

## Command

```bash
testtree merge-summary \
  --code-summary ./testtree/ts-summary.json \
  --fixture-summary ./testtree/fixture-summary.json \
  --out ./testtree/coverage-summary.json
```

## Behavior

* Read code summary
* Read fixture summary
* Compare fields and values
* Show values missing in fixtures
* Show values extra in fixtures
* Calculate coverage percentage

## Output

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

## Files

```text
src/core/merge-summaries.ts
tests/merge-summaries.test.ts
```

---

# Phase 7 — Project-local Config & Flow

## Goal

Allow users to install TestTree inside any project and run it without passing long paths.

## Commands

```bash
testtree init-config
testtree flow
```

## Config File

Create/read:

```text
testtree.config.json
```

Example:

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

## Config Priority

1. CLI options
2. config file
3. defaults

## Defaults

```json
{
  "project": "./src",
  "outputDir": "./testtree",
  "domain": "unknown",
  "base": "./testtree/base-template.json",
  "variants": "./testtree/variants.json",
  "fixtures": "./testtree/fixtures"
}
```

If `./src` does not exist, fallback to `"."`.

## Flow Behavior

`testtree flow` runs:

```text
scan-ts
→ summarize-conditions
→ catalog
→ generate
→ inspect
→ merge-summary
```

Expected output:

```text
testtree/
  ts-conditions.json
  ts-summary.json
  condition-catalog.json
  fixtures/
  fixture-summary.json
  coverage-summary.json
```

## Files

```text
src/core/load-config.ts
src/core/init-config.ts
src/core/run-flow.ts
tests/load-config.test.ts
tests/init-config.test.ts
tests/run-flow.test.ts
```

---

# Phase 7.5 — Show Summary

## Goal

Display summary JSON as readable plain text.

## Command

```bash
testtree show-summary \
  --summary ./testtree/ts-summary.json
```

Optional:

```bash
testtree show-summary \
  --summary ./testtree/ts-summary.json \
  --fields status,payment.type,channel
```

## Behavior

* Read summary JSON
* Print all fields by default
* If `--fields` is provided, print only selected fields
* Show missing selected fields as `(no values found)`
* Show empty summary as `No fields found.`

## Output

```text
status:
- PRE_PENDING
- PENDING
- COMPLETE
- CANCEL
- REMOVE

payment.type:
- COD
- BANK
- QR
```

## Files

```text
src/core/show-summary.ts
tests/show-summary.test.ts
```

---

# Phase 8 — Generate Base Template From Sample

## Goal

Generate `base-template.json` from a real sample JSON.

## Command

```bash
testtree generate-template \
  --sample ./testtree/sample.json \
  --out ./testtree/base-template.json
```

## Behavior

* Read sample JSON
* Copy reusable structure
* Remove unstable fields by default
* Keep nested structure
* Keep primitive values
* Export base template

## Default Ignored Fields

```text
_id
id
createdAt
updatedAt
deletedAt
```

Support option:

```bash
--ignore "_id,createdAt,updatedAt"
```

## Output

Input:

```json
{
  "_id": "abc",
  "status": "COMPLETE",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

Output:

```json
{
  "status": "COMPLETE"
}
```

## Files

```text
src/core/generate-template.ts
tests/generate-template.test.ts
```

---

# Phase 9 — Suggest Variants From Coverage

## Goal

Suggest variant patches for values missing in fixtures.

## Command

```bash
testtree suggest-variants \
  --coverage ./testtree/coverage-summary.json \
  --out ./testtree/suggested-variants.json
```

## Behavior

* Read coverage summary
* Find `missingInFixtures`
* Generate one suggested variant per missing value
* Do not overwrite existing variants
* Output suggested variants as draft

## Output

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

## Naming Rule

Convert field/value into snake case:

```text
payment.type=QR → payment_type_qr_case
status=CANCEL → status_cancel_case
```

## Files

```text
src/core/suggest-variants.ts
tests/suggest-variants.test.ts
```

---

# Phase 10 — DTO / Schema Scanner

## Goal

Scan schemas and validators to discover possible values and validation rules.

## Command

```bash
testtree scan-schema \
  --project ./src \
  --out ./testtree/schema-summary.json
```

## Behavior

Detect:

* TypeScript enums
* Zod enum
* Zod nativeEnum
* class-validator decorators
* simple required fields
* simple string/number constraints

Examples:

```ts
z.enum(["COD", "BANK"])
@IsEnum(OrderStatus)
@IsNotEmpty()
@Min(1)
```

## Output

```json
{
  "fields": {
    "payment.type": {
      "values": ["COD", "BANK"],
      "rules": ["enum"]
    },
    "amount": {
      "values": [],
      "rules": ["min:1"]
    }
  }
}
```

## Files

```text
src/core/scan-schema.ts
tests/scan-schema.test.ts
```

---

# Phase 11 — Database Scanner

## Goal

Discover real values from MongoDB collections using distinct queries.

## Command

```bash
testtree scan-db \
  --uri "$MONGO_URI" \
  --database mydb \
  --collection orders \
  --fields status,payment.type,channel \
  --out ./testtree/db-summary.json
```

## Behavior

* Connect MongoDB read-only
* Run distinct for each field
* Export values found in real data
* Never write to database
* Avoid logging credentials

## Output

```json
{
  "fields": {
    "status": {
      "count": 3,
      "values": ["PENDING", "COMPLETE", "CANCEL"]
    }
  },
  "meta": {
    "source": "mongodb",
    "database": "mydb",
    "collection": "orders"
  }
}
```

## Files

```text
src/core/scan-db.ts
tests/scan-db.test.ts
```

Use mocked MongoDB client in tests.

---

# Phase 12 — Multi-source Condition Merger

## Goal

Merge conditions from multiple sources into one unified catalog.

## Command

```bash
testtree merge-conditions \
  --code-summary ./testtree/ts-summary.json \
  --fixture-summary ./testtree/fixture-summary.json \
  --db-summary ./testtree/db-summary.json \
  --schema-summary ./testtree/schema-summary.json \
  --out ./testtree/unified-condition-catalog.json \
  --domain order
```

## Behavior

* Read available source summaries
* Merge by field path
* Combine unique values
* Preserve source list per value
* Mark source coverage
* Export unified catalog

## Output

```json
{
  "domain": "order",
  "fields": [
    {
      "fieldPath": "payment.type",
      "values": [
        {
          "value": "COD",
          "sources": ["code", "fixtures", "db", "schema"]
        },
        {
          "value": "QR",
          "sources": ["code"]
        }
      ],
      "sourceCoverage": {
        "code": true,
        "fixtures": true,
        "db": true,
        "schema": true
      }
    }
  ]
}
```

## Files

```text
src/core/merge-conditions.ts
tests/merge-conditions.test.ts
```

---

# Final Workflow Target

```text
sample.json
→ generate-template
→ scan-ts
→ scan-schema
→ scan-db
→ summarize-conditions
→ merge-conditions
→ unified-condition-catalog
→ suggest-variants
→ generate fixtures
→ inspect fixtures
→ merge-summary
→ show-summary
```

---

# Final Instruction

Implement phases in order.

After each phase:

* run tests
* run build
* update README
* verify CLI command

Do not implement AI integration yet.

```
```
