import { Suspense } from "react";
import CustomerListPage from "@/sections/Dashboard/customer/customer-list-view";

// サーバーサイドでデータを取得
async function getCustomers() {
  return generateCustomers(100);
}

export default async function CustomerPage() {
  const initialCustomers = await getCustomers();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerListPage initialCustomers={initialCustomers} />
    </Suspense>
  );
}

// generateCustomers関数の定義
function generateCustomers(count: number) {
  const customers = [];
  const lastNames = [
    "渡辺",
    "田中",
    "佐々木",
    "山田",
    "高橋",
    "佐藤",
    "鈴木",
    "伊藤",
    "中村",
    "小林",
    "加藤",
    "吉田",
    "松本",
  ];
  const firstNames = [
    "太郎",
    "花子",
    "一郎",
    "美咲",
    "健太",
    "優子",
    "翔太",
    "愛",
    "大輔",
    "さくら",
    "直樹",
    "香織",
  ];
  const lastNameKana = [
    "ワタナベ",
    "タナカ",
    "ササキ",
    "ヤマダ",
    "タカハシ",
    "サトウ",
    "スズキ",
    "イトウ",
    "ナカムラ",
    "コバヤシ",
    "カトウ",
    "ヨシダ",
    "マツモト",
  ];
  const firstNameKana = [
    "タロウ",
    "ハナコ",
    "イチロウ",
    "ミサキ",
    "ケンタ",
    "ユウコ",
    "ショウタ",
    "アイ",
    "ダイスケ",
    "サクラ",
    "ナオキ",
    "カオリ",
  ];

  for (let i = 0; i < count; i++) {
    const lastNameIndex = Math.floor(Math.random() * lastNames.length);
    const firstNameIndex = Math.floor(Math.random() * firstNames.length);

    const lastName = lastNames[lastNameIndex];
    const firstName = firstNames[firstNameIndex];
    const lastNameKanaValue = lastNameKana[lastNameIndex];
    const firstNameKanaValue = firstNameKana[firstNameIndex];

    customers.push({
      id: i + 1,
      name: lastName + firstName,
      kana: lastNameKanaValue + " " + firstNameKanaValue,
      gender: Math.random() > 0.5 ? "女性" : "男性",
      visits: Math.floor(Math.random() * 10),
      lastVisit: new Date(Date.now() - Math.floor(Math.random() * 10000000000))
        .toISOString()
        .split("T")[0],
    });
  }
  return customers;
}
