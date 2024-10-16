"use client";
import React, { useEffect, useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/authcontext";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";

interface SalonData {
  id?: string;
  user_id: string;
  salonName: string;
  phone: string;
  address: string;
  description?: string;
  weekdayOpen: string;
  weekdayClose: string;
  weekendOpen: string;
  weekendClose: string;
  closedDays: string[];
  mainImageUrl?: string;
  subImageUrls?: string[];
}

const formSchema = z.object({
  salonName: z.string().min(1, { message: "サロン名は必須です" }),
  phone: z.string().min(1, { message: "電話番号は必須です" }),
  address: z.string().min(1, { message: "住所は必須です" }),
  description: z.string().optional(),
  weekdayOpen: z.string(),
  weekdayClose: z.string(),
  weekendOpen: z.string(),
  weekendClose: z.string(),
  closedDays: z.array(z.string()),
  mainImageUrl: z.string().optional(),
  subImageUrls: z.array(z.string()).optional(),
});

const ListingSalonView: React.FC = () => {
  const { user, loading: authLoading, refreshAuthState } = useAuth();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user && retryCount < 3) {
      refreshAuthState();
      setRetryCount((prev) => prev + 1);
    }
  }, [user, authLoading, refreshAuthState, retryCount]);

  if (authLoading) {
    return <div>認証状態を確認中...</div>;
  }

  if (!user) {
    return <div>認証に失敗しました。ページをリロードしてください。</div>;
  }

  return <AuthenticatedListingSalonView userId={user.id} />;
};

type ImageObj =
  | { type: "new"; data: File }
  | { type: "existing"; data: string };

const AuthenticatedListingSalonView: React.FC<{ userId: string }> = ({
  userId,
}) => {
  // ステートの宣言
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [subImages, setSubImages] = useState<File[]>([]);
  const [salonId, setSalonId] = useState<string | null>(null);

  // フォームの設定
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salonName: "",
      phone: "",
      address: "",
      description: "",
      weekdayOpen: "",
      weekdayClose: "",
      weekendOpen: "",
      weekendClose: "",
      closedDays: [],
      mainImageUrl: "",
      subImageUrls: [],
    },
  });

  // サロン情報の取得
  useEffect(() => {
    async function fetchSalonData() {
      try {
        const response = await fetch("/api/listing-salon", {
          method: "GET",
          headers: {
            "user-id": userId,
          },
        });

        if (response.status === 404) {
          // サロン情報が存在しない場合
          setSalonId(null);
          // フォームはデフォルトの空の値を使用するので、リセットは不要
        } else if (!response.ok) {
          throw new Error("Failed to fetch salon data");
        } else {
          const data = await response.json();
          setSalonId(data.id);
          form.reset({
            salonName: data.salon_name,
            phone: data.phone,
            address: data.address,
            description: data.description || "",
            weekdayOpen: data.weekday_open || "",
            weekdayClose: data.weekday_close || "",
            weekendOpen: data.weekend_open || "",
            weekendClose: data.weekend_close || "",
            closedDays: data.closed_days || [],
            mainImageUrl: data.main_image_url || "",
            subImageUrls: data.sub_image_urls || [],
          });
        }
      } catch (error) {
        console.error("Error fetching salon data:", error);
        setError("サロン情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    }

    fetchSalonData();
  }, [form, userId]);

  // メイン画像のアップロード処理
  const handleMainImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        setMainImage(event.target.files[0]);
      }
    },
    []
  );

  // サブ画像のアップロード処理
  const handleSubImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
        const fileList = event.target.files;
        const fileArray = Array.from(fileList);
        setSubImages((prevImages) => [...prevImages, ...fileArray].slice(0, 5));
      }
    },
    []
  );

  // 画像リストを統合（新規と既存）
  const combinedSubImages: ImageObj[] = [
    ...subImages.map((file): ImageObj => ({ type: "new", data: file })),
    ...(form.getValues("subImageUrls") || []).map(
      (url): ImageObj => ({
        type: "existing",
        data: url,
      })
    ),
  ];

  // サブ画像の削除
  const removeSubImage = useCallback(
    (index: number, type: "new" | "existing") => {
      if (type === "new") {
        setSubImages((prevImages) => prevImages.filter((_, i) => i !== index));
      } else if (type === "existing") {
        const currentUrls = form.getValues("subImageUrls") || [];
        const updatedUrls = currentUrls.filter(
          (_, i) => i !== index - subImages.length
        );
        form.setValue("subImageUrls", updatedUrls);
      }
    },
    [form, subImages.length]
  );

  // メイン画像の削除
  const removeMainImage = useCallback(() => {
    setMainImage(null);
    form.setValue("mainImageUrl", "");
  }, [form]);

  // 画像のアップロード処理
  async function uploadImage(file: File, path: string): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const response = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
      headers: {
        "user-id": userId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error uploading image: ${errorData.message}`);
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.publicUrl;
  }

  // フォームの送信処理
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      let mainImageUrl = values.mainImageUrl;
      let subImageUrls = values.subImageUrls || [];

      // メイン画像のアップロード
      if (mainImage) {
        mainImageUrl = await uploadImage(
          mainImage,
          `${userId}/main-image-${Date.now()}`
        );
      }

      // サブ画像のアップロード
      if (subImages.length > 0) {
        const uploadedSubImages: string[] = [];
        for (let index = 0; index < subImages.length; index++) {
          const subImage = subImages[index];
          const subImageUrl = await uploadImage(
            subImage,
            `${userId}/sub-image-${Date.now()}-${index}`
          );
          uploadedSubImages.push(subImageUrl);
        }
        subImageUrls = [...subImageUrls, ...uploadedSubImages];
      }

      const updatedValues: SalonData = {
        user_id: userId,
        salonName: values.salonName,
        phone: values.phone,
        address: values.address,
        description: values.description,
        weekdayOpen: values.weekdayOpen,
        weekdayClose: values.weekdayClose,
        weekendOpen: values.weekendOpen,
        weekendClose: values.weekendClose,
        closedDays: values.closedDays,
        mainImageUrl: mainImageUrl,
        subImageUrls: subImageUrls,
      };

      const apiEndpoint = "/api/listing-salon";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        body: JSON.stringify(updatedValues),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error saving salon data: ${errorData.message}`);
        throw new Error("Failed to save salon data");
      }

      const responseData = await response.json();
      setSalonId(responseData.id); // サロンIDを更新

      toast({
        title: salonId ? "更新成功" : "登録成功",
        description: (
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span>
              サロン情報が正常に{salonId ? "更新" : "登録"}されました。
            </span>
          </div>
        ),
        variant: "default",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error saving salon data:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "サロン情報の保存に失敗しました";
      setError(errorMessage);
      toast({
        title: "エラー",
        description: (
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span>{errorMessage}</span>
          </div>
        ),
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  }

  // ローディングとエラーの表示
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  if (error && !salonId) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  // コンポーネントの描画
  return (
    <div className="container mx-auto py-10">
      <Toaster />
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            サロン設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8"
              encType="multipart/form-data"
            >
              <SectionTitle>基本情報</SectionTitle>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* サロン名 */}
                <FormField
                  control={form.control}
                  name="salonName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        サロン名 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="サロン名"
                          {...field}
                          aria-required="true"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 電話番号 */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        電話番号 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="電話番号"
                          {...field}
                          aria-required="true"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 住所 */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        住所 <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="住所"
                          {...field}
                          aria-required="true"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <SectionTitle>営業時間</SectionTitle>
              <Separator className="my-4" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* 平日の営業時間 */}
                <FormField
                  control={form.control}
                  name="weekdayOpen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>平日 開店時間</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="開店時間" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(24)].map((_, i) => (
                              <SelectItem
                                key={i}
                                value={`${String(i).padStart(2, "0")}:00:00`}
                              >
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekdayClose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>平日 閉店時間</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="閉店時間" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(24)].map((_, i) => (
                              <SelectItem
                                key={i}
                                value={`${String(i).padStart(2, "0")}:00:00`}
                              >
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* 週末の営業時間 */}
                <FormField
                  control={form.control}
                  name="weekendOpen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>週末 開店時間</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="開店時間" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(24)].map((_, i) => (
                              <SelectItem
                                key={i}
                                value={`${String(i).padStart(2, "0")}:00:00`}
                              >
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weekendClose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>週末 閉店時間</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="閉店時間" />
                          </SelectTrigger>
                          <SelectContent>
                            {[...Array(24)].map((_, i) => (
                              <SelectItem
                                key={i}
                                value={`${String(i).padStart(2, "0")}:00:00`}
                              >
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="closedDays"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">定休日</FormLabel>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                      {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
                        <FormField
                          key={day}
                          control={form.control}
                          name="closedDays"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={day}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(day)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, day])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== day
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {day}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <h3 className="text-lg font-medium">サロン画像</h3>
                <Separator className="my-4" />
                <div>
                  <Label>メイン画像</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="relative">
                      <Label
                        htmlFor="mainImage"
                        className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                      >
                        {mainImage || form.getValues("mainImageUrl") ? (
                          <img
                            src={
                              mainImage
                                ? URL.createObjectURL(mainImage)
                                : form.getValues("mainImageUrl")
                            }
                            alt="Main"
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Upload className="h-8 w-8 text-gray-400" />
                        )}
                        <input
                          id="mainImage"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleMainImageUpload}
                        />
                      </Label>
                      {(mainImage || form.getValues("mainImageUrl")) && (
                        <button
                          type="button"
                          onClick={removeMainImage}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 送信ボタン */}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "更新中..." : "設定を保存"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

// 補助コンポーネント
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
    {children}
  </h2>
);

export default ListingSalonView;
