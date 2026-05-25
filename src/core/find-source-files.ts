import { sync as globSync } from 'fast-glob';
import { join } from 'path';

const DEFAULT_IGNORE = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', '**/.git/**'];
const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];

interface FindSourceFilesOptions {
  dir: string;
  include?: string[];
  ignore?: string[];
}

export function findSourceFiles(
  dirOrOptions: string | FindSourceFilesOptions,
  ignoreList?: string[]
): string[] {
  let dir: string;
  let includePatterns: string[];
  let ignorePatterns: string[];

  if (typeof dirOrOptions === 'string') {
    dir = dirOrOptions;
    includePatterns = DEFAULT_INCLUDE.map((p) => join(dir, p).replace(/\\/g, '/'));
    ignorePatterns = ignoreList
      ? ignoreList.map((i) => `**/${i}/**`)
      : DEFAULT_IGNORE;
  } else {
    dir = dirOrOptions.dir;
    includePatterns = dirOrOptions.include
      ? dirOrOptions.include.map((p) => (p.startsWith('/') ? p : join(dir, p).replace(/\\/g, '/')))
      : DEFAULT_INCLUDE.map((p) => join(dir, p).replace(/\\/g, '/'));
    ignorePatterns = dirOrOptions.ignore
      ? dirOrOptions.ignore.map((i) => `**/${i}/**`)
      : DEFAULT_IGNORE;
  }

  return globSync(includePatterns, { ignore: ignorePatterns, absolute: true });
}
