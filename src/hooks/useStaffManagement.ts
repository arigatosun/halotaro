import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect, useCallback } from "react";

export interface Staff {
  id: string;
  name: string;
  role: string;
  experience: string | null;
  is_published: boolean;
  image: string | null;
  description: string | null;
  user_id: string;
}

interface ErrorWithMessage {
  message: string;
}

export function useStaffManagement(userId: string) {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorWithMessage | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      setStaffList(data || []);
      setError(null);
    } catch (err) {
      setError({ message: "スタッフデータの取得に失敗しました" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
    } catch (error) {
      console.error("画像のアップロードに失敗しました: ", error);
      return null;
    }
  };

  const addStaff = async (
    newStaff: Omit<Staff, "id">,
    imageFile: File | null
  ): Promise<Staff> => {
    try {
      let imageUrl = newStaff.image;
      if (imageFile) {
        imageUrl = await uploadStaffImage(imageFile);
        if (!imageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
      }

      const { data, error } = await supabase
        .from("staff")
        .insert({ ...newStaff, image: imageUrl })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error("スタッフの追加に失敗しました");

      const addedStaff: Staff = data;
      setStaffList([...staffList, addedStaff]);
      setError(null);
      return addedStaff;
    } catch (err) {
      setError({ message: "スタッフの追加に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  const updateStaff = async (updatedStaff: Staff, imageFile: File | null) => {
    try {
      let imageUrl = updatedStaff.image;
      if (imageFile) {
        imageUrl = await uploadStaffImage(imageFile);
        if (!imageUrl) {
          throw new Error("画像のアップロードに失敗しました");
        }
      }

      const { error } = await supabase
        .from("staff")
        .update({ ...updatedStaff, image: imageUrl })
        .eq("id", updatedStaff.id);

      if (error) throw error;

      setStaffList(
        staffList.map((staff) =>
          staff.id === updatedStaff.id
            ? { ...updatedStaff, image: imageUrl }
            : staff
        )
      );
      setError(null);
      return { ...updatedStaff, image: imageUrl };
    } catch (err) {
      setError({ message: "スタッフ情報の更新に失敗しました" });
      console.error(err);
      throw err;
    }
  };

  const deleteStaff = async (id: string) => {
    try {
      const { error } = await supabase.from("staff").delete().eq("id", id);

      if (error) throw error;

      setStaffList(staffList.filter((staff) => staff.id !== id));
      setError(null);
    } catch (err) {
      setError({ message: "スタッフの削除に失敗しました" });
      console.error(err);
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
    } catch (err) {
      setError({ message: "公開状態の変更に失敗しました" });
      console.error(err);
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
