"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processStaffData = processStaffData;
function processStaffData(rawData, userId) {
    return rawData.map((staff) => ({
        name: staff.name,
        role: staff.role,
        experience: staff.experience === "－" ? null : staff.experience,
        is_published: staff.isPublished,
        image: staff.image || null,
        description: staff.description || null,
        user_id: userId,
    }));
}
