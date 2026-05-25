import { Project, SyntaxKind, Node, VariableDeclarationKind } from 'ts-morph';
import { writeJson } from './write-json';
import type { CodeCondition, CodeScanResult } from '../types/code-condition';

interface ScanTsOptions {
  projectDir: string;
  outPath: string;
  tsConfigPath?: string;
}

export function scanTypescript(options: ScanTsOptions): void {
  const { projectDir, outPath, tsConfigPath } = options;

  const project = tsConfigPath
    ? new Project({ tsConfigFilePath: tsConfigPath })
    : new Project();

  if (!tsConfigPath) {
    project.addSourceFilesAtPaths([
      `${projectDir}/**/*.ts`,
      `${projectDir}/**/*.tsx`,
      `!**/node_modules/**`,
      `!**/dist/**`,
      `!**/build/**`,
    ]);
  }

  const conditions: CodeCondition[] = [];
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Binary expressions: a.b === "value" or "value" === a.b
    sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression).forEach((expr) => {
      const op = expr.getOperatorToken().getText();
      if (!['===', '!==', '==', '!='].includes(op)) return;

      const left = expr.getLeft().getText().trim();
      const right = expr.getRight().getText().trim();
      const isRightString = right.startsWith('"') || right.startsWith("'");
      const isLeftString = left.startsWith('"') || left.startsWith("'");

      if (isRightString && !isLeftString) {
        conditions.push({
          fieldPath: left,
          operator: op,
          value: right.replace(/^["']|["']$/g, ''),
          file: filePath,
          line: expr.getStartLineNumber(),
          sourceType: 'binary-expression',
        });
      } else if (isLeftString && !isRightString) {
        conditions.push({
          fieldPath: right,
          operator: op,
          value: left.replace(/^["']|["']$/g, ''),
          file: filePath,
          line: expr.getStartLineNumber(),
          sourceType: 'binary-expression',
        });
      }
    });

    // Switch statements
    sourceFile.getDescendantsOfKind(SyntaxKind.SwitchStatement).forEach((switchStmt) => {
      const switchVar = switchStmt.getExpression().getText().trim();
      switchStmt.getCaseBlock().getClauses().forEach((clause) => {
        if (Node.isCaseClause(clause)) {
          const caseExpr = clause.getExpression().getText().trim();
          if (caseExpr.startsWith('"') || caseExpr.startsWith("'")) {
            conditions.push({
              fieldPath: switchVar,
              operator: '===',
              value: caseExpr.replace(/^["']|["']$/g, ''),
              file: filePath,
              line: clause.getStartLineNumber(),
              sourceType: 'switch-case',
            });
          }
        }
      });
    });

    // Enum declarations
    sourceFile.getDescendantsOfKind(SyntaxKind.EnumDeclaration).forEach((enumDecl) => {
      const enumName = enumDecl.getName();
      enumDecl.getMembers().forEach((member) => {
        const value = member.getValue();
        if (typeof value === 'string') {
          conditions.push({
            fieldPath: enumName,
            operator: '===',
            value,
            file: filePath,
            line: member.getStartLineNumber(),
            sourceType: 'binary-expression',
          });
        }
      });
    });

    // Const object string values: const X = { KEY: "value" }
    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((varDecl) => {
      const declList = varDecl.getParent();
      if (!Node.isVariableDeclarationList(declList)) return;
      if (declList.getDeclarationKind() !== VariableDeclarationKind.Const) return;

      const rawInit = varDecl.getInitializer();
      if (!rawInit) return;
      // Unwrap `as const` type assertions
      const init = Node.isAsExpression(rawInit) ? rawInit.getExpression() : rawInit;
      if (!Node.isObjectLiteralExpression(init)) return;

      const objName = varDecl.getName();
      init.getProperties().forEach((prop) => {
        if (!Node.isPropertyAssignment(prop)) return;
        const val = prop.getInitializer()?.getText().trim() ?? '';
        if (val.startsWith('"') || val.startsWith("'")) {
          conditions.push({
            fieldPath: objName,
            operator: '===',
            value: val.replace(/^["']|["']$/g, ''),
            file: filePath,
            line: prop.getStartLineNumber(),
            sourceType: 'binary-expression',
          });
        }
      });
    });
  }

  const result: CodeScanResult = {
    conditions,
    meta: {
      scanner: 'ts-morph',
      accuracy: 'ast-based',
    },
  };

  writeJson(outPath, result);
  console.log(
    `AST-scanned ${sourceFiles.length} file(s). Found ${conditions.length} condition(s) written to ${outPath}`
  );
}
