// useStaffManagement.ts
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useCallback } from "react";

export interface Staff {
  id: string;
  user_id: string;
  name: string;
  role: string;
  experience?: string;
  description?: string;
  is_published: boolean;
  image?: string | null;
}

export interface NewStaff {
  name: string;
  role: string;
  experience?: string;
  description?: string;
  image?: string | null; // `null` を許容
  is_published?: boolean;
}

interface ErrorWithMessage {
  message: string;
}

export function useStaffManagement(userId: string, menuItemId?: string) {
  // userId を必須に変更
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorWithMessage | null>(null);

  console.log("menuItemId", menuItemId);

  // useStaffManagement.ts 内

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);

      // ベースクエリ: user_id が一致する staff を取得
      let query = supabase.from("staff").select("*").eq("user_id", userId);

      // まず menuItemId が整数かどうか判定 (クーポンなら UUID)
      // 例: /^[0-9]+$/ で判定
      const isInteger = /^[0-9]+$/.test(menuItemId || "");

      if (menuItemId && isInteger) {
        // メニューIDとしてスタッフ除外を適用
        const { data: unavailableStaff, error: unavailableStaffError } =
          await supabase
            .from("menu_item_unavailable_staff")
            .select("staff_id")
            .eq("menu_item_id", menuItemId); // ここは整数の想定

        if (unavailableStaffError) throw unavailableStaffError;

        const unavailableStaffIds = unavailableStaff.map(
          (item) => item.staff_id
        );
        if (unavailableStaffIds.length > 0) {
          query = query.not("id", "in", `(${unavailableStaffIds.join(",")})`);
        }
      } else {
        // menuItemId が UUID or そもそも未指定 => クーポン or 指定なし
        // => 特に staff の除外はしない
      }

      const { data, error } = await query;
      if (error) throw error;

      setStaffList(data || []);
      setError(null);
    } catch (err: any) {
      setError({
        message: err.message || "スタッフデータの取得に失敗しました",
      });
      console.error("Fetch Staff Error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, menuItemId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const uploadStaffImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from("staff-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("staff-images")
        .getPublicUrl(filePath);

      if (!data || !data.publicUrl) {
        throw new Error("Failed to get public URL");
      }

      return data.publicUrl;
    } catch (error: any) {
      console.error("画像のアップロードに失敗しました: ", error.message);
      return null;
    }
  };

  const addStaff = async (
    newStaff: NewStaff, // user_id を含めない
    imageFile: File | null
  ): Promise<Staff> => {
    try {
      let imageUrl = newStaff.image ?? null;
      if (imageFile) {
        const uploadedImageUrl = await uploadStaffImage(imageFile);
        if (!uploadedImageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
        imageUrl = uploadedImageUrl;
      }

      const staffData: NewStaff = { ...newStaff, image: imageUrl };

      console.log("Inserting staff data:", staffData); // デバッグ用ログ

      const { data, error } = await supabase
        .from("staff")
        .insert(staffData)
        .select()
        .single();

      console.log("Insert response data:", data); // デバッグ用ログ
      console.log("Insert response error:", error); // デバッグ用ログ

      if (error) throw error;
      if (!data) throw new Error("スタッフの追加に失敗しました");

      const addedStaff: Staff = data;
      setStaffList([...staffList, addedStaff]);
      setError(null);
      return addedStaff;
    } catch (err: any) {
      // any 型に変更
      setError({ message: err.message || "スタッフの追加に失敗しました" });
      console.error("Add Staff Error:", err);
      throw err;
    }
  };

  const updateStaff = async (
    updatedStaff: Staff,
    imageFile: File | null
  ): Promise<Staff> => {
    // 戻り値の型を明示
    try {
      let imageUrl = updatedStaff.image;
      if (imageFile) {
        const uploadedImageUrl = await uploadStaffImage(imageFile);
        if (!uploadedImageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
        imageUrl = uploadedImageUrl;
      }

      const { error } = await supabase
        .from("staff")
        .update({ ...updatedStaff, image: imageUrl })
        .eq("id", updatedStaff.id);

      if (error) throw error;

      const updatedStaffWithImage: Staff = { ...updatedStaff, image: imageUrl };
      setStaffList(
        staffList.map((staff) =>
          staff.id === updatedStaff.id ? updatedStaffWithImage : staff
        )
      );
      setError(null);
      return updatedStaffWithImage;
    } catch (err: any) {
      setError({ message: err.message || "スタッフ情報の更新に失敗しました" });
      console.error("Update Staff Error:", err);
      throw err;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;

      setStaffList(staffList.filter((staff) => staff.id !== id));
      setError(null);
    } catch (err: any) {
      setError({ message: err.message || "スタッフの削除に失敗しました" });
      console.error("Delete Staff Error:", err);
      throw err;
    }
  };

  const toggleStaffPublish = async (id: string, is_published: boolean) => {
    try {
      const { error } = await supabase
        .from("staff")
        .update({ is_published })
        .eq("id", id);

      if (error) throw error;

      setStaffList(
        staffList.map((staff) =>
          staff.id === id ? { ...staff, is_published } : staff
        )
      );
      setError(null);
    } catch (err: any) {
      setError({ message: err.message || "公開状態の変更に失敗しました" });
      console.error("Toggle Publish Error:", err);
      throw err;
    }
  };

  return {
    staffList,
    setStaffList,
    loading,
    error,
    addStaff,
    updateStaff,
    deleteStaff,
    toggleStaffPublish,
    refreshStaff: fetchStaff,
  };
}
