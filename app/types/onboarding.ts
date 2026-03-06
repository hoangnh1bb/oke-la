export type WidgetId =
  | "alternative_nudge"
  | "comparison_bar"
  | "tag_navigator"
  | "trust_nudge";

export type WidgetConfig = Record<WidgetId, boolean>;

export type WizardStep = 1 | 2 | 3;

export const WIDGET_IDS: WidgetId[] = [
  "alternative_nudge",
  "comparison_bar",
  "tag_navigator",
  "trust_nudge",
];

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  alternative_nudge: true,
  comparison_bar: true,
  tag_navigator: true,
  trust_nudge: true,
};

export const WIDGETS = [
  {
    id: "alternative_nudge" as const,
    name: "Alternative Nudge",
    description:
      "Suggest alternatives when shoppers hesitate about size or quality",
    icon: "🔄",
    triggerHint: "Triggers when shopper opens size chart or reads reviews for a while",
  },
  {
    id: "comparison_bar" as const,
    name: "Comparison Bar",
    description: "Comparison bar when shoppers browse multiple similar products",
    icon: "⚖️",
    triggerHint: "Triggers when shopper views ≥2 products in the same category",
  },
  {
    id: "tag_navigator" as const,
    name: "Tag Navigator",
    description:
      "Category suggestion panel when shoppers navigate back repeatedly without buying",
    icon: "🧭",
    triggerHint: "Triggers after 3 back navigations with an empty cart",
  },
  {
    id: "trust_nudge" as const,
    name: "Trust Nudge",
    description:
      "Show star ratings and return policy when shoppers hesitate at cart",
    icon: "⭐",
    triggerHint: "Triggers when shopper stays on cart page > 60 seconds",
  },
];
