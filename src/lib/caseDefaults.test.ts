import { describe, expect, it } from "vitest";
import { productTypeSchema } from "@shared/contracts";
import {
  defaultCaseByProduct,
  productTypeLabel
} from "./caseDefaults";

describe("caseDefaults", () => {
  it("covers every declared ProductType with a default case and label", () => {
    const productTypes = [...productTypeSchema.options].sort();

    expect(Object.keys(defaultCaseByProduct).sort()).toEqual(productTypes);
    expect(productTypes.map((productType) => productTypeLabel(productType))).toEqual([
      "Страховой сценарий",
      "ВНЖ Испании",
      "Визовый маршрут"
    ]);
  });
});
