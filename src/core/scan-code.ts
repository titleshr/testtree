import { readFileSync } from 'fs';
import { findSourceFiles } from './find-source-files';
import { writeJson } from './write-json';
import type { CodeCondition, CodeScanResult } from '../types/code-condition';

const COMPARISON_RE = /(\w[\w.]*)\s*(===|!==|==|!=)\s*["']([^"']*)["']/g;
const COMPARISON_REVERSED_RE = /["']([^"']*)['"]\s*(===|!==|==|!=)\s*(\w[\w.]*)/g;
const SWITCH_RE = /switch\s*\(\s*(\w[\w.]*)\s*\)/g;
const CASE_RE = /case\s+["']([^"']*)["']\s*:/g;

interface ScanCodeOptions {
  projectDir: string;
  outPath: string;
  include?: string[];
  ignore?: string[];
}

function scanFile(filePath: string, relativeBase: string): CodeCondition[] {
  const conditions: CodeCondition[] = [];
  const lines = readFileSync(filePath, 'utf-8').split('\n');

  // Track the current switch variable per line context
  const switchVars: Map<number, string> = new Map();
  lines.forEach((line, idx) => {
    let match: RegExpExecArray | null;
    const switchPattern = /switch\s*\(\s*(\w[\w.]*)\s*\)/g;
    while ((match = switchPattern.exec(line)) !== null) {
      switchVars.set(idx, match[1]);
    }
  });

  // Find the nearest switch variable before a given line
  function findSwitchVar(lineIndex: number): string {
    for (let i = lineIndex; i >= 0; i--) {
      if (switchVars.has(i)) return switchVars.get(i)!;
    }
    return '';
  }

  lines.forEach((line, idx) => {
    const lineNumber = idx + 1;
    const relativeFile = filePath.startsWith(relativeBase)
      ? filePath.slice(relativeBase.length).replace(/^\//, '')
      : filePath;

    // Forward comparison: identifier === "value"
    let match: RegExpExecArray | null;
    const compRe = new RegExp(COMPARISON_RE.source, 'g');
    while ((match = compRe.exec(line)) !== null) {
      conditions.push({
        fieldPath: match[1],
        operator: match[2],
        value: match[3],
        file: relativeFile,
        line: lineNumber,
        sourceType: 'comparison',
      });
    }

    // Reversed comparison: "value" === identifier
    const compRevRe = new RegExp(COMPARISON_REVERSED_RE.source, 'g');
    while ((match = compRevRe.exec(line)) !== null) {
      conditions.push({
        fieldPath: match[3],
        operator: match[2],
        value: match[1],
        file: relativeFile,
        line: lineNumber,
        sourceType: 'comparison',
      });
    }

    // Switch case
    const caseRe = new RegExp(CASE_RE.source, 'g');
    while ((match = caseRe.exec(line)) !== null) {
      const switchVar = findSwitchVar(idx);
      conditions.push({
        fieldPath: switchVar,
        operator: '===',
        value: match[1],
        file: relativeFile,
        line: lineNumber,
        sourceType: 'switch-case',
      });
    }
  });

  return conditions;
}

export function scanCode(options: ScanCodeOptions): void {
  const { projectDir, outPath, include, ignore } = options;

  const files = findSourceFiles({ dir: projectDir, include, ignore });
  const conditions: CodeCondition[] = [];

  for (const file of files) {
    conditions.push(...scanFile(file, projectDir));
  }

  const result: CodeScanResult = {
    conditions,
    meta: {
      scanner: 'text',
      accuracy: 'best-effort',
    },
  };

  writeJson(outPath, result);
  console.log(`Scanned ${files.length} file(s). Found ${conditions.length} condition(s) written to ${outPath}`);
}
