import { readFileSync } from 'fs';
import { extname } from 'path';
import { parse as parseYaml } from 'yaml';
import { writeJson } from './write-json';

interface ScanOpenApiOptions {
  inputPath: string;
  outPath: string;
}

interface OpenApiFieldSummary {
  count: number;
  values: unknown[];
  rules: string[];
}

interface OpenApiSummary {
  fields: Record<string, OpenApiFieldSummary>;
  meta: { source: 'openapi' };
}

type OpenApiSchema = {
  type?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  $ref?: string;
};

function resolveRef(ref: string, root: Record<string, unknown>): OpenApiSchema | null {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.slice(2).split('/');
  let current: unknown = root;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null;
    current = (current as Record<string, unknown>)[part];
  }
  return (current as OpenApiSchema) ?? null;
}

function extractFields(
  schema: OpenApiSchema,
  prefix: string,
  requiredSet: Set<string>,
  root: Record<string, unknown>,
  result: Record<string, OpenApiFieldSummary>
): void {
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, root);
    if (resolved) extractFields(resolved, prefix, requiredSet, root, result);
    return;
  }

  const combined = [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  for (const sub of combined) {
    extractFields(sub, prefix, requiredSet, root, result);
  }

  if (schema.properties) {
    const required = new Set(schema.required ?? []);
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const isRequired = required.has(key);
      extractFields(propSchema, fieldPath, isRequired ? new Set([fieldPath]) : new Set(), root, result);
    }
    return;
  }

  if (!prefix) return;

  const values: unknown[] = schema.enum ?? [];
  const rules: string[] = [];
  if (schema.enum) rules.push('enum');
  if (requiredSet.has(prefix)) rules.push('required');

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

export function scanOpenApi({ inputPath, outPath }: ScanOpenApiOptions): void {
  const raw = readFileSync(inputPath, 'utf-8');
  const ext = extname(inputPath).toLowerCase();

  let doc: Record<string, unknown>;
  if (ext === '.yaml' || ext === '.yml') {
    doc = parseYaml(raw) as Record<string, unknown>;
  } else {
    doc = JSON.parse(raw) as Record<string, unknown>;
  }

  const schemas =
    (doc?.components as Record<string, unknown>)?.schemas as Record<string, OpenApiSchema> | undefined;

  const result: Record<string, OpenApiFieldSummary> = {};

  if (schemas) {
    for (const [, schema] of Object.entries(schemas)) {
      extractFields(schema, '', new Set(), doc, result);
    }
  }

  const summary: OpenApiSummary = {
    fields: result,
    meta: { source: 'openapi' },
  };

  writeJson(outPath, summary);

  const fieldCount = Object.keys(result).length;
  console.log(`Scanned OpenAPI spec. Found ${fieldCount} field(s) written to ${outPath}`);
}
