"use strict";
// processMenuData.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMenuData = processMenuData;
function processMenuData(rawMenuItems, userId) {
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
function parsePrice(priceString) {
    return parseInt(priceString.replace(/[^0-9]/g, ""), 10);
}
function parseDuration(durationString) {
    const match = durationString.match(/(\d+)分/);
    return match ? parseInt(match[1], 10) : 0;
}
