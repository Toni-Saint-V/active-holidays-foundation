import type {
  CaseSignals,
  CountryRestriction,
  InsuranceProductDefinition,
  PathDefinition,
  ProductType,
  ResidencyProgramDefinition,
  RuleCategory,
  RuleMetadata,
  RuleOutput,
  RuleOutputType,
  RuleResult,
  SignalId,
  VisaRule
} from "@shared/contracts";

export type EvaluationContext = {
  productType: ProductType;
  signals: CaseSignals;
  visaRules: VisaRule[];
  paths: PathDefinition[];
  restrictions: CountryRestriction[];
  residencyPrograms: ResidencyProgramDefinition[];
  insuranceProducts: InsuranceProductDefinition[];
};

export type EvaluatedRule = {
  fired: boolean;
  output: RuleOutput;
  explanation: string;
  consumedSignals: SignalId[];
};

export interface RuleDefinition {
  id: string;
  title: string;
  priority: number;
  category: RuleCategory;
  productType: ProductType;
  consumesSignals: SignalId[];
  outputType: RuleOutputType;
  defaultOutput: RuleOutput;
  explanationTemplate: string;
  evaluate: (ctx: EvaluationContext) => EvaluatedRule;
}

export function toRuleMetadata(rule: RuleDefinition): RuleMetadata {
  return {
    id: rule.id,
    title: rule.title,
    priority: rule.priority,
    category: rule.category,
    productType: rule.productType,
    consumes_signal_ids: rule.consumesSignals,
    output_type: rule.outputType,
    output_value: rule.defaultOutput,
    explanation_template: rule.explanationTemplate
  };
}

export function toRuleResult(rule: RuleDefinition, evaluated: EvaluatedRule): RuleResult {
  return {
    ruleId: rule.id,
    fired: evaluated.fired,
    category: rule.category,
    priority: rule.priority,
    productType: rule.productType,
    output: evaluated.output,
    consumedSignals: evaluated.consumedSignals,
    explanation: evaluated.explanation
  };
}
