import cloneDeep from 'lodash.clonedeep';
import { readJson } from './read-json';
import { writeJson } from './write-json';

const DEFAULT_IGNORED_FIELDS = ['_id', 'id', 'createdAt', 'updatedAt', 'deletedAt'];

interface GenerateTemplateOptions {
  samplePath: string;
  outPath: string;
  ignore?: string[];
}

function removeFields(value: unknown, ignoreSet: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => removeFields(item, ignoreSet));
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (!ignoreSet.has(key)) {
        result[key] = removeFields(val, ignoreSet);
      }
    }
    return result;
  }
  return value;
}

export function generateTemplate({ samplePath, outPath, ignore }: GenerateTemplateOptions): void {
  const sample = readJson(samplePath);
  const ignoreSet = new Set([...DEFAULT_IGNORED_FIELDS, ...(ignore ?? [])]);
  const template = removeFields(cloneDeep(sample), ignoreSet);
  writeJson(outPath, template);
  console.log(`Generated: ${outPath}`);
}
