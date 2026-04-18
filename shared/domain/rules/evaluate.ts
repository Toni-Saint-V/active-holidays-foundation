import type { ProductType, RuleResult } from "@shared/contracts";
import {
  allTravelRuleDefinitions,
  getRuleDefinitionById
} from "./definitions";
import { residencyRules } from "./residencyRules";
import { insuranceRules } from "./insuranceRules";
import type { EvaluationContext, RuleDefinition } from "./types";
import { toRuleResult } from "./types";
import { hasRequiredSignalsForRule } from "./definitions";

const allRuleDefinitions: RuleDefinition[] = [
  ...allTravelRuleDefinitions,
  ...residencyRules,
  ...insuranceRules
];

export function rulesForProduct(productType: ProductType): RuleDefinition[] {
  return allRuleDefinitions.filter((rule) => rule.productType === productType);
}

export function evaluateRules(ctx: EvaluationContext): RuleResult[] {
  const relevantRules = rulesForProduct(ctx.productType);
  const results: RuleResult[] = [];
  for (const rule of relevantRules) {
    if (!hasRequiredSignalsForRule(rule, ctx.signals)) {
      results.push(
        toRuleResult(rule, {
          fired: false,
          output: rule.defaultOutput,
          explanation: `${rule.title}: не хватает сигналов для оценки.`,
          consumedSignals: rule.consumesSignals
        })
      );
      continue;
    }
    const evaluated = rule.evaluate(ctx);
    results.push(toRuleResult(rule, evaluated));
  }
  return results
    .slice()
    .sort((a, b) => b.priority - a.priority || a.ruleId.localeCompare(b.ruleId));
}

export function rulesCatalogMetadata() {
  return allRuleDefinitions
    .slice()
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

export { allRuleDefinitions, getRuleDefinitionById };
