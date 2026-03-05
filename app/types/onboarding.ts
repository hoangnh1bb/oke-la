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
      "Gợi ý khi khách đang phân vân về size hoặc chất lượng sản phẩm",
    icon: "🔄",
    triggerHint: "Kích hoạt khi khách mở bảng size hoặc đọc reviews lâu",
  },
  {
    id: "comparison_bar" as const,
    name: "Comparison Bar",
    description: "Thanh so sánh khi khách đang xem nhiều sản phẩm cùng loại",
    icon: "⚖️",
    triggerHint: "Kích hoạt khi khách xem ≥2 sản phẩm cùng danh mục",
  },
  {
    id: "tag_navigator" as const,
    name: "Tag Navigator",
    description:
      "Panel gợi ý danh mục khi khách back nhiều lần mà chưa mua",
    icon: "🧭",
    triggerHint: "Kích hoạt sau 3 lần back mà giỏ hàng trống",
  },
  {
    id: "trust_nudge" as const,
    name: "Trust Nudge",
    description:
      "Hiện đánh giá sao và chính sách đổi trả khi khách do dự ở giỏ hàng",
    icon: "⭐",
    triggerHint: "Kích hoạt khi khách ở trang cart > 60 giây",
  },
];
