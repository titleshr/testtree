````md id="vz8wxa"
# TestTree Project Scope

Version: Phase 1 → Phase 7  
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

TestTree is an open-source CLI tool that helps developers create maintainable test data and fixtures using:

```text
base-template + variants + condition discovery
````

The project aims to reduce:

* duplicated fixture files
* manual test data preparation
* hidden data conditions in source code
* hard-to-maintain JSON test fixtures

TestTree should work with any JSON-like structure:

* orders
* users
* products
* tickets
* payments
* events
* API payloads
* database documents

The project must NOT depend on any specific business domain.

---

# Core Philosophy

Traditional fixture management:

```text id="h4qzjq"
order_complete.json
order_pending.json
order_cancelled.json
order_bank_paid.json
```

Problems:

* duplicated data
* difficult maintenance
* inconsistent structure
* hard to scale

TestTree philosophy:

```text id="52epdb"
base-template.json
+ variants.json
+ condition catalog
+ scenario plan
→ generated fixtures
```

Benefits:

* single source of truth
* reusable base data
* smaller fixture patches
* easier maintenance
* easier scenario management

---

# Core Workflow

```text id="uxn2kk"
Sample Data
    ↓
Condition Discovery
    ↓
Condition Catalog
    ↓
Scenario Plan
    ↓
Base Template
    ↓
Variants
    ↓
Generated Fixtures
    ↓
Fixture Summary
    ↓
Coverage Summary
```

---

# Architecture Philosophy

TestTree should be:

* CLI-first
* JSON-first
* file-based
* offline-friendly
* AI-assisted in future
* beginner-friendly
* extensible
* maintainable
* domain-agnostic

---

# Supported Data Types

TestTree should support:

* plain JSON objects
* nested objects
* arrays
* MongoDB-like documents
* API responses
* DTO-like structures

---

# Out of Scope (Until Future Phases)

DO NOT implement yet:

* AI API integration
* OpenAI integration
* Claude integration
* database connection
* MongoDB integration
* Prisma integration
* ORM integration
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
* automatic scenario generation
* automatic DB seeding

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
* ts-morph (Phase 5)

Package manager:

* pnpm preferred
* npm acceptable

---

# Recommended Project Structure

```text id="cm0zyf"
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

    validation/
      variant-schema.ts
      condition-catalog-schema.ts
      scenario-plan-schema.ts
      testtree-config-schema.ts

  examples/
    order/
      sample.json
      fixture-summary.json
      code-conditions.json
      code-summary.json
      ts-conditions.json
      ts-summary.json
      coverage-summary.json
      condition-catalog.json
      scenario-plan.json
      base-template.json
      variants.json
      fixtures/

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

---

# CLI Commands

```bash id="uzjtnz"
testtree generate
```

```bash id="rkkdwl"
testtree init
```

```bash id="jlwmgi"
testtree inspect
```

```bash id="z7e0n0"
testtree catalog
```

```bash id="mkgjlwm"
testtree scan-code
```

```bash id="hvb4ys"
testtree scan-ts
```

```bash id="w3aj3w"
testtree summarize-conditions
```

```bash id="s9t3hm"
testtree merge-summary
```

```bash id="y10n0h"
testtree init-config
```

```bash id="x6t24m"
testtree flow
```

---

# Validation Philosophy

All commands should:

* validate input
* fail with readable error messages
* avoid crashing silently
* avoid partial invalid output
* keep output deterministic

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

---

# README Requirements

README must include:

* What is TestTree
* Why use base + variants
* Installation
* Quick start
* generate command
* init command
* inspect command
* catalog command
* scan-code command
* scan-ts command
* summarize-conditions command
* merge-summary command
* init-config command
* flow command
* Example workflow
* Roadmap

README must be written in English.

---

# Workflow Examples

## From Fixtures

```bash id="6tn7um"
testtree generate \
  --base ./examples/order/base-template.json \
  --variants ./examples/order/variants.json \
  --out ./examples/order/fixtures

testtree inspect \
  --fixtures ./examples/order/fixtures \
  --out ./examples/order/fixture-summary.json

testtree catalog \
  --summary ./examples/order/fixture-summary.json \
  --out ./examples/order/condition-catalog-from-fixtures.json \
  --domain order
```

---

## From Text Code Scanner

```bash id="mo00ec"
testtree scan-code \
  --project /path/to/project/src \
  --out ./examples/order/code-conditions.json

testtree summarize-conditions \
  --conditions ./examples/order/code-conditions.json \
  --out ./examples/order/code-summary.json

testtree catalog \
  --summary ./examples/order/code-summary.json \
  --out ./examples/order/condition-catalog-from-code.json \
  --domain order
```

---

## From TypeScript AST Scanner

```bash id="hddj2j"
testtree scan-ts \
  --project /path/to/project/src \
  --out ./examples/order/ts-conditions.json

testtree summarize-conditions \
  --conditions ./examples/order/ts-conditions.json \
  --out ./examples/order/ts-summary.json

testtree catalog \
  --summary ./examples/order/ts-summary.json \
  --out ./examples/order/condition-catalog-from-ts.json \
  --domain order
```

---

## Coverage Workflow

```bash id="s5txpd"
testtree merge-summary \
  --code-summary ./examples/order/ts-summary.json \
  --fixture-summary ./examples/order/fixture-summary.json \
  --out ./examples/order/coverage-summary.json
```

---

## Project-local Workflow

```bash id="j03j4t"
npm install -D testtree

npx testtree init-config

npx testtree flow
```

---

# Future Roadmap Ideas

## Phase 8

* merge fixture conditions + code conditions automatically
* smarter condition merging

## Phase 9

* OpenAPI support
* JSON schema support

## Phase 10

* AI-assisted discovery
* automatic scenario suggestions

## Phase 11

* plugin architecture

## Phase 12

* database adapters

These are roadmap ideas only.

DO NOT implement yet.

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
12. beginner developers can understand the codebase

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

Do NOT implement future roadmap phases yet.

If multiple implementations are possible:
choose the simplest maintainable approach.

```
```
