type PrimitiveOrMarker = string | number | boolean | null;

function toSummaryValue(value: unknown): PrimitiveOrMarker {
  if (value === null) return null;
  if (Array.isArray(value)) return '[array]';
  if (typeof value === 'object') return '[object]';
  return value as PrimitiveOrMarker;
}

export function flattenObject(
  obj: unknown,
  prefix = '',
  result: Record<string, PrimitiveOrMarker> = {}
): Record<string, PrimitiveOrMarker> {
  if (obj === null || typeof obj !== 'object') {
    result[prefix] = toSummaryValue(obj);
    return result;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      flattenObject(item, prefix ? `${prefix}.${index}` : String(index), result);
    });
    return result;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null || typeof value !== 'object') {
      result[path] = toSummaryValue(value);
    } else {
      flattenObject(value, path, result);
    }
  }

  return result;
}
