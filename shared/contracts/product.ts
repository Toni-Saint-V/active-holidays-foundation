import { z } from "zod";

export const productTypeSchema = z.enum([
  "travel",
  "residency_es",
  "insurance_adult"
]);
export type ProductType = z.infer<typeof productTypeSchema>;

export const productLabelsRu: Record<ProductType, string> = {
  travel: "Поездка",
  residency_es: "ВНЖ Испании",
  insurance_adult: "Страховка"
};

export const productEyebrowRu: Record<ProductType, string> = {
  travel: "Детерминированный помощник по поездкам",
  residency_es: "Резидентский помощник по Испании",
  insurance_adult: "Помощник по медицинской страховке"
};
