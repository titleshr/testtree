````md
# TestTree Phase Tasks

Version: Phase 1 → Phase 7

---

# Phase 1 — Fixture Generator

## Goal

Generate fixture JSON files from:

```text
base-template.json + variants.json
````

## CLI Command

```bash
testtree generate \
  --base ./base-template.json \
  --variants ./variants.json \
  --out ./fixtures
```

## Required Features

* read base-template.json
* read variants.json
* validate variants
* clone base template
* apply patch fields
* support nested field paths
* support array index paths
* support null replacement
* support object replacement
* support array replacement
* create output folder automatically
* generate fixture files
* log generated file count

## Files To Create

```text
src/core/apply-patch.ts
src/core/generate-fixtures.ts
src/core/read-json.ts
src/core/write-json.ts
src/types/variant.ts
src/types/generator-options.ts
src/validation/variant-schema.ts
tests/apply-patch.test.ts
tests/generate-fixtures.test.ts
```

## Success Criteria

* generate command works
* fixtures generated correctly
* tests pass
* build passes

---

# Phase 2 — Workspace Initialization

## Goal

Create workflow template files automatically.

## CLI Command

```bash
testtree init \
  --out ./examples/order
```

Optional:

```bash
testtree init \
  --out ./examples/order \
  --force
```

## Required Features

* create output directory
* create workflow template files
* do not overwrite existing files by default
* support --force overwrite
* log created files

## Files To Generate

```text
sample.json
condition-catalog.json
scenario-plan.json
base-template.json
variants.json
```

## Files To Create

```text
src/core/init-workspace.ts
src/templates/condition-catalog-template.ts
src/templates/scenario-plan-template.ts
src/templates/base-template-template.ts
src/templates/variants-template.ts
tests/init-workspace.test.ts
```

## Success Criteria

* init command works
* workflow files created
* tests pass
* build passes

---

# Phase 2.5 — Inspect Fixtures

## Goal

Inspect generated fixtures and summarize field values.

## CLI Command

```bash
testtree inspect \
  --fixtures ./examples/order/fixtures \
  --out ./examples/order/fixture-summary.json
```

## Required Features

* read all fixture JSON files
* flatten nested objects
* flatten array paths
* collect unique values
* count unique values
* export fixture-summary.json
* log inspection summary

## Output Example

```json
{
  "fields": {
    "status": {
      "count": 3,
      "values": ["COMPLETE", "PENDING", "PRE_PENDING"]
    }
  }
}
```

## Value Handling Rules

Primitive values:

```text
string, number, boolean, null
```

Object values:

```text
"[object]"
```

Array values:

```text
"[array]"
```

## Files To Create

```text
src/core/inspect-fixtures.ts
src/core/flatten-object.ts
src/types/fixture-summary.ts
tests/inspect-fixtures.test.ts
```

## Success Criteria

* inspect command works
* fixture-summary.json generated
* unique values counted correctly
* tests pass
* build passes

---

# Phase 3 — Condition Catalog Generator

## Goal

Generate condition-catalog.json from fixture-summary.json.

## CLI Command

```bash
testtree catalog \
  --summary ./examples/order/fixture-summary.json \
  --out ./examples/order/condition-catalog.json \
  --domain order
```

## Required Features

* read fixture-summary.json
* generate condition catalog fields
* set sampleValue
* set possibleValues
* mark condition fields
* export condition-catalog.json

## Rules

* use first value as sampleValue
* set sources to ["fixtures"]
* set isConditionField = true when count > 1
* notes default to ""

## Files To Create

```text
src/core/generate-condition-catalog.ts
src/types/condition-catalog.ts
src/validation/condition-catalog-schema.ts
tests/generate-condition-catalog.test.ts
```

## Success Criteria

* catalog command works
* condition-catalog.json generated
* tests pass
* build passes

---

# Phase 4 — Simple Code Scanner

## Goal

Scan source code using simple text pattern matching.

This phase is NOT AST-based yet.

## CLI Command

```bash
testtree scan-code \
  --project ./src \
  --out ./examples/order/code-conditions.json
```

Optional:

```bash
testtree scan-code \
  --project ./src \
  --out ./examples/order/code-conditions.json \
  --include "src/**/*.ts" \
  --ignore "node_modules/**,dist/**"
```

## Required Features

* scan .ts/.tsx/.js/.jsx
* ignore node_modules/dist/build/coverage/.git
* detect comparison operators:

  * ===
  * !==
  * ==
  * !=
* detect switch case
* capture:

  * fieldPath
  * operator
  * value
  * file
  * line
  * sourceType

## Output Example

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

## Files To Create

```text
src/core/scan-code.ts
src/core/find-source-files.ts
src/types/code-condition.ts
tests/scan-code.test.ts
```

## Success Criteria

* scan-code command works
* code-conditions.json generated
* conditions detected
* tests pass
* build passes

---

# Phase 5 — TypeScript AST Scanner

## Goal

Improve scanning accuracy using ts-morph.

## CLI Command

```bash
testtree scan-ts \
  --project ./src \
  --out ./examples/order/ts-conditions.json
```

Optional:

```bash
testtree scan-ts \
  --project ./src \
  --out ./examples/order/ts-conditions.json \
  --tsconfig ./tsconfig.json
```

## Required Dependency

```bash
npm install ts-morph
```

or:

```bash
pnpm add ts-morph
```

## Required Features

Use ts-morph to detect:

* binary expressions
* switch statements
* enums
* simple const object string values

Capture:

* fieldPath
* operator
* value
* file
* line
* sourceType

## Output Example

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

## Files To Create

```text
src/core/scan-typescript.ts
tests/scan-typescript.test.ts
```

## Success Criteria

* scan-ts command works
* ts-conditions.json generated
* AST scanning works
* tests pass
* build passes

---

# Phase 5.5 — Summarize Conditions

## Goal

Convert code condition output into summary format.

This command should work with both:

```text
code-conditions.json
ts-conditions.json
```

## CLI Command

```bash
testtree summarize-conditions \
  --conditions ./examples/order/ts-conditions.json \
  --out ./examples/order/ts-summary.json
```

Also support:

```bash
testtree summarize-conditions \
  --conditions ./examples/order/code-conditions.json \
  --out ./examples/order/code-summary.json
```

## Required Features

* read conditions JSON
* group by fieldPath
* collect unique values
* count unique values
* export summary format compatible with fixture-summary.json
* support both text scanner output and ts-morph scanner output
* ignore invalid condition records safely
* log summary result

## Output Format

```json
{
  "fields": {
    "payment.type": {
      "count": 2,
      "values": ["COD", "BANK"]
    },
    "status": {
      "count": 3,
      "values": ["PENDING", "COMPLETE", "CANCEL"]
    }
  }
}
```

## Files To Create

```text
src/core/summarize-conditions.ts
tests/summarize-conditions.test.ts
```

Update if needed:

```text
src/types/fixture-summary.ts
src/cli/index.ts
README.md
package.json
```

## Success Criteria

* summarize-conditions command works
* code-summary.json generated
* ts-summary.json generated
* output can be used with catalog command
* tests pass
* build passes

---

# Phase 6 — Merge Summary / Fixture Coverage

## Goal

Compare values discovered from source code with values available in generated fixtures.

This phase should NOT modify fixture-summary.json directly.

Instead, it generates:

```text
coverage-summary.json
```

## CLI Command

```bash
testtree merge-summary \
  --code-summary ./examples/order/ts-summary.json \
  --fixture-summary ./examples/order/fixture-summary.json \
  --out ./examples/order/coverage-summary.json
```

Also support:

```bash
testtree merge-summary \
  --code-summary ./examples/order/code-summary.json \
  --fixture-summary ./examples/order/fixture-summary.json \
  --out ./examples/order/coverage-summary.json
```

## Required Features

* read code summary JSON
* read fixture summary JSON
* compare field paths
* compare values for each field
* detect missing values in fixtures
* detect extra values in fixtures
* calculate coverage percentage
* export coverage-summary.json
* log merge summary

## Output Format

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

## Files To Create

```text
src/core/merge-summaries.ts
src/types/coverage-summary.ts
tests/merge-summaries.test.ts
```

Update if needed:

```text
src/cli/index.ts
README.md
package.json
```

## Success Criteria

* merge-summary command works
* coverage-summary.json generated
* missing fixture values visible
* extra fixture values visible
* coverage percentage correct
* tests pass
* build passes

---

# Phase 7 — Project-local Usage & Config

## Goal

Make TestTree easier to use after installing it inside a target project.

Users should not need to pass long paths every time.

Instead, users should be able to run:

```bash
npx testtree init-config
npx testtree flow
```

from the root of their project.

---

# CLI Commands

## Init Config

```bash
testtree init-config
```

Optional:

```bash
testtree init-config --force
```

## Flow

```bash
testtree flow
```

Optional:

```bash
testtree flow --config ./testtree.config.json
```

---

# Config File

TestTree should support:

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

---

# Config Resolution Rules

Priority order:

1. CLI options
2. testtree.config.json
3. defaults

---

# Default Values

If config is missing:

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

If `./src` does not exist:

```text
project = "."
```

---

# init-config Behavior

The init-config command must:

* create testtree.config.json
* create outputDir
* create base-template.json if missing
* create variants.json if missing
* create fixtures folder
* not overwrite existing files by default
* support --force
* log created files

---

# flow Behavior

The flow command must run the main workflow using config/default paths:

1. scan-ts
2. summarize-conditions
3. catalog
4. generate
5. inspect
6. merge-summary

Expected generated files:

```text
testtree/
  ts-conditions.json
  ts-summary.json
  condition-catalog.json
  fixtures/
  fixture-summary.json
  coverage-summary.json
```

---

# Flow Error Handling

If base-template.json or variants.json is missing:

* show readable error
* suggest running:

```bash
testtree init-config
```

If scan-ts fails:

* show readable error
* do not continue silently

If generate fails:

* stop flow
* show readable error

---

# Required Files

Create:

```text
src/core/load-config.ts
src/core/init-config.ts
src/core/run-flow.ts
src/types/testtree-config.ts
src/validation/testtree-config-schema.ts
tests/load-config.test.ts
tests/init-config.test.ts
tests/run-flow.test.ts
```

Update:

```text
src/cli/index.ts
README.md
package.json
```

---

# package.json Scripts

```json
{
  "scripts": {
    "init-config:example": "tsx src/cli/index.ts init-config --force",
    "flow:example": "tsx src/cli/index.ts flow"
  }
}
```

---

# Tests Required

## load-config

* load config file
* use defaults when config missing
* CLI options override config
* config overrides defaults
* fallback project to "." when ./src missing

## init-config

* create config file
* create outputDir
* create base-template.json
* create variants.json
* create fixtures folder
* do not overwrite without force
* overwrite with force

## run-flow

* run flow with mocked internal functions
* stop when required input missing
* produce expected output paths

---

# Success Criteria

* init-config command works
* flow command works
* config file is respected
* default paths work
* CLI override works
* readable errors
* tests pass
* build passes
* README explains local project usage

---

# Full Workflow After Phase 7

## Installed in target project

```bash
npm install -D testtree
npx testtree init-config
npx testtree flow
```

## Expected Output

```text
testtree/
  base-template.json
  variants.json
  ts-conditions.json
  ts-summary.json
  condition-catalog.json
  fixtures/
  fixture-summary.json
  coverage-summary.json
```

---

# Final Instruction

Implement phases in this order:

1. Phase 1
2. Phase 2
3. Phase 2.5
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 5.5
8. Phase 6
9. Phase 7

After each phase:

* run tests
* run build
* update README
* verify CLI commands

Do NOT implement future roadmap features yet.

```
```
