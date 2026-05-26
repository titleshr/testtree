import { readJson } from './read-json';
import { writeJson } from './write-json';

type SourceName = 'code' | 'fixtures' | 'db' | 'schema';

interface SourceSummary {
  fields: Record<string, { values: unknown[] }>;
}

interface UnifiedValue {
  value: unknown;
  sources: SourceName[];
}

interface UnifiedField {
  fieldPath: string;
  values: UnifiedValue[];
  sourceCoverage: Record<SourceName, boolean>;
}

interface UnifiedConditionCatalog {
  domain: string;
  fields: UnifiedField[];
}

interface MergeConditionsOptions {
  codeSummaryPath?: string;
  fixtureSummaryPath?: string;
  dbSummaryPath?: string;
  schemaSummaryPath?: string;
  outPath: string;
  domain?: string;
}

function loadSource(path: string | undefined): SourceSummary | null {
  if (!path) return null;
  try {
    return readJson(path) as SourceSummary;
  } catch {
    return null;
  }
}

export function mergeConditions({
  codeSummaryPath,
  fixtureSummaryPath,
  dbSummaryPath,
  schemaSummaryPath,
  outPath,
  domain = 'unknown',
}: MergeConditionsOptions): void {
  const sources: Record<SourceName, SourceSummary | null> = {
    code: loadSource(codeSummaryPath),
    fixtures: loadSource(fixtureSummaryPath),
    db: loadSource(dbSummaryPath),
    schema: loadSource(schemaSummaryPath),
  };

  // Collect all field paths from all loaded sources
  const allFieldPaths = new Set<string>();
  for (const summary of Object.values(sources)) {
    if (summary) {
      for (const path of Object.keys(summary.fields)) {
        allFieldPaths.add(path);
      }
    }
  }

  const fields: UnifiedField[] = [];

  for (const fieldPath of allFieldPaths) {
    // Track which sources each value appears in
    const valueToSources = new Map<string, Set<SourceName>>();
    const sourceCoverage: Record<SourceName, boolean> = {
      code: false,
      fixtures: false,
      db: false,
      schema: false,
    };

    for (const [sourceName, summary] of Object.entries(sources) as [SourceName, SourceSummary | null][]) {
      if (!summary) continue;
      const fieldData = summary.fields[fieldPath];
      if (!fieldData?.values?.length) continue;

      sourceCoverage[sourceName] = true;

      for (const value of fieldData.values) {
        const key = JSON.stringify(value);
        if (!valueToSources.has(key)) valueToSources.set(key, new Set());
        valueToSources.get(key)!.add(sourceName);
      }
    }

    const values: UnifiedValue[] = Array.from(valueToSources.entries()).map(([key, sourceSet]) => ({
      value: JSON.parse(key) as unknown,
      sources: Array.from(sourceSet),
    }));

    // Skip fields where no source contributed any values
    if (values.length === 0) continue;

    fields.push({ fieldPath, values, sourceCoverage });
  }

  const catalog: UnifiedConditionCatalog = { domain, fields };
  writeJson(outPath, catalog);

  const loadedSources = (Object.entries(sources) as [SourceName, SourceSummary | null][])
    .filter(([, v]) => v !== null)
    .map(([k]) => k)
    .join(', ');

  console.log(`Merged ${fields.length} field(s) from [${loadedSources}] written to ${outPath}`);
}
