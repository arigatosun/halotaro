import { RawStaffData } from "./scrapeStaff";

export interface ProcessedStaffData {
  name: string;
  role: string;
  experience: string | null;
  is_published: boolean;
  image: string | null;
  description: string | null;
  user_id: string;
}

export function processStaffData(
  rawData: RawStaffData[],
  userId: string
): ProcessedStaffData[] {
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
