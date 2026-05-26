````md
# TestTree Project Scope

Version: Phase 1 → Phase 12  
Project Type: Open Source CLI Tool  
Language: TypeScript  
Runtime: Node.js

---

# Project Name

TestTree

Tagline:

TestTree — Grow scenario-based fixtures from base data.

---

# Vision

TestTree is an open-source CLI tool for discovering data conditions and generating maintainable test fixtures.

The goal is to help developers and QA teams answer questions like:

```text
แต่ละ field มี value อะไรได้บ้าง?
value ไหนเจอจาก code?
value ไหนเจอจาก schema?
value ไหนเจอจาก database?
fixture ที่มีอยู่ครอบคลุม condition เหล่านี้ครบไหม?
````

TestTree should work with any JSON-like data structure, such as:

* orders
* users
* products
* tickets
* payments
* events
* API payloads
* database documents

TestTree must be domain-agnostic and must not depend on any specific business system.

---

# Core Philosophy

Traditional fixture management:

```text
order_complete.json
order_pending.json
order_cancelled.json
order_bank_paid.json
```

Problems:

* duplicated data
* difficult maintenance
* inconsistent structure
* hidden business conditions
* unclear test coverage

TestTree philosophy:

```text
sample data
+ source code conditions
+ schema conditions
+ database values
+ base template
+ variants
→ generated fixtures
→ coverage summary
→ unified condition catalog
```

Benefits:

* reduce duplicated fixture files
* discover hidden field values
* see missing fixture coverage
* create reusable base data
* create smaller variant patches
* build a condition catalog for any domain

---

# Core Workflow

```text
sample.json
  ↓
generate-template
  ↓
base-template.json

source code
  ↓
scan-ts / scan-code
  ↓
ts-summary.json / code-summary.json

schema / DTO
  ↓
scan-schema
  ↓
schema-summary.json

database
  ↓
scan-db
  ↓
db-summary.json

summaries
  ↓
merge-conditions
  ↓
unified-condition-catalog.json

coverage
  ↓
suggest-variants
  ↓
variants.json / suggested-variants.json

base-template + variants
  ↓
generate
  ↓
fixtures/

fixtures
  ↓
inspect
  ↓
fixture-summary.json

code summary + fixture summary
  ↓
merge-summary
  ↓
coverage-summary.json

summary
  ↓
show-summary
  ↓
readable plain text output
```

---

# Architecture Philosophy

TestTree should be:

* CLI-first
* JSON-first
* file-based
* offline-friendly
* beginner-friendly
* domain-agnostic
* deterministic
* easy to test
* easy to extend

Future versions may support AI-assisted workflows, but AI is out of scope for Phase 1–12.

---

# Supported Data Types

TestTree should support:

* plain JSON objects
* nested objects
* arrays
* MongoDB-like documents
* API responses
* DTO-like structures
* TypeScript enum-like values
* schema-derived values
* database distinct values

---

# Out of Scope Until Future Phases

Do NOT implement yet:

* AI API integration
* OpenAI integration
* Claude integration
* frontend UI
* web dashboard
* authentication
* cloud sync
* telemetry
* analytics
* Docker requirement
* plugin marketplace
* distributed processing
* automatic business meaning inference
* automatic DB write/seed
* automatic production data mutation

Database scanning is read-only only.

---

# Tech Stack

Required:

* TypeScript
* Node.js

Libraries:

* commander
* lodash.set
* lodash.clonedeep
* zod
* vitest
* tsx
* fast-glob
* ts-morph
* mongodb

Package manager:

* pnpm preferred
* npm acceptable

---

# Recommended Project Structure

```text
testtree/
  docs/
    PROJECT_SCOPE.md
    PHASE_TASKS.md

  src/
    cli/
      index.ts

    core/
      apply-patch.ts
      generate-fixtures.ts
      init-workspace.ts
      inspect-fixtures.ts
      flatten-object.ts
      generate-condition-catalog.ts
      scan-code.ts
      scan-typescript.ts
      summarize-conditions.ts
      merge-summaries.ts
      load-config.ts
      init-config.ts
      run-flow.ts
      show-summary.ts
      generate-template.ts
      suggest-variants.ts
      scan-schema.ts
      scan-db.ts
      merge-conditions.ts
      read-json.ts
      write-json.ts
      find-source-files.ts

    templates/
      condition-catalog-template.ts
      scenario-plan-template.ts
      base-template-template.ts
      variants-template.ts

    types/
      variant.ts
      generator-options.ts
      condition-catalog.ts
      scenario-plan.ts
      fixture-summary.ts
      code-condition.ts
      coverage-summary.ts
      testtree-config.ts
      schema-summary.ts
      db-summary.ts
      unified-condition-catalog.ts

    validation/
      variant-schema.ts
      condition-catalog-schema.ts
      scenario-plan-schema.ts
      testtree-config-schema.ts

  examples/
    order/
      sample.json
      base-template.json
      variants.json
      suggested-variants.json
      fixtures/
      fixture-summary.json
      code-conditions.json
      code-summary.json
      ts-conditions.json
      ts-summary.json
      schema-summary.json
      db-summary.json
      coverage-summary.json
      condition-catalog.json
      unified-condition-catalog.json

  tests/
    apply-patch.test.ts
    generate-fixtures.test.ts
    init-workspace.test.ts
    inspect-fixtures.test.ts
    generate-condition-catalog.test.ts
    scan-code.test.ts
    scan-typescript.test.ts
    summarize-conditions.test.ts
    merge-summaries.test.ts
    load-config.test.ts
    init-config.test.ts
    run-flow.test.ts
    show-summary.test.ts
    generate-template.test.ts
    suggest-variants.test.ts
    scan-schema.test.ts
    scan-db.test.ts
    merge-conditions.test.ts

  README.md
  package.json
  tsconfig.json
  vitest.config.ts
```

---

# Project Phases

## Phase 1

Fixture Generator

## Phase 2

Workspace Initialization

## Phase 2.5

Inspect Fixtures

## Phase 3

Condition Catalog Generator

## Phase 4

Simple Text Code Scanner

## Phase 5

TypeScript AST Scanner

## Phase 5.5

Condition Summary Generator

## Phase 6

Fixture Coverage / Merge Summary

## Phase 7

Project-local Usage & Config

## Phase 7.5

Show Summary

## Phase 8

Generate Base Template From Sample

## Phase 9

Suggest Variants From Coverage

## Phase 10

DTO / Schema Scanner

## Phase 11

Database Scanner

## Phase 12

Multi-source Condition Merger

---

# CLI Commands

```bash
testtree generate
testtree init
testtree inspect
testtree catalog
testtree scan-code
testtree scan-ts
testtree summarize-conditions
testtree merge-summary
testtree init-config
testtree flow
testtree show-summary
testtree generate-template
testtree suggest-variants
testtree scan-schema
testtree scan-db
testtree merge-conditions
```

---

# Phase Responsibility Summary

## Phase 1 — Fixture Generator

Generate fixture files from:

```text
base-template.json + variants.json
```

Output:

```text
fixtures/*.json
```

---

## Phase 2 — Workspace Init

Create starter workflow files:

```text
sample.json
condition-catalog.json
scenario-plan.json
base-template.json
variants.json
fixtures/
```

---

## Phase 2.5 — Inspect Fixtures

Read generated fixtures and produce:

```text
fixture-summary.json
```

This summary tells which field values are covered by current fixtures.

---

## Phase 3 — Condition Catalog Generator

Convert summary file into:

```text
condition-catalog.json
```

This is a human-readable catalog of fields and possible values.

---

## Phase 4 — Text Code Scanner

Scan source code using text/regex patterns.

Output:

```text
code-conditions.json
```

This is best-effort and may miss complex logic.

---

## Phase 5 — TypeScript AST Scanner

Scan TypeScript with `ts-morph`.

Output:

```text
ts-conditions.json
```

This is more accurate than text scan.

---

## Phase 5.5 — Summarize Conditions

Convert:

```text
code-conditions.json
ts-conditions.json
```

into:

```text
code-summary.json
ts-summary.json
```

---

## Phase 6 — Fixture Coverage / Merge Summary

Compare:

```text
code summary
fixture summary
```

Output:

```text
coverage-summary.json
```

This shows:

* missing fixture values
* extra fixture values
* coverage percentage

---

## Phase 7 — Project-local Usage & Config

Support:

```text
testtree.config.json
```

Commands:

```bash
testtree init-config
testtree flow
```

Goal:

Users can install TestTree in a target project and run the workflow without long paths.

---

## Phase 7.5 — Show Summary

Render summary JSON as readable plain text:

```text
status:
- PRE_PENDING
- PENDING
- COMPLETE
```

---

## Phase 8 — Generate Base Template From Sample

Generate:

```text
base-template.json
```

from:

```text
sample.json
```

Remove unstable fields by default:

```text
_id
id
createdAt
updatedAt
deletedAt
```

---

## Phase 9 — Suggest Variants From Coverage

Read:

```text
coverage-summary.json
```

Generate:

```text
suggested-variants.json
```

Each missing value becomes a suggested variant patch.

---

## Phase 10 — DTO / Schema Scanner

Scan schemas and validators.

Detect:

* TypeScript enums
* Zod enum
* Zod nativeEnum
* class-validator decorators
* simple required fields
* simple string/number constraints

Output:

```text
schema-summary.json
```

---

## Phase 11 — Database Scanner

Read-only MongoDB scanner.

Run distinct values for specified fields.

Output:

```text
db-summary.json
```

No database writes are allowed.

No credentials should be logged.

---

## Phase 12 — Multi-source Condition Merger

Merge multiple sources:

```text
code summary
fixture summary
schema summary
db summary
```

Output:

```text
unified-condition-catalog.json
```

This shows:

* all known values
* value sources
* source coverage per field

---

# Validation Philosophy

All commands should:

* validate input
* fail with readable error messages
* avoid crashing silently
* avoid partial invalid output
* keep output deterministic
* avoid mutating input files unless explicitly requested

---

# Code Style Rules

The codebase must be:

* beginner-friendly
* readable
* maintainable
* simple
* minimal
* well-named

Avoid:

* over-engineering
* unnecessary abstraction
* complex patterns
* premature optimization
* deep inheritance
* unnecessary generics

---

# Testing Philosophy

Every phase must:

* include unit tests
* pass build
* pass CLI smoke tests
* avoid external services in unit tests
* mock MongoDB in database scanner tests

---

# README Requirements

README must include:

* What is TestTree
* Why use base + variants
* Installation
* Quick start
* Full workflow
* All CLI commands
* Project-local usage
* Example outputs
* Roadmap
* Safety notes for database scanning

README must be written in English.

---

# Important Safety Notes

Database scanner must be read-only.

`scan-db` must never:

* insert
* update
* delete
* create index
* drop collection
* mutate database

It should only run read operations such as:

```text
distinct
find with limit if needed
```

---

# Workflow Examples

## Project-local Workflow

```bash
npm install -D testtree
npx testtree init-config
npx testtree flow
```

---

## Code Discovery Workflow

```bash
testtree scan-ts \
  --project ./src \
  --out ./testtree/ts-conditions.json

testtree summarize-conditions \
  --conditions ./testtree/ts-conditions.json \
  --out ./testtree/ts-summary.json

testtree catalog \
  --summary ./testtree/ts-summary.json \
  --out ./testtree/condition-catalog.json \
  --domain order
```

---

## Fixture Coverage Workflow

```bash
testtree generate \
  --base ./testtree/base-template.json \
  --variants ./testtree/variants.json \
  --out ./testtree/fixtures

testtree inspect \
  --fixtures ./testtree/fixtures \
  --out ./testtree/fixture-summary.json

testtree merge-summary \
  --code-summary ./testtree/ts-summary.json \
  --fixture-summary ./testtree/fixture-summary.json \
  --out ./testtree/coverage-summary.json
```

---

## Base + Variant Suggestion Workflow

```bash
testtree generate-template \
  --sample ./testtree/sample.json \
  --out ./testtree/base-template.json

testtree suggest-variants \
  --coverage ./testtree/coverage-summary.json \
  --out ./testtree/suggested-variants.json
```

---

## Full Condition Discovery Workflow

```bash
testtree scan-ts \
  --project ./src \
  --out ./testtree/ts-conditions.json

testtree summarize-conditions \
  --conditions ./testtree/ts-conditions.json \
  --out ./testtree/ts-summary.json

testtree scan-schema \
  --project ./src \
  --out ./testtree/schema-summary.json

testtree scan-db \
  --uri "$MONGO_URI" \
  --database mydb \
  --collection orders \
  --fields status,payment.type,channel \
  --out ./testtree/db-summary.json

testtree merge-conditions \
  --code-summary ./testtree/ts-summary.json \
  --fixture-summary ./testtree/fixture-summary.json \
  --schema-summary ./testtree/schema-summary.json \
  --db-summary ./testtree/db-summary.json \
  --out ./testtree/unified-condition-catalog.json \
  --domain order
```

---

# Future Roadmap Ideas

Do NOT implement yet:

## Phase 13

OpenAPI support

## Phase 14

JSON Schema support

## Phase 15

AI-assisted scenario suggestions

## Phase 16

Plugin architecture

## Phase 17

Database adapters beyond MongoDB

---

# Success Criteria

The project is successful if:

1. install works
2. build works
3. tests pass
4. CLI commands work
5. fixtures are generated correctly
6. fixture summaries are generated correctly
7. condition catalogs are generated correctly
8. code scanning works
9. TypeScript scanning works
10. coverage summary works
11. project-local workflow works
12. base template can be generated from sample
13. variants can be suggested from coverage
14. schema summary can be generated
15. database summary can be generated read-only
16. unified condition catalog can be generated
17. beginner developers can understand the codebase

---

# Final Instruction

Implement only:

* Phase 1
* Phase 2
* Phase 2.5
* Phase 3
* Phase 4
* Phase 5
* Phase 5.5
* Phase 6
* Phase 7
* Phase 7.5
* Phase 8
* Phase 9
* Phase 10
* Phase 11
* Phase 12

Do NOT implement future roadmap phases yet.

If multiple implementations are possible:

choose the simplest maintainable approach.

```
```
