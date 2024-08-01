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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit,
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import truncateText from "@/utils/truncate-text";

function randomDate(start: Date, end: Date) {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

function generateRandomReservation() {
  const statuses = [
    "来店待ち",
    "来店済み",
    "キャンセル",
    "無断キャンセル",
    "当日キャンセル",
  ];
  const menus = [
    "カット",
    "カラー",
    "パーマ",
    "トリートメントたっぷり炭酸スパ",
    "ヘッドスパ",
  ];
  const routes = ["ハロタロ", "ホットペッパー", "電話予約", "店頭予約"];
  const staffs = [
    "田中 花子",
    "佐藤 太郎",
    "鈴木 美香",
    "高橋 健太",
    "フリー スタッフ",
  ];

  return {
    date: randomDate(new Date(2023, 0, 1), new Date()).toLocaleDateString(),
    staff: staffs[Math.floor(Math.random() * staffs.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    menu: menus[Math.floor(Math.random() * menus.length)],
    route: routes[Math.floor(Math.random() * routes.length)],
    amount: Math.floor(Math.random() * 20000) + 5000,
  };
}

async function getCustomerDetails(id: string) {
  const reservations = Array.from({ length: 20 }, generateRandomReservation);
  const cancelledReservations = reservations.filter(
    (r) =>
      r.status === "キャンセル" ||
      r.status === "無断キャンセル" ||
      r.status === "当日キャンセル"
  );
  const lastCancelDate =
    cancelledReservations.length > 0
      ? new Date(
          Math.max(
            ...cancelledReservations.map((r) => new Date(r.date).getTime())
          )
        ).toLocaleDateString()
      : "なし";

  return {
    id,
    name: "香木 誠士郎",
    kana: "コウキ セイシロウ",
    gender: "男性",
    birthDate: "2005/04/07",
    phone: "07017450086",
    email: "seishiro@example.com",
    visits: 5,
    cancelCount: cancelledReservations.length,
    lastCancelDate: lastCancelDate,
    reservations: reservations,
  };
}

interface CustomerDetailPageProps {
  id: string;
}

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ id }) => {
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState({ startDate: "", endDate: "" });
  const [customerNote, setCustomerNote] = useState("");
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
    setCustomerDetails(editedDetails);
    setIsEditing(false);
  };

  const handleBack = () => {
    router.push("/dashboard/customer");
  };

  const filterReservations = () => {
    if (!dateFilter.startDate && !dateFilter.endDate)
      return customerDetails.reservations;
    return customerDetails.reservations.filter((reservation: any) => {
      const reservationDate = new Date(reservation.date);
      const startDate = dateFilter.startDate
        ? new Date(dateFilter.startDate)
        : new Date(0);
      const endDate = dateFilter.endDate
        ? new Date(dateFilter.endDate)
        : new Date();
      return reservationDate >= startDate && reservationDate <= endDate;
    });
  };

  const filteredReservations = filterReservations();

  const renderEditableField = (
    name: string,
    value: string,
    type: string = "text",
    editable: boolean = true,
    icon?: React.ReactNode
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
        <div className="flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          <Input
            name={name}
            value={value}
            onChange={handleInputChange}
            className={editStyles}
          />
        </div>
      );
    }
    return (
      <div className={`${commonStyles} flex items-center`}>
        {icon && <span className="mr-2">{icon}</span>}
        {value}
      </div>
    );
  };

  const renderStatusBadge = (status: string) => {
    const statusColors: { [key: string]: string } = {
      来店待ち: "bg-blue-500",
      来店済み: "bg-green-500",
      キャンセル: "bg-yellow-500",
      無断キャンセル: "bg-red-500",
      当日キャンセル: "bg-orange-500",
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

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <User className="mr-2" />
          {customerDetails.name}
          <span className="ml-2 text-sm font-normal text-gray-500">
            ID: {customerDetails.id}
          </span>
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <User className="mr-2" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {[
                  { label: "氏名 (漢字)", field: "name", icon: <User /> },
                  { label: "氏名 (カナ)", field: "kana", icon: <User /> },
                  {
                    label: "性別",
                    field: "gender",
                    type: "select",
                    icon: <User />,
                  },
                  { label: "生年月日", field: "birthDate", icon: <Calendar /> },
                  { label: "電話番号", field: "phone", icon: <Phone /> },
                  { label: "メールアドレス", field: "email", icon: <Mail /> },
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
                ].map((item) => (
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
                          : editedDetails[item.field],
                        item.type,
                        item.editable,
                        item.icon
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs defaultValue="reservations">
            <TabsList>
              <TabsTrigger value="reservations">予約履歴</TabsTrigger>
              <TabsTrigger value="notes">メモ</TabsTrigger>
            </TabsList>
            <TabsContent value="reservations">
              <div className="flex items-center space-x-4 mb-4 px-4">
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, startDate: e.target.value })
                  }
                  placeholder="開始日"
                  className="w-40"
                />
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, endDate: e.target.value })
                  }
                  placeholder="終了日"
                  className="w-40"
                />
                <Button
                  onClick={() => setDateFilter({ startDate: "", endDate: "" })}
                  className="whitespace-nowrap"
                >
                  フィルターをクリア
                </Button>
              </div>
              <div
                className="overflow-auto px-4"
                style={{ maxHeight: "500px" }}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="py-2">来店日</TableHead>
                      <TableHead className="py-2">メニュー</TableHead>
                      <TableHead className="py-2">支払金額</TableHead>
                      <TableHead className="py-2">スタッフ</TableHead>
                      <TableHead className="py-2">ステータス</TableHead>
                      <TableHead className="py-2">予約経路</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map(
                      (reservation: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="py-3">
                            {reservation.date}
                          </TableCell>
                          <TableCell className="py-3">
                            {truncateText(reservation.menu, 7)}
                          </TableCell>
                          <TableCell className="py-3">
                            ¥{reservation.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="py-3">
                            {reservation.staff}
                          </TableCell>
                          <TableCell className="py-3">
                            {renderStatusBadge(reservation.status)}
                          </TableCell>
                          <TableCell className="py-3">
                            {reservation.route}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <div className="p-4">
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  className="w-full h-40 p-2 border rounded"
                  placeholder="お客様に関するメモを入力してください"
                />
                <Button
                  onClick={() => console.log("メモを保存")}
                  className="mt-2"
                >
                  メモを保存
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button
          variant="outline"
          onClick={handleBack}
          className="flex items-center"
        >
          <ArrowLeft className="mr-2" /> 戻る
        </Button>
        <div className="space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2" /> 削除する
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>本当に削除しますか？</DialogTitle>
              </DialogHeader>
              <p>この操作は取り消せません。</p>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline">キャンセル</Button>
                <Button
                  variant="destructive"
                  onClick={() => console.log("削除実行")}
                >
                  削除
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {isEditing ? (
            <Button
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600"
            >
              <Save className="mr-2" /> 保存する
            </Button>
          ) : (
            <Button variant="outline" onClick={handleEditToggle}>
              <Edit className="mr-2" /> 変更する
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailPage;
