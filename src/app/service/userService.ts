// src/services/userService.ts

import { getUserById } from "../actions/userActions";

export async function getUserStripeConnectId(
  userId: string
): Promise<string | null> {
  const user = await getUserById(userId);
  return user?.stripe_connect_id || null;
}
