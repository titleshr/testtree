export interface ConditionField {
  fieldPath: string;
  sampleValue: unknown;
  possibleValues: unknown[];
  sources: string[];
  isConditionField: boolean;
  notes?: string;
}

export interface ConditionCatalog {
  domain: string;
  fields: ConditionField[];
}
