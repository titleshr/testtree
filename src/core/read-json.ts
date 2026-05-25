import { readFileSync } from 'fs';

export function readJson(filePath: string): unknown {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}
