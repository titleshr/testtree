export interface Scenario {
  name: string;
  purpose: string;
  coveredConditions: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ScenarioPlan {
  domain: string;
  strategy: string;
  scenarios: Scenario[];
}
