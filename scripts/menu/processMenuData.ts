// processMenuData.ts

import { RawMenuItem } from "./scrapeMenus";

interface ProcessedMenuItem {
  user_id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  is_reservable: boolean;
}

export function processMenuData(
  rawMenuItems: RawMenuItem[],
  userId: string
): ProcessedMenuItem[] {
  return rawMenuItems.map((item) => ({
    user_id: userId,
    name: item.name,
    category: item.category,
    description: item.description,
    price: parsePrice(item.price),
    duration: parseDuration(item.duration),
    is_reservable: item.isReservable,
  }));
}

function parsePrice(priceString: string): number {
  return parseInt(priceString.replace(/[^0-9]/g, ""), 10);
}

function parseDuration(durationString: string): number {
  const match = durationString.match(/(\d+)分/);
  return match ? parseInt(match[1], 10) : 0;
}
