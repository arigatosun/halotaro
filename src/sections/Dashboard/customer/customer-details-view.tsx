"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Trash2,
  Home,
  Gift,
} from "lucide-react";
import { useRouter } from "next/navigation";
import truncateText from "@/utils/truncate-text";
import { useAuth } from "@/lib/authContext";

// 年・月・日 の選択肢
const YEARS = Array.from({ length: 151 }, (_, i) => {
  const year = 1900 + i;
  return { value: String(year), label: `${year}年` };
});
const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}月`,
}));
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: `${i + 1}日`,
}));

interface CustomerDetailPageProps {
  id: string;
}

interface FieldItem {
  label: string;
  field: string;
  icon: React.ReactNode;
  type?: string;
  editable?: boolean;
}

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ id }) => {
  const { session } = useAuth();
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // 基本情報の編集
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<any>(null);

  // 詳細情報の編集
  const [isDetailEditing, setIsDetailEditing] = useState(false);
  const [detailInfo, setDetailInfo] = useState<any>(null);
  const [memo, setMemo] = useState("");

  const router = useRouter();

  // --------------------------------------------
  // 初回ロード：顧客詳細の取得
  // --------------------------------------------
  useEffect(() => {
    const fetchCustomerDetails = async (id: string) => {
      if (!session) return;

      try {
        const response = await fetch(`/api/customer-details?id=${id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await response.json();

        if (response.ok) {
          const detailInfo = data.customerDetails.detailInfo || {};
          const mappedDetailInfo = {
            ...detailInfo,
            birthDate: detailInfo.birthDate || "",
            weddingAnniversary: detailInfo.weddingAnniversary || "",
          };

          setCustomerDetails(data.customerDetails);
          setEditedDetails(data.customerDetails); // 基本情報編集用
          setDetailInfo(mappedDetailInfo); // 詳細情報編集用
          setMemo(detailInfo.memo || "");
        } else {
          console.error("Error fetching customer details:", data.error);
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
      }
    };

    fetchCustomerDetails(id);
  }, [id, session]);

  if (!customerDetails) {
    return <div>Loading...</div>;
  }

  // --------------------------------------------
  // 基本情報の編集トグル
  // --------------------------------------------
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      // 編集を開始するとき
      setEditedDetails({ ...customerDetails });
    } else {
      // キャンセルするとき -> 値をリセット
      setEditedDetails({ ...customerDetails });
    }
  };

  // --------------------------------------------
  // 詳細情報の編集トグル
  // --------------------------------------------
  const handleDetailEditToggle = () => {
    setIsDetailEditing(!isDetailEditing);
    if (!isDetailEditing) {
      setDetailInfo({ ...customerDetails.detailInfo });
      setMemo(customerDetails.detailInfo.memo || "");
    } else {
      // キャンセルするなら元に戻す
      setDetailInfo({ ...customerDetails.detailInfo });
      setMemo(customerDetails.detailInfo.memo || "");
    }
  };

  // --------------------------------------------
  // 入力ハンドラ（基本情報）
  // --------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedDetails((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  // --------------------------------------------
  // 入力ハンドラ（詳細情報）
  // --------------------------------------------
  const handleDetailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetailInfo((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedDetails((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDetailSelectChange = (name: string, value: string) => {
    setDetailInfo((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMemo(e.target.value);
  };

  // --------------------------------------------
  // 日付のパース (YYYY-MM-DD or MM-DD)
  // --------------------------------------------
  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === "00-00" || dateStr.startsWith("0000")) {
      return null;
    }
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      // YYYY-MM-DD形式
      const [y, m, d] = parts;
      if (y === "0000" || y === "0") return null;
      return `${y}-${m}-${d}`;
    } else if (parts.length === 2) {
      // MM-DD形式（年が無い）
      return null;
    }
    return null;
  };

  // --------------------------------------------
  // 基本情報を保存
  // --------------------------------------------
  const handleBasicSave = async () => {
    if (!session) return;
    try {
      // 送信するデータを組み立て
      // 必要に応じて customer_name_kana => kana などマッピング
      const basicInfo = {
        name: editedDetails.name,
        kana: editedDetails.kana,
        phone: editedDetails.phone,
        email: editedDetails.email,
      };

      const response = await fetch("/api/customer-details/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customerDetails.id,
          basicInfo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Basic information updated successfully");
        // 反映
        setCustomerDetails({
          ...customerDetails,
          ...basicInfo,
        });
        setIsEditing(false);
      } else {
        console.error("Error updating basic information:", data.error);
      }
    } catch (error) {
      console.error("Error updating basic information:", error);
    }
  };

  // --------------------------------------------
  // 詳細情報を保存
  // --------------------------------------------
  const handleDetailSave = async () => {
    if (!session) return;
    try {
      const saveDetailInfo = {
        ...detailInfo,
        birth_date: parseDate(detailInfo.birthDate),
        wedding_anniversary: parseDate(detailInfo.weddingAnniversary),
        // 不要なキー削除
        birthDate: undefined,
        weddingAnniversary: undefined,
        memo: memo,
      };

      const response = await fetch("/api/customer-details/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customerId: customerDetails.id,
          detailInfo: saveDetailInfo,
          memo: memo,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Detail information updated successfully");
        setIsDetailEditing(false);
        // state 更新
        setCustomerDetails({
          ...customerDetails,
          detailInfo: { ...detailInfo, memo },
          memo,
        });
      } else {
        console.error("Error updating detail information:", data.error);
      }
    } catch (error) {
      console.error("Error updating detail information:", error);
    }
  };

  // --------------------------------------------
  // 顧客削除
  // --------------------------------------------
  const handleDelete = async () => {
    if (!session) return;
    try {
      const response = await fetch(
        `/api/customer-details/delete?id=${customerDetails.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();

      if (response.ok) {
        console.log("Customer deleted successfully");
        router.push("/dashboard/customer");
      } else {
        console.error("Error deleting customer:", data.error);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  // --------------------------------------------
  // 戻る
  // --------------------------------------------
  const handleBack = () => {
    router.push("/dashboard/customer");
  };

  // --------------------------------------------
  // renderEditableField: フィールド表示兼編集
  // --------------------------------------------
  const renderEditableField = (
    name: string,
    value: string,
    type: string = "text",
    editable: boolean = true,
    icon?: React.ReactNode,
    isEditingField: boolean = isEditing, // 基本情報編集フラグ
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement>
    ) => void = handleInputChange,
    handleSelectChangeFn: (
      name: string,
      value: string
    ) => void = handleSelectChange
  ) => {
    const commonStyles = "w-full min-h-[2.5rem] px-2 flex items-center text-sm";
    const editStyles = `${commonStyles} border rounded`;

    if (!editable) {
      // editable = false の場合は編集不可
      return <div className={commonStyles}>{value}</div>;
    }

    // 編集モードかどうか
    if (isEditingField) {
      if (type === "select") {
        return (
          <Select
            name={name}
            value={value || "0"}
            onValueChange={(val) => handleSelectChangeFn(name, val)}
          >
            <SelectTrigger className={editStyles}>
              <SelectValue placeholder="未選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">未選択</SelectItem>
              <SelectItem value="男性">男性</SelectItem>
              <SelectItem value="女性">女性</SelectItem>
              <SelectItem value="その他">その他</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return (
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <Input
            name={name}
            value={value || ""}
            onChange={handleChange}
            className={editStyles}
            type={type}
          />
        </div>
      );
    }
    // 編集モードでない場合
    return (
      <div className={`${commonStyles} flex items-center`}>
        {icon && <span className="mr-2">{icon}</span>}
        {value || "未選択"}
      </div>
    );
  };

  // --------------------------------------------
  // 日付項目の表示/編集 (詳細タブ用)
  // --------------------------------------------
  const renderFullDateField = (
    label: string,
    value: string,
    onChange: (newValue: string) => void,
    icon: React.ReactNode,
    isEditingField: boolean
  ) => {
    let year = "0";
    let month = "0";
    let day = "0";

    if (value && value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 3) {
        year = parts[0] === "0000" ? "0" : parts[0];
        month = parts[1];
        day = parts[2];
      } else if (parts.length === 2) {
        year = "0"; // 年なし
        month = parts[0];
        day = parts[1];
      }
    }

    const handleYearChange = (newYear: string) => {
      const finalYear = newYear === "0" ? "0000" : newYear;
      onChange(`${finalYear}-${month || "00"}-${day || "00"}`);
    };
    const handleMonthChange = (newMonth: string) => {
      const finalYear = year === "0" ? "0000" : year;
      onChange(`${finalYear}-${newMonth}-${day || "00"}`);
    };
    const handleDayChange = (newDay: string) => {
      const finalYear = year === "0" ? "0000" : year;
      onChange(`${finalYear}-${month || "00"}-${newDay}`);
    };

    return (
      <div className="flex items-center space-x-2">
        {icon && <span className="mr-2">{icon}</span>}
        {isEditingField ? (
          <>
            <Select
              value={year === "0000" ? "0" : year}
              onValueChange={handleYearChange}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未選択</SelectItem>
                {YEARS.map((y) => (
                  <SelectItem key={y.value} value={y.value}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month || "0"} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="月" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未選択</SelectItem>
                {MONTHS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={day || "0"} onValueChange={handleDayChange}>
              <SelectTrigger className="w-20">
                <SelectValue placeholder="日" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">未選択</SelectItem>
                {DAYS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : (
          <span>
            {year !== "0" && year !== "0000"
              ? `${year}年${parseInt(month)}月${parseInt(day)}日`
              : month !== "00" && day !== "00"
              ? `${parseInt(month)}月${parseInt(day)}日`
              : "未設定"}
          </span>
        )}
      </div>
    );
  };

  // --------------------------------------------
  // ステータスバッジ
  // --------------------------------------------
  const renderStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      受付待ち: "bg-blue-500",
      会計済み: "bg-green-500",
      お客様キャンセル: "bg-yellow-500",
      サロンキャンセル: "bg-red-500",
      当日キャンセル: "bg-orange-500",
      無断キャンセル: "bg-red-500",
      不明: "bg-gray-500",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs text-white ${
          statusColors[status] || "bg-gray-500"
        }`}
      >
        {status}
      </span>
    );
  };

  // --------------------------------------------
  // 基本情報フィールド
  // --------------------------------------------
  const basicFields: FieldItem[] = [
    { label: "氏名 (漢字)", field: "name", icon: <User />, editable: true },
    { label: "氏名 (カナ)", field: "kana", icon: <User />, editable: true },
    { label: "電話番号", field: "phone", icon: <Phone />, editable: true },
    { label: "メールアドレス", field: "email", icon: <Mail />, editable: true },
    {
      label: "来店回数",
      field: "visits",
      editable: false,
      icon: <Calendar />,
    },
    {
      label: "キャンセル回数",
      field: "cancelCount",
      editable: false,
      icon: <AlertTriangle />,
    },
    {
      label: "最終キャンセル日",
      field: "lastCancelDate",
      editable: false,
      icon: <AlertTriangle />,
    },
  ];

  // 詳細情報フィールド
  const detailFields: FieldItem[] = [
    {
      label: "性別",
      field: "gender",
      type: "select",
      icon: <User />,
    },
    { label: "生年月日", field: "birthDate", icon: <Calendar /> },
    { label: "住所", field: "address", icon: <Home /> },
    {
      label: "結婚記念日",
      field: "weddingAnniversary",
      icon: <Gift />,
    },
  ];

  const filteredReservations = customerDetails.reservations;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <User className="mr-2" />
          {customerDetails.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ID: {customerDetails.id}
          </span>
        </h1>
      </header>

      {/* 2カラム: 左(基本/詳細タブ) + 右(予約履歴/メモ) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --------------------------------------
            左カラム: 基本情報 / 詳細情報
        -------------------------------------- */}
        <Card className="lg:col-span-1">
          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="detail">詳細情報</TabsTrigger>
            </TabsList>

            {/* ---------- 基本情報タブ ---------- */}
            <TabsContent value="basic">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center">
                    <User className="mr-2" />
                    基本情報
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={handleEditToggle}
                    className="h-10"
                  >
                    {isEditing ? "キャンセル" : "編集"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {basicFields.map((item) => (
                      <TableRow key={item.field}>
                        <TableCell className="font-medium py-2 w-1/3">
                          {item.label}
                        </TableCell>
                        <TableCell className="py-2 w-2/3">
                          {renderEditableField(
                            item.field,
                            item.field === "visits"
                              ? `${customerDetails[item.field]}回`
                              : item.field === "cancelCount"
                              ? `${customerDetails[item.field]}回`
                              : editedDetails[item.field] ?? "",
                            item.type,
                            item.editable !== false,
                            item.icon,
                            isEditing, // ←編集モード判定
                            handleInputChange, // ←onChangeハンドラ
                            handleSelectChange
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* "保存" ボタン */}
                {isEditing && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleBasicSave}>
                      <Save className="mr-2" /> 保存する
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>

            {/* ---------- 詳細情報タブ ---------- */}
            <TabsContent value="detail">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center">
                    <User className="mr-2" />
                    詳細情報
                  </CardTitle>
                  <Button
                    variant="outline"
                    onClick={handleDetailEditToggle}
                    className="h-10"
                  >
                    {isDetailEditing ? "キャンセル" : "編集"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {detailFields.map((item) => (
                      <TableRow key={item.field}>
                        <TableCell className="font-medium py-2 w-1/3">
                          {item.label}
                        </TableCell>
                        <TableCell className="py-2 w-2/3">
                          {item.field === "birthDate" ||
                          item.field === "weddingAnniversary"
                            ? renderFullDateField(
                                item.label,
                                detailInfo[item.field],
                                (newValue: string) => {
                                  setDetailInfo({
                                    ...detailInfo,
                                    [item.field]: newValue,
                                  });
                                },
                                item.icon,
                                isDetailEditing
                              )
                            : renderEditableField(
                                item.field,
                                detailInfo[item.field],
                                item.type || "text",
                                true,
                                item.icon,
                                isDetailEditing,
                                handleDetailInputChange,
                                handleDetailSelectChange
                              )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 子供の情報 */}
                <div className="mt-4">
                  <h3 className="text-lg font-medium">子供の情報</h3>
                  {isDetailEditing ? (
                    <>
                      {detailInfo.children && detailInfo.children.length > 0 ? (
                        detailInfo.children.map((child: any, index: number) => (
                          <div
                            key={index}
                            className="flex space-x-4 mt-2 items-center"
                          >
                            <Input
                              name={`childName-${index}`}
                              value={child.name}
                              placeholder="名前"
                              onChange={(e) => {
                                const updatedChildren = [
                                  ...detailInfo.children,
                                ];
                                updatedChildren[index].name = e.target.value;
                                setDetailInfo({
                                  ...detailInfo,
                                  children: updatedChildren,
                                });
                              }}
                            />
                            <div className="flex items-center space-x-2">
                              <Select
                                value={
                                  child.birthDate
                                    ? child.birthDate.split("-")[0]
                                    : "0"
                                }
                                onValueChange={(value) => {
                                  const updatedChildren = [
                                    ...detailInfo.children,
                                  ];
                                  const currentDay = child.birthDate
                                    ? child.birthDate.split("-")[1]
                                    : "00";
                                  updatedChildren[
                                    index
                                  ].birthDate = `${value}-${currentDay}`;
                                  setDetailInfo({
                                    ...detailInfo,
                                    children: updatedChildren,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue placeholder="月" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">未選択</SelectItem>
                                  {MONTHS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                      {m.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span>-</span>
                              <Select
                                value={
                                  child.birthDate
                                    ? child.birthDate.split("-")[1]
                                    : "0"
                                }
                                onValueChange={(value) => {
                                  const updatedChildren = [
                                    ...detailInfo.children,
                                  ];
                                  const currentMonth = child.birthDate
                                    ? child.birthDate.split("-")[0]
                                    : "00";
                                  updatedChildren[
                                    index
                                  ].birthDate = `${currentMonth}-${value}`;
                                  setDetailInfo({
                                    ...detailInfo,
                                    children: updatedChildren,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue placeholder="日" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">未選択</SelectItem>
                                  {DAYS.map((d) => (
                                    <SelectItem key={d.value} value={d.value}>
                                      {d.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                const updatedChildren =
                                  detailInfo.children.filter(
                                    (_: any, i: number) => i !== index
                                  );
                                setDetailInfo({
                                  ...detailInfo,
                                  children: updatedChildren,
                                });
                              }}
                            >
                              削除
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">
                          子供の情報がありません。
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => {
                          const updatedChildren = detailInfo.children
                            ? [
                                ...detailInfo.children,
                                { name: "", birthDate: "0-0" },
                              ]
                            : [{ name: "", birthDate: "0-0" }];
                          setDetailInfo({
                            ...detailInfo,
                            children: updatedChildren,
                          });
                        }}
                      >
                        子供を追加
                      </Button>
                    </>
                  ) : (
                    <>
                      {detailInfo.children && detailInfo.children.length > 0 ? (
                        detailInfo.children.map((child: any, index: number) => (
                          <div key={index} className="mt-2">
                            <p>名前: {child.name || "未設定"}</p>
                            <p>
                              誕生日:{" "}
                              {child.birthDate && child.birthDate !== "0-0"
                                ? `${parseInt(
                                    child.birthDate.split("-")[0]
                                  )}月${parseInt(
                                    child.birthDate.split("-")[1]
                                  )}日`
                                : "未設定"}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">
                          子供の情報がありません。
                        </p>
                      )}
                    </>
                  )}
                </div>

                {isDetailEditing && (
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleDetailSave}>
                      <Save className="mr-2" /> 保存する
                    </Button>
                  </div>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>

        {/* --------------------------------------
            右カラム: 予約履歴 / メモ
        -------------------------------------- */}
        <Card className="lg:col-span-2">
          <Tabs defaultValue="reservations">
            <TabsList>
              <TabsTrigger value="reservations">予約履歴</TabsTrigger>
              <TabsTrigger value="notes">メモ</TabsTrigger>
            </TabsList>

            {/* 予約履歴 */}
            <TabsContent value="reservations">
              <div className="overflow-x-auto">
                <div style={{ height: "500px", overflow: "auto" }}>
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b">
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          来店日
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          メニュー
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          技術売上
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          商品売上
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          支払金額
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          スタッフ
                        </th>
                        <th className="p-3 text-center font-semibold text-sm w-1/7">
                          ステータス
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerDetails.reservations.map(
                        (reservation: any, index: number) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">
                              {reservation.date || ""}
                            </td>
                            <td className="p-3 text-sm">
                              {truncateText(reservation.menu, 10)}
                            </td>
                            <td className="p-3 text-sm text-center">
                              ¥{reservation.technicalAmount.toLocaleString()}
                            </td>
                            <td className="p-3 text-sm text-center">
                              ¥{reservation.productAmount.toLocaleString()}
                            </td>
                            <td className="p-3 text-sm text-center">
                              ¥{reservation.amount.toLocaleString()}
                            </td>
                            <td className="p-3 text-sm text-center">
                              {reservation.staff}
                            </td>
                            <td className="p-3 text-sm text-center">
                              {renderStatusBadge(reservation.status)}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* 合計 */}
              <div className="bg-white border-t border-gray-200 p-5 flex justify-end items-center space-x-4">
                <span className="font-semibold whitespace-nowrap">
                  合計技術売上: ¥
                  {customerDetails.reservations
                    .reduce((sum: number, r: any) => sum + r.technicalAmount, 0)
                    .toLocaleString()}
                </span>
                <span className="font-semibold whitespace-nowrap">
                  合計商品売上: ¥
                  {customerDetails.reservations
                    .reduce((sum: number, r: any) => sum + r.productAmount, 0)
                    .toLocaleString()}
                </span>
                <span className="font-semibold whitespace-nowrap">
                  合計支払金額: ¥
                  {customerDetails.reservations
                    .reduce((sum: number, r: any) => sum + r.amount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </TabsContent>

            {/* メモ */}
            <TabsContent value="notes">
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  メモ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col h-full">
                  <Textarea
                    value={memo}
                    onChange={handleMemoChange}
                    placeholder="メモを入力してください"
                    className="w-full flex-grow mb-4"
                  />
                  <div className="flex justify-end space-x-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2" /> 削除
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>本当に削除しますか？</DialogTitle>
                        </DialogHeader>
                        <p>この操作は取り消せません。</p>
                        <div className="flex justify-end space-x-2 mt-4">
                          <Button variant="outline">キャンセル</Button>
                          <Button variant="destructive" onClick={handleDelete}>
                            削除
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      onClick={handleDetailSave}
                      className="h-10"
                    >
                      <Save className="mr-2" /> 保存
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* 下部の戻るボタン */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2" /> 戻る
        </Button>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
