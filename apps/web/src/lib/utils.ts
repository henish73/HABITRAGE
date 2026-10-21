import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { formatCAD } from '@financeos/shared';

// Vault categorical palette: mid-lightness hues that stay legible on light and dark cards.
// Reserved semantic colours (positive / negative / warning) are deliberately not used here,
// so a category never reads as "good" or "bad".
export const CHART_PALETTE = [
  '#2F6BB3', // navy blue
  '#14968A', // vault teal
  '#D08A16', // amber
  '#7A5BB5', // plum
  '#3F9BC9', // sky
  '#5E9C4A', // moss
  '#B5577F', // berry
  '#8C7B55', // khaki
  '#5B7088', // slate
  '#C9503F', // brick
];
