export interface FieldSummary {
  count: number;
  values: unknown[];
}

export interface FixtureSummary {
  fields: Record<string, FieldSummary>;
}
