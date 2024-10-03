"use client";

import React, { useState, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
import { Upload, X } from "lucide-react";
import Link from "next/link";

const formSchema = z.object({
  salonName: z.string().min(1, { message: "サロン名は必須です" }),
  phone: z.string().min(1, { message: "電話番号は必須です" }),
  address: z.string().min(1, { message: "住所は必須です" }),
  website: z.string().url().optional(),
  description: z.string().optional(),
  weekdayOpen: z.string(),
  weekdayClose: z.string(),
  weekendOpen: z.string(),
  weekendClose: z.string(),
  closedDays: z.array(z.string()),
});

export default function SalonDetailsPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [subImages, setSubImages] = useState<File[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      salonName: "",
      phone: "",
      address: "",
      website: "",
      description: "",
      weekdayOpen: "",
      weekdayClose: "",
      weekendOpen: "",
      weekendClose: "",
      closedDays: [],
    },
  });

  const handleMainImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setMainImage(event.target.files[0]);
    }
  }, []);

  const handleSubImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const fileList = event.target.files;
      const fileArray = Array.from(fileList);
      setSubImages(prevImages => [...prevImages, ...fileArray].slice(0, 5));
    }
  }, []);

  const removeSubImage = useCallback((index: number) => {
    setSubImages(prevImages => prevImages.filter((_, i) => i !== index));
  }, []);

  async function uploadImage(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('salon-images')
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('salon-images')
      .getPublicUrl(path);

    return publicUrl;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("ユーザーが認証されていません");
      }

      let mainImageUrl = null;
      let subImageUrls = [];

      if (mainImage) {
        mainImageUrl = await uploadImage(mainImage, `${user.id}/main-image-${Date.now()}`);
      }

      for (const subImage of subImages) {
        const subImageUrl = await uploadImage(subImage, `${user.id}/sub-image-${Date.now()}-${subImages.indexOf(subImage)}`);
        subImageUrls.push(subImageUrl);
      }

      const { data, error } = await supabase
        .from('salons')
        .upsert({
          user_id: user.id,
          salon_name: values.salonName,
          phone: values.phone,
          address: values.address,
          website: values.website,
          description: values.description,
          weekday_open: values.weekdayOpen,
          weekday_close: values.weekdayClose,
          weekend_open: values.weekendOpen,
          weekend_close: values.weekendClose,
          closed_days: values.closedDays,
          main_image_url: mainImageUrl,
          sub_image_urls: subImageUrls,
        })
        .select();

      if (error) throw error;

      alert("サロン情報が正常に保存されました。");
      router.push("/auth/registration-complete");
    } catch (error) {
      console.error("エラー:", error);
      alert("サロン情報の保存中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-red-50">
      {/* ヘッダー */}
      <header className="bg-white bg-opacity-90 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-red-600">ハロタロ</h1>
          <nav className="flex items-center">
            <ul className="flex space-x-6 mr-6">
              <li>
                <a href="#features" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  機能
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  料金
                </a>
              </li>
              <li>
                <a href="#contact" className="text-gray-700 hover:text-yellow-500 transition duration-300">
                  お問い合わせ
                </a>
              </li>
            </ul>
            <Link
              href="/auth/login"
              className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition duration-300"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="container mx-auto py-10 flex-grow">
        <Card className="w-full max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">
              サロン情報設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <SectionTitle>基本情報</SectionTitle>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="salonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>サロン名</FormLabel>
                        <FormControl>
                          <Input placeholder="サロン名" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>電話番号</FormLabel>
                        <FormControl>
                          <Input placeholder="電話番号" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>住所</FormLabel>
                        <FormControl>
                          <Input placeholder="住所" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ウェブサイト</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>サロン説明</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="サロンの特徴や魅力を記入してください"
                            className="resize-none"
                            {...field}
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
                  <div>
                    <Label>平日</Label>
                    <div className="flex items-center space-x-2">
                      <Select
                        onValueChange={(value) =>
                          form.setValue("weekdayOpen", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="開店時間" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(24)].map((_, i) => (
                            <SelectItem
                              key={i}
                              value={`${String(i).padStart(2, "0")}:00`}
                            >
                              {`${String(i).padStart(2, "0")}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>-</span>
                      <Select
                        onValueChange={(value) =>
                          form.setValue("weekdayClose", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="閉店時間" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(24)].map((_, i) => (
                            <SelectItem
                              key={i}
                              value={`${String(i).padStart(2, "0")}:00`}
                            >
                              {`${String(i).padStart(2, "0")}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>週末</Label>
                    <div className="flex items-center space-x-2">
                      <Select
                        onValueChange={(value) =>
                          form.setValue("weekendOpen", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="開店時間" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(24)].map((_, i) => (
                            <SelectItem
                              key={i}
                              value={`${String(i).padStart(2, "0")}:00`}
                            >
                              {`${String(i).padStart(2, "0")}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>-</span>
                      <Select
                        onValueChange={(value) =>
                          form.setValue("weekendClose", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="閉店時間" />
                        </SelectTrigger>
                        <SelectContent>
                          {[...Array(24)].map((_, i) => (
                            <SelectItem
                              key={i}
                              value={`${String(i).padStart(2, "0")}:00`}
                            >
                              {`${String(i).padStart(2, "0")}:00`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <FormField
          control={form.control}
          name="closedDays"
          render={({ field }) => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">定休日</FormLabel>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
                {["月", "火", "水", "木", "金", "土", "日"].map((day) => (
                  <FormItem
                    key={day}
                    className="flex flex-row items-start space-x-3 space-y-0"
                  >
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(day)}
                        onCheckedChange={(checked) => {
                          const updatedValue = field.value || []; // field.valueが未定義の場合は空配列を使用
                          return checked
                            ? field.onChange([...updatedValue, day])
                            : field.onChange(updatedValue.filter((value) => value !== day));
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {day}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
                <div>
                  <h3 className="text-lg font-medium">サロン画像</h3>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label>メイン画像</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <Label
                          htmlFor="mainImage"
                          className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                        >
                          {mainImage ? (
                            <img
                              src={URL.createObjectURL(mainImage)}
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
                      </div>
                    </div>
                    <div>
                      <Label>サブ画像（最大5枚）</Label>
                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        {subImages.map((image, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Sub ${index + 1}`}
                              className="h-24 w-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeSubImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        ))}
                        {subImages.length < 5 && (
                          <Label
                            htmlFor="subImages"
                            className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                          >
                            <Upload className="h-6 w-6 text-gray-400" />
                            <input
                              id="subImages"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              multiple
                              onChange={handleSubImageUpload}
                            />
                          </Label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "保存中..." : "設定を保存"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>


      {/* フッター */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="mb-4 md:mb-0">&copy; 2024 ハロタロ. All rights reserved.</p>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    利用規約
                  </a>
                  </li>
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-yellow-400 transition duration-300">
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 補助コンポーネント
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
    {children}
  </h2>
);