// components/NewCustomerForm.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/authcontext";

interface NewCustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewCustomerForm({ onSuccess, onCancel }: NewCustomerFormProps) {
  const { session } = useAuth();
  console.log("Session:", session);
  const [formData, setFormData] = useState({
    name: "",
    kana: "",
    email: "",
    phone: "",
    // genderフィールドを削除
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        console.error("Failed to create customer");
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    }

    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">氏名</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="kana">フリガナ</Label>
        <Input
          id="kana"
          name="kana"
          value={formData.kana}
          onChange={handleChange}
          required
        />
      </div>
      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="phone">電話番号</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={handleChange}
        />
      </div>
      {/* genderフィールドを削除 */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "登録中..." : "登録"}
        </Button>
      </div>
    </form>
  );
}
