/**
 * analytics-query.server.ts
 * Query helpers for SmartRec ActionLog analytics.
 * Handles gracefully when table doesn't exist yet (try/catch → return zeros).
 */
import prisma from "../../db.server";

export interface ActionSummaryRow {
  widgetType: string;
  triggered: number;
  clicked: number;
  ctr: number;
  conversions: number;
}

export interface TodaySummary {
  triggeredToday: number;
  clickedToday: number;
  ctr: number;
}

/**
 * Summarise ActionLog for a shop over the last `days` days.
 * Returns one row per widget type.
 * Uses separate count queries to avoid Prisma's lack of _sum on Boolean fields.
 */
export async function getActionSummary(
  shop: string,
  days = 7,
): Promise<ActionSummaryRow[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Group by actionType for total triggered count
    const triggered = await prisma.actionLog.groupBy({
      by: ["actionType"],
      where: { shop, createdAt: { gte: since } },
      _count: { id: true },
    });

    if (triggered.length === 0) return [];

    // For each widget type get clicked and convertedToCart counts separately
    const results: ActionSummaryRow[] = await Promise.all(
      triggered.map(async (row) => {
        const actionType = row.actionType;
        const totalTriggered = row._count.id;

        const [clicked, conversions] = await Promise.all([
          prisma.actionLog.count({
            where: { shop, actionType, createdAt: { gte: since }, clicked: true },
          }),
          prisma.actionLog.count({
            where: {
              shop,
              actionType,
              createdAt: { gte: since },
              convertedToCart: true,
            },
          }),
        ]);

        return {
          widgetType: actionType,
          triggered: totalTriggered,
          clicked,
          ctr:
            totalTriggered > 0
              ? Math.round((clicked / totalTriggered) * 100)
              : 0,
          conversions,
        };
      }),
    );

    return results;
  } catch (e) {
    console.error("[SmartRec] getActionSummary error:", e);
    return [];
  }
}

/**
 * Quick summary of today's activity for dashboard status card.
 */
export async function getTodaySummary(shop: string): Promise<TodaySummary> {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [triggered, clicked] = await Promise.all([
      prisma.actionLog.count({ where: { shop, createdAt: { gte: startOfDay } } }),
      prisma.actionLog.count({
        where: { shop, createdAt: { gte: startOfDay }, clicked: true },
      }),
    ]);

    return {
      triggeredToday: triggered,
      clickedToday: clicked,
      ctr: triggered > 0 ? Math.round((clicked / triggered) * 100) : 0,
    };
  } catch (e) {
    console.error("[SmartRec] getTodaySummary error:", e);
    return { triggeredToday: 0, clickedToday: 0, ctr: 0 };
  }
}
