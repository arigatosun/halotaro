"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/authcontext";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");

interface AccountingInformation {
  id: string;
  reservation_id: string;
  customer_name: string;
  staff_name: string;
  cashier_name: string;
  payment_methods: { method: string; amount: number }[]; // JSONB型
  items: { name: string; price: number }[]; // JSONB型
  total_price: number;
  created_at: string;
  updated_at: string;
  is_temporary: boolean;
  is_closed: boolean;
}

interface Reservation {
  id: string;
  user_id: string;
  menu_id: string;
  staff_id: string;
  status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  start_time: string;
  end_time: string;
  menu_item?: { id: string; name: string };
  staff?: { id: string; name: string };
  customer?: { id: string; name: string };
}

const CompactRegisterClosingUI: React.FC = () => {
  const { session, user } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>(""); // 初期値を空文字に設定
  const [accountingList, setAccountingList] = useState<AccountingInformation[]>([]);
  const [totalByPaymentMethod, setTotalByPaymentMethod] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [preparedCash, setPreparedCash] = useState<number>(0);
  const [actualCash, setActualCash] = useState<number>(0);
  const [cashOut, setCashOut] = useState<number>(0); // 追加
  const [closingDate, setClosingDate] = useState<string>("");
  const [closingMemo, setClosingMemo] = useState<string>("");
  const [latestClosingDate, setLatestClosingDate] = useState<string>("");

  // 未会計予約のステート
  const [unaccountedReservations, setUnaccountedReservations] = useState<Reservation[]>([]);
  const [loadingUnaccounted, setLoadingUnaccounted] = useState<boolean>(false);
  const [errorUnaccounted, setErrorUnaccounted] = useState<Error | null>(null);

  const statusMapping: { [key: string]: string } = {
    confirmed: "会計待ち",
    // 他のステータスのマッピングが必要であればここに追加
  };

  // 定義された支払い方法
  const PAYMENT_METHODS = ["現金", "クレジットカード", "電子マネー", "ギフト券", "ポイント", "スマート支払い"];

  // ヘルパー関数の追加
  const formatAmount = (amount: number): string => {
    return amount < 0 ? `-${Math.abs(amount).toLocaleString()}` : amount.toLocaleString();
  };

  // スタッフデータの取得
  useEffect(() => {
    const fetchStaffData = async () => {
      if (!session || !user) return;
      try {
        const response = await axios.get("/api/staff", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const staffData = response.data;
        setStaffList(staffData);

        // ここでは自動選択を解除します
        // if (staffData.length > 0) {
        //   setSelectedStaff(staffData[0].id);
        // }
      } catch (err) {
        console.error("スタッフデータの取得エラー:", err);
        setError("スタッフデータの取得に失敗しました。");
      }
    };

    fetchStaffData();
  }, [session, user]);

  // 会計情報の取得
  const fetchAccountingData = async () => {
    if (!session || !user) return;
    setLoading(true);
    try {
      const response = await axios.get("/api/accounting-information", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const accountingData: AccountingInformation[] = response.data.data;
      setAccountingList(accountingData);

      // 支払い方法ごとの合計金額を計算（全ての支払い方法を含む）
      const totals: { [key: string]: number } = {};
      PAYMENT_METHODS.forEach((method) => {
        totals[method] = 0;
      });

      accountingData.forEach((record) => {
        record.payment_methods.forEach((method) => {
          if (PAYMENT_METHODS.includes(method.method)) {
            totals[method.method] += method.amount;
          }
        });
      });

      setTotalByPaymentMethod(totals);
    } catch (err) {
      console.error("会計データの取得エラー:", err);
      setError("会計データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountingData();
  }, [session, user]);

  // 未会計予約の取得
  const fetchUnaccountedReservations = async () => {
    if (!session || !user) return;
    setLoadingUnaccounted(true);
    try {
      const response = await axios.get("/api/unaccounted-reservations", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const data = response.data.data;
      setUnaccountedReservations(data);
    } catch (err) {
      console.error("未会計予約の取得エラー:", err);
      setErrorUnaccounted(new Error("未会計予約の取得に失敗しました。"));
    } finally {
      setLoadingUnaccounted(false);
    }
  };

  useEffect(() => {
    fetchUnaccountedReservations();
  }, [session, user]);

  // 最新の closing_date を取得する関数
  const fetchLatestClosingDate = async () => {
    if (!session || !user) return;
    try {
      const response = await axios.get("/api/register-closings/latest", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const { closing_date } = response.data;
      if (closing_date) {
        // 日本時間でフォーマット
        const formattedDateTime = dayjs(closing_date).tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss");
        setLatestClosingDate(`${formattedDateTime} ～`);
      } else {
        setLatestClosingDate("未締め");
      }
    } catch (err) {
      console.error("最新レジ締め日時の取得エラー:", err);
      setLatestClosingDate("取得失敗");
    }
  };

  useEffect(() => {
    fetchLatestClosingDate();
  }, [session, user]);

  // レジ金計算結果の差額計算（実際のレジ金 - 想定のレジ金）
  const calculateDifference = (): number => {
    const expectedCash = (totalByPaymentMethod["現金"] || 0) + preparedCash;
    return actualCash - expectedCash;
  };

  // 本日ボタンを押したときのハンドラー
  const handleSetToday = () => {
    const now = dayjs().tz("Asia/Tokyo");
    const formattedDateTime = now.toISOString(); // UTCに変換してISO文字列として設定
    setClosingDate(formattedDateTime);
  };

  // レジ締めの完了処理
  const handleRegisterClosing = async () => {
    if (!session) {
      alert("ログインが必要です。");
      return;
    }

    // バリデーション
    if (!closingDate || !selectedStaff) {
      alert("レジ締め日とレジ締め担当者を選択してください。");
      return;
    }

    const closingDateObj = dayjs(closingDate);
    if (!closingDateObj.isValid()) {
      alert("有効なレジ締め日を選択してください。");
      return;
    }

    try {
      const accountingIds = accountingList.map((item) => item.id);

      const response = await axios.post(
        "/api/register-closings",
        {
          // サーバー側で closing_date を設定するため、クライアントから送信しません
          // closing_date: closingDateObj.toISOString(),
          prepared_cash: preparedCash,
          prepared_cash_details: null,
          actual_cash: actualCash,
          cash_difference: calculateDifference(),
          closing_memo: closingMemo,
          closing_staff_id: selectedStaff,
          cash_in: 0,
          cash_out: cashOut, // cashOut を追加
          accounting_ids: accountingIds,
        },
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      // 成功時に会計データを再取得してUIを更新
      await fetchAccountingData();
      await fetchLatestClosingDate(); // 最新の締め日時を再取得
      await fetchUnaccountedReservations(); // 未会計予約を再取得
      alert("レジ締めが完了しました。");
    } catch (error: any) {
      console.error("レジ締めの保存エラー:", error);
      alert("レジ締めの保存に失敗しました。");
    }
  };

  const handleReservationAction = (reservationId: string) => {
    // 会計ページへ遷移する例
    router.push(`/dashboard/reservations/${reservationId}/accounting`);
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">レジ締め</h1>
      <Alert className="mb-4">
        <AlertTitle>注意事項</AlertTitle>
        <AlertDescription className="text-sm">
          一日の業務終了時にレジ締めを行い、お金のやり取りが正しかったかを確認してください。
          営業開始時にお釣り用に準備していたお金を[レジ準備金]に、実際にキャッシュドロアに入っている金額を[実際のレジ金]に入力し、レジ金の過不足が発生していないかを確認してください。
        </AlertDescription>
      </Alert>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 会計のレジ金情報 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">会計のレジ金情報</h3>
              <Table>
                <TableBody className="text-sm">
                  {PAYMENT_METHODS.map((method) => (
                    <TableRow key={method}>
                      <TableCell className="py-1">{method}</TableCell>
                      <TableCell className="text-right py-1">
                        {totalByPaymentMethod[method]?.toLocaleString() || "0"} 円
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 会計以外のレジ金情報 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">会計以外のレジ金情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <Label htmlFor="preparedCash" className="text-sm">
                    レジ準備金
                  </Label>
                  <div className="flex items-center">
                    <Input
                      id="preparedCash"
                      type="number"
                      className="w-24 text-right text-sm h-8"
                      value={preparedCash}
                      onChange={(e) => setPreparedCash(parseInt(e.target.value) || 0)}
                    />
                    <span className="ml-1">円</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ入金額</span>
                  <span>0 円</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ出金額</span>
                  <div className="flex items-center">
                    <Input
                      id="cashOut"
                      type="number"
                      className="w-24 text-right text-sm h-8"
                      value={cashOut}
                      onChange={(e) => setCashOut(parseInt(e.target.value) || 0)}
                    />
                    <span className={`ml-1 ${cashOut < 0 ? "text-red-500" : "text-green-500"}`}>
                      {cashOut < 0 ? "-" : ""}
                      {Math.abs(cashOut).toLocaleString()} 円
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* レジ金計算結果 */}
            <div>
              <h3 className="font-semibold mb-2 text-sm">レジ金計算結果</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>想定のレジ金</span>
                  <span className="font-bold">
                    {((totalByPaymentMethod["現金"] || 0) + preparedCash).toLocaleString()} 円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>レジ過不足金額</span>
                  <span className={`font-bold ${calculateDifference() < 0 ? "text-red-500" : "text-green-500"}`}>
                    {formatAmount(calculateDifference())} 円
                  </span>
                </div>
                <div>
                  <Label htmlFor="actualCash" className="text-sm">
                    実際のレジ金
                  </Label>
                  <div className="flex items-center mt-1">
                    <Input
                      id="actualCash"
                      type="number"
                      className="text-right text-sm h-8"
                      value={actualCash}
                      onChange={(e) => setActualCash(parseInt(e.target.value) || 0)}
                    />
                    <span className="ml-1">円</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* レジ締め情報の入力 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="flex flex-col">
          <Label htmlFor="closingDate" className="text-sm">
            レジ締め日
          </Label>
          <div className="flex items-center mt-1">
            <Input
              id="closingDate"
              type="date"
              className="h-8 text-sm"
              value={closingDate ? dayjs(closingDate).format("YYYY-MM-DD") : ""}
              onChange={(e) => {
                const selectedDate = e.target.value;
                if (selectedDate) {
                  const now = dayjs().tz("Asia/Tokyo");
                  const selectedDateTime = dayjs(`${selectedDate} ${now.format("HH:mm:ss")}`, "YYYY-MM-DD HH:mm:ss")
                    .tz("Asia/Tokyo")
                    .utc()
                    .toISOString();
                  setClosingDate(selectedDateTime);
                } else {
                  setClosingDate("");
                }
              }}
            />
            <Button
              size="sm"
              className="ml-2 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={handleSetToday}
            >
              本日
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-sm">レジ締め対象日</Label>
          <Input value={latestClosingDate || "取得中..."} readOnly className="mt-1 bg-gray-100 h-8 text-sm" />
        </div>
        <div>
          <Label htmlFor="closingStaff" className="text-sm">
            レジ締め担当者
          </Label>
          <Select value={selectedStaff} onValueChange={(value) => setSelectedStaff(value)} required>
            <SelectTrigger id="closingStaff" className="mt-1 h-8 text-sm">
              <SelectValue placeholder="レジ締め担当者" />
            </SelectTrigger>
            <SelectContent>
              {/* プレースホルダーとしての選択肢を追加 */}
              <SelectItem value="aaa" disabled>
                レジ締め担当者
              </SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* レジ締めメモ */}
      <div className="mb-5">
        <Label htmlFor="closingMemo" className="text-sm">
          レジ締めメモ
        </Label>
        <Textarea
          id="closingMemo"
          placeholder="メモを入力"
          className="mt-1 text-sm"
          rows={3}
          value={closingMemo}
          onChange={(e) => setClosingMemo(e.target.value)}
        />
      </div>

      {/* レジ締め完了ボタン */}
      <div className="flex justify-end mb-8">
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleRegisterClosing}
        >
          レジ締めの完了
        </Button>
      </div>

      {/* 未会計予約一覧 */}
      <Card className="mb-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>未会計予約一覧</CardTitle>
          <AlertDescription className="text-sm text-red-500">
            以下の予約は会計が行われていません。必要に応じて会計やキャンセルを行ってください。
          </AlertDescription>
        </CardHeader>
        <CardContent>
          {loadingUnaccounted ? (
            <p>読み込み中...</p>
          ) : errorUnaccounted ? (
            <Alert className="mb-4">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{errorUnaccounted.message}</AlertDescription>
            </Alert>
          ) : unaccountedReservations.length === 0 ? (
            <p>未会計の予約はありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>お客様名</TableHead>
                  <TableHead>メニュー</TableHead>
                  <TableHead>担当スタッフ</TableHead>
                  <TableHead>合計金額</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unaccountedReservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      {dayjs(reservation.start_time).tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm")}
                    </TableCell>
                    <TableCell>{statusMapping[reservation.status] || reservation.status}</TableCell>
                    <TableCell>{reservation.customer?.name || "不明"}</TableCell>
                    <TableCell>{reservation.menu_item?.name || "不明"}</TableCell>
                    <TableCell>{reservation.staff?.name || "未割当"}</TableCell>
                    <TableCell>{reservation.total_price?.toLocaleString()} 円</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => handleReservationAction(reservation.id)}>
                        会計
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* レジ締め対象 会計一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>レジ締め対象 会計一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>読み込み中...</p>
          ) : error ? (
            <Alert className="mb-4">
              <AlertTitle>エラー</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : accountingList.length === 0 ? (
            <p>会計データがありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>来店日時</TableHead>
                  <TableHead>お客様名</TableHead>
                  <TableHead>スタッフ</TableHead>
                  <TableHead>メニュー・店販</TableHead>
                  <TableHead>お支払金額</TableHead>
                  <TableHead>支払方法</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountingList.map((item) => (
                  <TableRow key={item.id}>
                    {/* 来店日時を日時含む形式で表示 */}
                    <TableCell>
                      {dayjs(item.created_at).tz("Asia/Tokyo").format("YYYY-MM-DD HH:mm:ss")}
                    </TableCell>
                    <TableCell>{item.customer_name}</TableCell>
                    <TableCell>{item.staff_name}</TableCell>
                    <TableCell>
                      {item.items.map((service: any) => service.name).join(", ")}
                    </TableCell>
                    <TableCell>{item.total_price.toLocaleString()} 円</TableCell>
                    <TableCell>
                      {item.payment_methods
                        .map((method: any) => `${method.method}: ¥${method.amount.toLocaleString()}`)
                        .join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CompactRegisterClosingUI;
