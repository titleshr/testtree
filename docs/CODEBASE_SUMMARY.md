# TestTree — Codebase Summary

## โปรเจคนี้คืออะไร

TestTree เป็น CLI tool สำหรับช่วยจัดการ test fixtures แบบ "base template + variants" แทนที่จะมีไฟล์ fixture แยกกันหลายสิบไฟล์ ใช้ไฟล์เดียวเป็น base แล้ว patch เฉพาะส่วนที่ต่าง

นอกจากนั้นยังช่วย **ค้นหา condition** ที่ซ่อนอยู่ใน codebase, schema, และ database แล้วเปรียบเทียบกับ fixture ที่มีอยู่ว่าครอบคลุมครบไหม

---

## ภาพรวม pipeline

```
sample.json
    │
    ▼
generate-template        ← ลบ unstable fields (_id, createdAt ฯลฯ)
    │
    ▼
base-template.json
    │
    ├─────────────────────────────────────────────┐
    │                                             │
    ▼                                             ▼
variants.json                         [condition discovery]
    │                                             │
    ▼                               ┌─────────────┼─────────────┐
generate                            │             │             │
    │                            scan-ts      scan-schema    scan-db
    ▼                            (AST)        (Zod/DTO)    (MongoDB)
fixtures/                           │             │             │
    │                               └─────────────┴─────────────┘
    ▼                                             │
inspect                                  summarize-conditions
    │                                             │
    ▼                                             ▼
fixture-summary.json ──────────── merge-summary ──► coverage-summary.json
                                       ▲                  │
                                 (+ db-summary,           ▼
                                  if db configured)  suggest-variants
                                                          │
                                                          ▼
                                              print to console (in flow)
                                              or suggested-variants.json
                                              (via standalone command)
```

---

## โมดูลทั้งหมด

### Fixture Generation (Phase 1)

| ไฟล์ | หน้าที่ |
|---|---|
| `apply-patch.ts` | รับ base object + patch object → คืน object ใหม่ที่ patch แล้ว รองรับ dotted path เช่น `payment.type` |
| `generate-fixtures.ts` | วนลูป variants → เรียก `applyPatch` ทีละ variant → เขียน `fixtures/<name>.json` |

**Input:** `base-template.json` + `variants.json`
**Output:** `fixtures/*.json`

---

### Workspace Init (Phase 2)

| ไฟล์ | หน้าที่ |
|---|---|
| `init-workspace.ts` | สร้างไฟล์ starter ใน output dir (`sample.json`, `base-template.json`, `variants.json`, `fixtures/`) |

---

### Fixture Inspection (Phase 2.5)

| ไฟล์ | หน้าที่ |
|---|---|
| `flatten-object.ts` | แปลง nested JSON → flat key-value (`payment.type = "COD"`) รองรับ array index path |
| `inspect-fixtures.ts` | อ่านไฟล์ทุกอันใน fixtures dir → flatten แต่ละไฟล์ → รวม unique values ต่อ field |

**Input:** `fixtures/`
**Output:** `fixture-summary.json`

```json
{
  "fields": {
    "status": { "count": 2, "values": ["PENDING", "COMPLETE"] },
    "payment.type": { "count": 2, "values": ["COD", "BANK"] }
  }
}
```

---

### Condition Catalog (Phase 3)

| ไฟล์ | หน้าที่ |
|---|---|
| `generate-condition-catalog.ts` | แปลง summary format → catalog format พร้อม domain label, `sampleValue`, `isConditionField` |

**Input:** summary JSON  
**Output:** `condition-catalog.json`

---

### Code Scanners (Phase 4 + 5)

| ไฟล์ | หน้าที่ |
|---|---|
| `find-source-files.ts` | glob หาไฟล์ `.ts/.tsx/.js/.jsx` ยกเว้น node_modules, dist, build |
| `scan-code.ts` | text/regex scan หา `===`, `!==`, `case "VALUE":` ใน source code |
| `scan-typescript.ts` | AST scan ด้วย `ts-morph` หา binary expression, switch case, enum, const object — แม่นยำกว่า text scan |

**Input:** project directory  
**Output:** `ts-conditions.json` / `code-conditions.json`

```json
{
  "conditions": [
    { "fieldPath": "order.status", "operator": "===", "value": "COMPLETE", "file": "...", "line": 20 }
  ],
  "meta": { "scanner": "ts-morph", "accuracy": "ast-based" }
}
```

---

### Condition Summarizer (Phase 5.5)

| ไฟล์ | หน้าที่ |
|---|---|
| `summarize-conditions.ts` | รับ conditions array → group by `fieldPath` → นับ unique values → คืน summary format เดียวกับ fixture-summary |

**Input:** `ts-conditions.json`  
**Output:** `ts-summary.json`

---

### Coverage Merge (Phase 6)

| ไฟล์ | หน้าที่ |
|---|---|
| `merge-summaries.ts` | เปรียบเทียบ code-summary กับ fixture-summary → คำนวณ `missingInFixtures`, `extraInFixtures`, coverage % |

**Input:** `ts-summary.json` + `fixture-summary.json`  
**Output:** `coverage-summary.json`

```json
{
  "fields": {
    "payment.type": {
      "codeValues": ["COD", "BANK", "QR"],
      "fixtureValues": ["COD", "BANK"],
      "missingInFixtures": ["QR"],
      "coverage": { "covered": 2, "total": 3, "percent": 66.67 }
    }
  }
}
```

---

### Config & Flow (Phase 7)

| ไฟล์ | หน้าที่ |
|---|---|
| `load-config.ts` | อ่าน `testtree.config.json` + merge กับ defaults (CLI options → config file → defaults) |
| `init-config.ts` | สร้าง `testtree.config.json` + workspace files ใน project |
| `run-flow.ts` | รัน 6 ขั้นตอนต่อเนื่อง: scan-ts → summarize → catalog → generate → inspect → merge-summary |

**Config priority:** CLI options > `testtree.config.json` > defaults

---

### Show Summary (Phase 7.5)

| ไฟล์ | หน้าที่ |
|---|---|
| `show-summary.ts` | อ่าน summary JSON → แสดงเป็น plain text รองรับ `--fields` filter และ `--out` save to file |

**Output:**
```
status:
- PENDING
- COMPLETE

payment.type:
- COD
- BANK
```

---

### Generate Template (Phase 8)

| ไฟล์ | หน้าที่ |
|---|---|
| `generate-template.ts` | อ่าน sample JSON → ลบ unstable fields (`_id`, `id`, `createdAt`, `updatedAt`, `deletedAt`) แบบ recursive ทุก nesting level → เขียน `base-template.json` |

รองรับ custom `--ignore` list เพิ่มเติมจาก default

---

### Suggest Variants (Phase 9)

| ไฟล์ | หน้าที่ |
|---|---|
| `suggest-variants.ts` | อ่าน `coverage-summary.json` → หาทุก `missingInFixtures` → สร้าง variant patch ต่อ missing value |

Naming rule: `payment.type=QR` → `payment_type_qr_case`

**Output modes:**
- ถ้าระบุ `--out` → เขียน `suggested-variants.json` (draft — ไม่ overwrite `variants.json` ที่มีอยู่)
- ถ้าไม่ระบุ `--out` (เช่นเรียกจาก `flow`) → print ผลลัพธ์ออก console เท่านั้น

---

### Schema Scanner (Phase 10)

| ไฟล์ | หน้าที่ |
|---|---|
| `scan-schema.ts` | scan TypeScript files ด้วย ts-morph หา: TypeScript enums, `z.enum()` / `z.nativeEnum()` / `z.number().min()` ใน Zod schemas, class-validator decorators (`@IsEnum`, `@IsNotEmpty`, `@Min`, `@Max`) |

รองรับ nested `z.object()` → dotted field path เช่น `payment.type`

**Output:** `schema-summary.json`

```json
{
  "fields": {
    "status": { "values": ["PENDING", "COMPLETE"], "rules": ["enum"] },
    "amount":  { "values": [],                     "rules": ["min:1"] }
  }
}
```

---

### Database Scanner (Phase 11)

| ไฟล์ | หน้าที่ |
|---|---|
| `db-client.ts` | กำหนด `DbReader` interface — เปิดเผย **เฉพาะ** `distinct()` และ `close()` ไม่มี write operation ใดๆ |
| `scan-db.ts` | รับ config → เรียก `createDbReader` → วนลูป `reader.distinct(field)` → เขียน `db-summary.json` |

**Safety rules:**
- ใช้ `distinct()` เท่านั้น — ไม่มี insert/update/delete
- URI ไม่ถูก log ไม่ว่ากรณีใด
- `finally` block ปิด connection เสมอ
- injectable `createReader` → test ได้โดยไม่ต้องมี MongoDB จริง

**Output:** `db-summary.json`

```json
{
  "fields": {
    "status": { "count": 3, "values": ["PENDING", "COMPLETE", "CANCEL"] }
  },
  "meta": { "source": "mongodb", "database": "mydb", "collection": "orders" }
}
```

---

## Utilities

| ไฟล์ | หน้าที่ |
|---|---|
| `read-json.ts` | `readFileSync` + `JSON.parse` |
| `write-json.ts` | `mkdirSync` + `writeFileSync` + `JSON.stringify` (pretty, trailing newline) |

---

## Data types

| ไฟล์ | อธิบาย |
|---|---|
| `variant.ts` | shape ของแต่ละ variant: `name`, `purpose`, `patch` |
| `fixture-summary.ts` | `{ fields: { [path]: { count, values } } }` |
| `coverage-summary.ts` | `{ fields: { [path]: { codeValues, fixtureValues, missingInFixtures, ... } } }` |
| `code-condition.ts` | shape ของ condition ที่ scanner หาได้: `fieldPath`, `operator`, `value`, `file`, `line` |
| `testtree-config.ts` | shape ของ `testtree.config.json` + `ResolvedConfig` รองรับ optional `db` field (`DbConfig`: uri, database, collection, fields) |

---

## CLI Commands สรุป

| Command | Input | Output |
|---|---|---|
| `generate-template` | `sample.json` | `base-template.json` |
| `generate` | `base-template.json` + `variants.json` | `fixtures/*.json` |
| `inspect` | `fixtures/` | `fixture-summary.json` |
| `scan-ts` | source dir | `ts-conditions.json` |
| `scan-code` | source dir | `code-conditions.json` |
| `scan-schema` | source dir | `schema-summary.json` |
| `scan-db` | MongoDB URI + fields | `db-summary.json` |
| `summarize-conditions` | `*-conditions.json` | `*-summary.json` |
| `merge-summary` | code-summary + fixture-summary (+ optional db-summary) | `coverage-summary.json` |
| `suggest-variants` | `coverage-summary.json` | `suggested-variants.json` หรือ print เท่านั้น |
| `catalog` | summary JSON | `condition-catalog.json` |
| `show-summary` | summary JSON | plain text (terminal / file) |
| `init` | — | starter workspace files |
| `init-config` | — | `testtree.config.json` |
| `flow` | `testtree.config.json` | runs 7–8 steps end-to-end (8 ถ้ามี db config) |

---

## Phase 12 — Multi-source Merger

| ไฟล์ | หน้าที่ |
|---|---|
| `merge-conditions.ts` | รับ summaries จาก 4 sources (ทั้งหมด optional) → รวม unique values ต่อ field → บันทึก sources ที่มี value นั้น → `sourceCoverage` บอกว่า source ไหนมีข้อมูลสำหรับ field นั้น |

**Input (ทั้งหมด optional):** `ts-summary.json`, `fixture-summary.json`, `db-summary.json`, `schema-summary.json`
**Output:** `unified-condition-catalog.json`

---

## การ test

- ทุก module มี unit test แยก ใน `tests/`
- รวม **137 tests**, **18 test files**
- scan-db ใช้ injectable `createReader` → ไม่ต้องมี MongoDB จริงตอน test
- scan-typescript / scan-schema เขียนไฟล์ temp ลง `__tmp_*` แล้วลบทิ้งหลัง test

---

## สถานะ Phase

| Phase | ชื่อ | สถานะ |
|---|---|---|
| 1 | Fixture Generator | ✅ |
| 2 | Workspace Init | ✅ |
| 2.5 | Inspect Fixtures | ✅ |
| 3 | Condition Catalog | ✅ |
| 4 | Text Code Scanner | ✅ |
| 5 | TypeScript AST Scanner | ✅ |
| 5.5 | Summarize Conditions | ✅ |
| 6 | Coverage / Merge Summary | ✅ |
| 7 | Config & Flow | ✅ |
| 7.5 | Show Summary | ✅ |
| 8 | Generate Template | ✅ |
| 9 | Suggest Variants | ✅ |
| 10 | Schema Scanner | ✅ |
| 11 | Database Scanner | ✅ |
| 12 | Multi-source Merger | ✅ |
