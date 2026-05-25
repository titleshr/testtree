export interface TestTreeConfig {
  project?: string;
  outputDir?: string;
  domain?: string;
  base?: string;
  variants?: string;
  fixtures?: string;
}

export interface ResolvedConfig {
  project: string;
  outputDir: string;
  domain: string;
  base: string;
  variants: string;
  fixtures: string;
}
