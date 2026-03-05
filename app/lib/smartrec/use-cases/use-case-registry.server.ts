/**
 * Use Case Registry — Plug-and-play entry point.
 * To add a new UC: create handler file, import it, add to array.
 * To disable a UC: remove from array (or toggle via merchant settings).
 * Order matters: first match wins (priority: UC-02 > UC-01 > UC-03).
 */
import type { UseCaseHandler } from "../types";
import { uc02ComparisonShopperHandler } from "./uc02-comparison-shopper.server";
import { uc01HesitatingShopperHandler } from "./uc01-hesitating-shopper.server";
import { uc03LostShopperHandler } from "./uc03-lost-shopper-tag-navigator.server";

// Priority order: first match wins
export const useCaseHandlers: UseCaseHandler[] = [
  uc02ComparisonShopperHandler, // Highest priority on product pages
  uc01HesitatingShopperHandler, // Hesitation signals on product pages
  uc03LostShopperHandler,       // Lost navigation pattern (any page)
];
