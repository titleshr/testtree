export interface CodeCondition {
  fieldPath: string;
  operator: string;
  value: string;
  file: string;
  line: number;
  sourceType: 'comparison' | 'switch-case' | 'binary-expression';
}

export interface CodeScanResult {
  conditions: CodeCondition[];
  meta: {
    scanner: string;
    accuracy: string;
  };
}
