export interface DbConfig {
  uri: string;
  database: string;
  collection: string;
  fields: string[];
}

export interface TestTreeConfig {
  project?: string;
  outputDir?: string;
  domain?: string;
  base?: string;
  variants?: string;
  fixtures?: string;
  db?: DbConfig;
}

export interface ResolvedConfig {
  project: string;
  outputDir: string;
  domain: string;
  base: string;
  variants: string;
  fixtures: string;
  db?: DbConfig;
}
