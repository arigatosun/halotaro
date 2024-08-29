import { supabase } from "@/lib/supabaseClient";
import { RawReservation } from "@/types/reservations";
import { processReservation } from "@/utils/reservaitonProcessor";

export async function saveReservations(
  rawReservations: RawReservation[],
  userId: string
) {
  for (const raw of rawReservations) {
    try {
      const processedReservation = await processReservation(raw, userId);
      const { data, error } = await supabase
        .from("reservations")
        .upsert(processedReservation, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (error) throw error;
      console.log("Reservation saved:", data);
    } catch (error) {
      console.error("Error saving reservation:", error);
    }
  }
}
