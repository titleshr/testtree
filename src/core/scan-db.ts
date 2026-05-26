import { MongoClient } from 'mongodb';
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
  // injectable for testing — avoids needing a real MongoDB connection in unit tests
  createClient?: (uri: string) => Pick<MongoClient, 'connect' | 'db' | 'close'>;
}

export async function scanDb({
  uri,
  database,
  collection,
  fields,
  outPath,
  createClient = (u) => new MongoClient(u),
}: ScanDbOptions): Promise<void> {
  const client = createClient(uri);

  try {
    await client.connect();
    const db = client.db(database);
    const col = db.collection(collection);

    const result: Record<string, DbField> = {};

    for (const field of fields) {
      const values = await col.distinct(field);
      result[field] = {
        count: values.length,
        values,
      };
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
    console.log(
      `DB-scanned "${database}.${collection}" (${fields.length} field(s)) written to ${outPath}`
    );
  } finally {
    await client.close();
  }
}
