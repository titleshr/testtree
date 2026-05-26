import { readFileSync } from 'fs';
import { writeJson } from './write-json';

interface ScanJsonSchemaOptions {
  inputPath: string;
  outPath: string;
}

interface JsonSchemaFieldSummary {
  count: number;
  values: unknown[];
  rules: string[];
}

interface JsonSchemaSummary {
  fields: Record<string, JsonSchemaFieldSummary>;
  meta: { source: 'json-schema' };
}

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  $ref?: string;
  definitions?: Record<string, JsonSchema>;
  $defs?: Record<string, JsonSchema>;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
};

function resolveRef(ref: string, root: JsonSchema): JsonSchema | null {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current: unknown = root;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return (current as JsonSchema) ?? null;
}

function extractRules(schema: JsonSchema): string[] {
  const rules: string[] = [];
  if (schema.enum) rules.push('enum');
  if (schema.minLength !== undefined) rules.push(`minLength:${schema.minLength}`);
  if (schema.maxLength !== undefined) rules.push(`maxLength:${schema.maxLength}`);
  if (schema.minimum !== undefined) rules.push(`minimum:${schema.minimum}`);
  if (schema.maximum !== undefined) rules.push(`maximum:${schema.maximum}`);
  if (schema.pattern !== undefined) rules.push(`pattern:${schema.pattern}`);
  return rules;
}

function extractFields(
  schema: JsonSchema,
  prefix: string,
  isRequired: boolean,
  root: JsonSchema,
  result: Record<string, JsonSchemaFieldSummary>
): void {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, root);
    if (resolved) extractFields(resolved, prefix, isRequired, root, result);
    return;
  }

  const combined = [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  for (const sub of combined) {
    extractFields(sub, prefix, isRequired, root, result);
  }

  if (schema.properties) {
    const requiredSet = new Set(schema.required ?? []);
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      extractFields(propSchema, fieldPath, requiredSet.has(key), root, result);
    }
    return;
  }

  if (!prefix) return;

  const values: unknown[] = schema.enum ?? [];
  const rules = extractRules(schema);
  if (isRequired) rules.unshift('required');

  if (values.length > 0 || rules.length > 0) {
    if (!result[prefix]) {
      result[prefix] = { count: values.length, values, rules };
    } else {
      for (const v of values) {
        if (!result[prefix].values.includes(v)) result[prefix].values.push(v);
      }
      result[prefix].count = result[prefix].values.length;
      for (const r of rules) {
        if (!result[prefix].rules.includes(r)) result[prefix].rules.push(r);
      }
    }
  }
}

export function scanJsonSchema({ inputPath, outPath }: ScanJsonSchemaOptions): void {
  const raw = readFileSync(inputPath, 'utf-8');
  const schema = JSON.parse(raw) as JsonSchema;

  const result: Record<string, JsonSchemaFieldSummary> = {};
  extractFields(schema, '', false, schema, result);

  const summary: JsonSchemaSummary = {
    fields: result,
    meta: { source: 'json-schema' },
  };

  writeJson(outPath, summary);

  const fieldCount = Object.keys(result).length;
  console.log(`Scanned JSON Schema. Found ${fieldCount} field(s) written to ${outPath}`);
}
