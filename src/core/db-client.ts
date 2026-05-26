import { MongoClient } from 'mongodb';

// The only database operations allowed in TestTree.
// This file defines the read-only surface area — nothing outside this interface
// should ever be called against the database.
export interface DbReader {
  distinct(field: string): Promise<unknown[]>;
  close(): Promise<void>;
}

export async function createDbReader(
  uri: string,
  database: string,
  collection: string
): Promise<DbReader> {
  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(database).collection(collection);

  return {
    distinct: (field: string) => col.distinct(field),
    close: () => client.close(),
  };
}
