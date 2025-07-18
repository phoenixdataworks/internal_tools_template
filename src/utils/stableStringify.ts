/**
 * Creates a stable string representation of an object or array.
 * This is useful for comparing complex objects or using them as React dependency array items.
 *
 * The function handles circular references and produces consistent output for objects
 * with the same properties regardless of property order.
 *
 * @param obj The object to stringify
 * @returns A stable string representation
 */
export function stableStringify(obj: unknown): string {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (typeof obj === 'string') return JSON.stringify(obj);

  // Handle arrays by stringifying each element and joining
  if (Array.isArray(obj)) {
    return `[${obj.map(item => stableStringify(item)).join(',')}]`;
  }

  // Handle objects by sorting keys
  if (typeof obj === 'object') {
    const seen = new Set<object>();
    const stringify = (o: Record<string, unknown>): string => {
      // Handle circular references
      if (seen.has(o)) return '"[Circular]"';
      seen.add(o);

      const sortedKeys = Object.keys(o).sort();
      return `{${sortedKeys.map(key => `"${key}":${stableStringify(o[key])}`).join(',')}}`;
    };

    return stringify(obj as Record<string, unknown>);
  }

  // Handle functions, symbols, etc.
  try {
    return JSON.stringify(obj) || String(obj);
  } catch {
    return String(obj);
  }
}
