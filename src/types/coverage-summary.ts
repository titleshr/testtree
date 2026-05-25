export interface FieldCoverage {
  covered: number;
  total: number;
  percent: number;
}

export interface CoverageField {
  codeValues: unknown[];
  fixtureValues: unknown[];
  missingInFixtures: unknown[];
  extraInFixtures: unknown[];
  coverage: FieldCoverage;
}

export interface CoverageSummary {
  fields: Record<string, CoverageField>;
}
