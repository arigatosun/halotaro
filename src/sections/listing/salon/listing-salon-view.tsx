"use client";
import React from "react";
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

import { Calendar as CalendarIcon, Upload } from "lucide-react";

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
  services: z.array(z.string()),
  features: z.array(z.string()),
});

export default function EnhancedSalonSettings() {
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
      services: [],
      features: [],
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // APIを呼び出してデータを保存
    // 成功時のフィードバックを表示
    alert("設定が正常に保存されました。");
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            サロン設定
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>メイン画像</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Label
                        htmlFor="mainImage"
                        className="flex h-32 w-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <input
                          id="mainImage"
                          type="file"
                          className="hidden"
                          accept="image/*"
                        />
                      </Label>
                    </div>
                  </div>
                  <div>
                    <Label>サブ画像</Label>
                    <div className="mt-2 flex flex-wrap items-center gap-4">
                      {[...Array(5)].map((_, i) => (
                        <Label
                          key={i}
                          htmlFor={`subImage${i}`}
                          className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                        >
                          <Upload className="h-6 w-6 text-gray-400" />
                          <input
                            id={`subImage${i}`}
                            type="file"
                            className="hidden"
                            accept="image/*"
                          />
                        </Label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full">
                設定を保存
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// 補助コンポーネント
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">
    {children}
  </h2>
);
