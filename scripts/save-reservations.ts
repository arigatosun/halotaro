import { supabase } from "@/lib/supabaseClient";
import { RawReservation } from "@/types/reservations";
import { processReservation } from "@/utils/reservaitonProcessor";

export async function saveReservations(
  rawReservations: RawReservation[],
  haloTaroUserId: string,
  salonboardUserId: string,
  startDate: Date,
  endDate: Date,
  dataHash: string,
  lastReservationId: string
) {
  if (rawReservations.length === 0) {
    console.log("No new reservations to save. Skipping database operation.");
    return;
  }
  const { data: existingLog } = await supabase
    .from("salonboard_sync_logs")
    .select("data_hash, last_reservation_id")
    .eq("user_id", haloTaroUserId)
    .eq("start_date", startDate.toISOString().split("T")[0])
    .eq("end_date", endDate.toISOString().split("T")[0])
    .single();

  if (existingLog && existingLog.data_hash === dataHash) {
    console.log("変更がないため、更新をスキップします");
    return;
  }
  console.log("Raw Reservations:", JSON.stringify(rawReservations, null, 2));

  const processedReservations = await Promise.all(
    rawReservations.map((raw) => processReservation(raw, haloTaroUserId))
  );
  console.log(
    "Processed Reservations:",
    JSON.stringify(processedReservations, null, 2)
  );
  const { data, error } = await supabase.rpc("upsert_reservations_and_log", {
    p_reservations: processedReservations,
    p_user_id: haloTaroUserId,
    p_salonboard_user_id: salonboardUserId,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString(),
    p_data_hash: dataHash,
    p_last_reservation_id: lastReservationId,
  });

  if (error) {
    console.error("Error details:", error);
    throw error;
  }
  console.log("Reservations saved and log updated:", data);
}
