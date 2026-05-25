import cloneDeep from 'lodash.clonedeep';
import set from 'lodash.set';

export function applyPatch(base: unknown, patch: Record<string, unknown>): unknown {
  const result = cloneDeep(base);
  for (const [path, value] of Object.entries(patch)) {
    set(result as object, path, value);
  }
  return result;
}
