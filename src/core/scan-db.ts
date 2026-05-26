import { createDbReader } from './db-client';
import type { DbReader } from './db-client';
import { writeJson } from './write-json';

interface DbField {
  count: number;
  values: unknown[];
}

interface DbSummary {
  fields: Record<string, DbField>;
  meta: {
    source: string;
    database: string;
    collection: string;
  };
}

interface ScanDbOptions {
  uri: string;
  database: string;
  collection: string;
  fields: string[];
  outPath: string;
  // injectable for testing — pass a mock createReader to avoid needing a real MongoDB
  createReader?: (uri: string, database: string, collection: string) => Promise<DbReader>;
}

export async function scanDb({
  uri,
  database,
  collection,
  fields,
  outPath,
  createReader = createDbReader,
}: ScanDbOptions): Promise<void> {
  console.log(`Connecting to "${database}.${collection}"...`);
  const reader = await createReader(uri, database, collection);
  console.log(`Connected. Scanning ${fields.length} field(s)...`);

  try {
    const result: Record<string, DbField> = {};

    for (const field of fields) {
      process.stdout.write(`  scanning: ${field}... `);
      const values = await reader.distinct(field);
      result[field] = {
        count: values.length,
        values,
      };
      console.log(`${values.length} value(s)`);
    }

    const summary: DbSummary = {
      fields: result,
      meta: {
        source: 'mongodb',
        database,
        collection,
      },
    };

    writeJson(outPath, summary);
    // Do NOT log the URI — it may contain credentials
    console.log(`Done. Written to ${outPath}`);
  } finally {
    await reader.close();
  }
}
