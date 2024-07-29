"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

async function getCustomerDetails(id: string) {
  // 実際のデータ取得ロジックをここに実装
  return {
    id,
    name: "香木 誠士郎",
    kana: "コウキ セイシロウ",
    gender: "男性",
    birthDate: "2005/04/07",
    phone: "07017450086",
    email: "seishiro@example.com",
    visits: 5,
    reservations: [
      {
        date: "2024/05/18",
        staff: "フリー スタッフ",
        status: "無断キャンセル",
        menu: "頭皮ケアスパ",
        route: "ハロタロ",
      },
      {
        date: "2024/04/10",
        staff: "田中 花子",
        status: "来店済み",
        menu: "カット＆カラー",
        route: "ホットペッパー",
      },
    ],
  };
}

interface CustomerDetailPageProps {
  id: string;
}

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ id }) => {
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    getCustomerDetails(id).then((details) => {
      setCustomerDetails(details);
      setEditedDetails(details);
    });
  }, [id]);

  if (!customerDetails) {
    return <div>Loading...</div>;
  }

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedDetails({ ...customerDetails });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedDetails({ ...editedDetails, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedDetails({ ...editedDetails, [name]: value });
  };

  const handleSave = () => {
    // ここで実際のデータ更新処理を実装
    setCustomerDetails(editedDetails);
    setIsEditing(false);
  };

  const handleBack = () => {
    router.push("/dashboard/customer");
  };

  const renderEditableField = (
    name: string,
    value: string,
    type: string = "text",
    editable: boolean = true
  ) => {
    const commonStyles = "w-full min-h-[2.5rem] px-2 flex items-center text-sm";
    const editStyles = `${commonStyles} border rounded`;

    if (!editable) {
      return <div className={commonStyles}>{value}</div>;
    }

    if (isEditing) {
      if (type === "select") {
        return (
          <Select
            name={name}
            value={value}
            onValueChange={(value) => handleSelectChange(name, value)}
          >
            <SelectTrigger className={editStyles}>
              <SelectValue placeholder={value} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="男性">男性</SelectItem>
              <SelectItem value="女性">女性</SelectItem>
              <SelectItem value="その他">その他</SelectItem>
            </SelectContent>
          </Select>
        );
      }
      return (
        <Input
          name={name}
          value={value}
          onChange={handleInputChange}
          className={editStyles}
        />
      );
    }
    return <div className={commonStyles}>{value}</div>;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <h2 className="text-2xl font-bold mb-4">お客様情報詳細</h2>

      <div className="flex flex-grow overflow-hidden">
        <Card className="flex-[2] mr-4 overflow-auto">
          <CardHeader className="py-2">
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <Table>
              <TableBody>
                {[
                  { label: "氏名 (漢字)", field: "name" },
                  { label: "氏名 (カナ)", field: "kana" },
                  { label: "性別", field: "gender", type: "select" },
                  { label: "生年月日", field: "birthDate" },
                  { label: "電話番号", field: "phone" },
                  { label: "メールアドレス", field: "email" },
                  { label: "来店回数", field: "visits", editable: false },
                ].map((item) => (
                  <TableRow key={item.field}>
                    <TableCell className="font-medium py-1 w-1/3">
                      {item.label}
                    </TableCell>
                    <TableCell className="py-1 w-2/3">
                      {item.field === "visits"
                        ? renderEditableField(
                            item.field,
                            `${customerDetails[item.field]}回`,
                            "text",
                            false
                          )
                        : renderEditableField(
                            item.field,
                            editedDetails[item.field],
                            item.type,
                            item.editable
                          )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex-[3] overflow-auto">
          <CardHeader className="py-2">
            <CardTitle className="text-lg">予約履歴</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="py-1 text-xs">来店日</TableHead>
                  <TableHead className="py-1 text-xs">スタッフ</TableHead>
                  <TableHead className="py-1 text-xs">ステータス</TableHead>
                  <TableHead className="py-1 text-xs">メニュー</TableHead>
                  <TableHead className="py-1 text-xs">予約経路</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerDetails.reservations.map(
                  (reservation: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="py-1 text-sm">
                        {reservation.date}
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {reservation.staff}
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {reservation.status}
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {reservation.menu}
                      </TableCell>
                      <TableCell className="py-1 text-sm">
                        {reservation.route}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <div className="space-x-4">
          <Button
            variant="destructive"
            className="bg-red-500 text-white hover:bg-red-600 text-sm"
          >
            削除する
          </Button>
          {isEditing ? (
            <Button
              className="bg-slate-700 text-white hover:bg-slate-900 text-sm"
              onClick={handleSave}
            >
              保存する
            </Button>
          ) : (
            <Button variant={"outline"} onClick={handleEditToggle}>
              変更する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
