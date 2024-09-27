import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReservation, CustomerInfo } from "@/contexts/reservationcontext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

interface CustomerInfoProps {
  onNext: () => void;
  onBack: () => void;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function CustomerInfoComponent({ onNext, onBack }: CustomerInfoProps) {
  const { customerInfo, setCustomerInfo } = useReservation();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isFormValid, setIsFormValid] = useState(false);

  const validateField = useCallback((name: string, value: string) => {
    let error = "";
    switch (name) {
      case "lastNameKanji":
      case "firstNameKanji":
        if (!value) error = "必須項目です";
        else if (value.length > 20) error = "20文字以内で入力してください";
        else if (!/^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF々ヶー]+$/.test(value)) error = "漢字、ひらがな、カタカナで入力してください";
        break;
      case "lastNameKana":
      case "firstNameKana":
        if (!value) error = "必須項目です";
        else if (value.length > 20) error = "20文字以内で入力してください";
        else if (!/^[ァ-ヶー]+$/.test(value)) error = "全角カタカナで入力してください";
        break;
      case "email":
        if (!value) error = "必須項目です";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "正しいメールアドレスを入力してください";
        break;
      case "phone":
        if (!value) error = "必須項目です";
        else if (!/^[0-9]{10,11}$/.test(value)) error = "10桁または11桁の半角数字で入力してください";
        break;
    }
    return error;
  }, []);

  const validateForm = useCallback(() => {
    const fieldsToValidate = ["lastNameKanji", "firstNameKanji", "lastNameKana", "firstNameKana", "email", "phone"] as const;
    const newErrors: ValidationErrors = {};
    fieldsToValidate.forEach(field => {
      const error = validateField(field, customerInfo[field] || "");
      if (error) newErrors[field] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [customerInfo, validateField]);

  useEffect(() => {
    const isValid = validateForm();
    setIsFormValid(isValid);
  }, [customerInfo, validateForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = () => {
    if (isFormValid) {
      onNext();
    }
  };

  const renderInput = (name: keyof CustomerInfo, label: string, placeholder: string, type: string = "text") => (
    <div className="space-y-2">
      <Label htmlFor={name as string}>{label}</Label>
      <Input
        id={name as string}
        name={name as string}
        type={type}
        placeholder={placeholder}
        value={customerInfo[name] || ""}
        onChange={handleInputChange}
        onBlur={() => setTouched(prev => ({ ...prev, [name]: true }))}
        className={touched[name as string] && errors[name as string] ? "border-red-500" : ""}
      />
      {touched[name as string] && errors[name as string] && <p className="text-red-500 text-sm">{errors[name as string]}</p>}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">お客様情報入力</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderInput("lastNameKanji", "姓 (漢字)", "山田")}
              {renderInput("firstNameKanji", "名 (漢字)", "太郎")}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderInput("lastNameKana", "姓 (カタカナ)", "ヤマダ")}
              {renderInput("firstNameKana", "名 (カタカナ)", "タロウ")}
            </div>
            {renderInput("email", "メールアドレス", "example@example.com", "email")}
            {renderInput("phone", "電話番号 (ハイフンなし)", "09012345678", "tel")}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          戻る
        </Button>
        <Button onClick={handleSubmit} disabled={!isFormValid}>
          次へ
        </Button>
      </CardFooter>
    </Card>
  );
}