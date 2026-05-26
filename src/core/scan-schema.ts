import { Project, SyntaxKind, Node } from 'ts-morph';
import { writeJson } from './write-json';

interface SchemaField {
  values: string[];
  rules: string[];
}

interface SchemaSummary {
  fields: Record<string, SchemaField>;
}

interface ScanSchemaOptions {
  projectDir: string;
  outPath: string;
  tsConfigPath?: string;
}

function getOrCreate(fields: Record<string, SchemaField>, key: string): SchemaField {
  if (!fields[key]) fields[key] = { values: [], rules: [] };
  return fields[key];
}

function addValue(fields: Record<string, SchemaField>, fieldPath: string, value: string): void {
  const f = getOrCreate(fields, fieldPath);
  if (!f.values.includes(value)) f.values.push(value);
}

function addRule(fields: Record<string, SchemaField>, fieldPath: string, rule: string): void {
  const f = getOrCreate(fields, fieldPath);
  if (!f.rules.includes(rule)) f.rules.push(rule);
}

function extractArrayStrings(node: Node): string[] {
  if (!Node.isArrayLiteralExpression(node)) return [];
  return node
    .getElements()
    .filter((el) => Node.isStringLiteral(el))
    .map((el) => el.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue());
}

// Process a Zod call expression (possibly chained: z.string().min(1))
function processZodExpr(
  node: Node,
  fields: Record<string, SchemaField>,
  fieldPath: string,
  pathParts: string[]
): void {
  if (!Node.isCallExpression(node)) return;

  const expr = node.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return;

  const methodName = expr.getName();
  const baseExpr = expr.getExpression();
  const baseText = baseExpr.getText();

  // Direct z.xxx() calls
  if (baseText === 'z') {
    if (methodName === 'enum') {
      const args = node.getArguments();
      if (args.length > 0) {
        for (const v of extractArrayStrings(args[0])) addValue(fields, fieldPath, v);
      }
      addRule(fields, fieldPath, 'enum');
    } else if (methodName === 'nativeEnum') {
      addRule(fields, fieldPath, 'nativeEnum');
    } else if (methodName === 'object') {
      const args = node.getArguments();
      if (args.length > 0) processZodObject(args[0], fields, pathParts);
    }
    return;
  }

  // Chained methods: .min(N), .max(N), .minLength(N), .maxLength(N)
  if (methodName === 'min' || methodName === 'minLength') {
    const args = node.getArguments();
    if (args.length > 0) addRule(fields, fieldPath, `${methodName}:${args[0].getText()}`);
  } else if (methodName === 'max' || methodName === 'maxLength') {
    const args = node.getArguments();
    if (args.length > 0) addRule(fields, fieldPath, `${methodName}:${args[0].getText()}`);
  }

  // Recurse into the base to handle further chaining or nested z.object()
  processZodExpr(baseExpr, fields, fieldPath, pathParts);
}

function processZodObject(
  objectNode: Node,
  fields: Record<string, SchemaField>,
  parentPath: string[]
): void {
  if (!Node.isObjectLiteralExpression(objectNode)) return;

  for (const prop of objectNode.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;

    const keyName = prop.getName();
    const currentPath = [...parentPath, keyName];
    const fieldPath = currentPath.join('.');
    const initializer = prop.getInitializer();
    if (!initializer) continue;

    processZodExpr(initializer, fields, fieldPath, currentPath);
  }
}

// Walk a call chain to find the root z.object() call
function findAndProcessZodObject(node: Node, fields: Record<string, SchemaField>): void {
  if (!Node.isCallExpression(node)) return;

  const expr = node.getExpression();
  if (!Node.isPropertyAccessExpression(expr)) return;

  const methodName = expr.getName();
  const baseExpr = expr.getExpression();

  if (baseExpr.getText() === 'z' && methodName === 'object') {
    const args = node.getArguments();
    if (args.length > 0) processZodObject(args[0], fields, []);
    return;
  }

  findAndProcessZodObject(baseExpr, fields);
}

export function scanSchema({ projectDir, outPath, tsConfigPath }: ScanSchemaOptions): void {
  const project = tsConfigPath
    ? new Project({ tsConfigFilePath: tsConfigPath })
    : new Project({
        compilerOptions: {
          experimentalDecorators: true,
          skipLibCheck: true,
        },
      });

  if (!tsConfigPath) {
    project.addSourceFilesAtPaths([
      `${projectDir}/**/*.ts`,
      `${projectDir}/**/*.tsx`,
      `!**/node_modules/**`,
      `!**/dist/**`,
      `!**/build/**`,
    ]);
  }

  const fields: Record<string, SchemaField> = {};
  const sourceFiles = project.getSourceFiles();

  for (const sourceFile of sourceFiles) {
    // 1. TypeScript enums
    sourceFile.getDescendantsOfKind(SyntaxKind.EnumDeclaration).forEach((enumDecl) => {
      const enumName = enumDecl.getName();
      for (const member of enumDecl.getMembers()) {
        const val = member.getValue();
        if (typeof val === 'string') addValue(fields, enumName, val);
      }
      addRule(fields, enumName, 'enum');
    });

    // 2. Class properties with class-validator decorators
    sourceFile.getDescendantsOfKind(SyntaxKind.PropertyDeclaration).forEach((propDecl) => {
      const decorators = propDecl.getDecorators();
      if (decorators.length === 0) return;

      const propName = propDecl.getName();

      for (const decorator of decorators) {
        const name = decorator.getName();
        const args = decorator.getArguments();

        if (name === 'IsEnum') {
          addRule(fields, propName, 'enum');
        } else if (name === 'IsNotEmpty') {
          addRule(fields, propName, 'required');
        } else if (name === 'Min' && args.length > 0) {
          addRule(fields, propName, `min:${args[0].getText()}`);
        } else if (name === 'Max' && args.length > 0) {
          addRule(fields, propName, `max:${args[0].getText()}`);
        } else if (name === 'MinLength' && args.length > 0) {
          addRule(fields, propName, `minLength:${args[0].getText()}`);
        } else if (name === 'MaxLength' && args.length > 0) {
          addRule(fields, propName, `maxLength:${args[0].getText()}`);
        } else if (name === 'IsString') {
          addRule(fields, propName, 'string');
        } else if (name === 'IsNumber') {
          addRule(fields, propName, 'number');
        }
      }
    });

    // 3. Zod schemas in variable declarations
    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((varDecl) => {
      const initializer = varDecl.getInitializer();
      if (!initializer) return;
      findAndProcessZodObject(initializer, fields);
    });
  }

  const summary: SchemaSummary = { fields };
  writeJson(outPath, summary);
  console.log(
    `Schema-scanned ${sourceFiles.length} file(s). Found ${Object.keys(fields).length} field(s) written to ${outPath}`
  );
}
