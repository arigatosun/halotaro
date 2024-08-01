// src/utils/generateRandomReservations.ts

import { faker } from "@faker-js/faker/locale/ja";

export interface Reservation {
  key: string;
  date: string;
  time: string;
  status: string;
  customerName: string;
  staff: string;
  service: string;
  price: number;
}

const statuses = [
  "受付待ち",
  "受付済み",
  "施術中",
  "来店処理済み",
  "お客様キャンセル",
  "サロンキャンセル",
  "無断キャンセル",
];

const beautyServices = [
  "カット",
  "カラー",
  "パーマ",
  "ストレートパーマ",
  "トリートメント",
  "ヘッドスパ",
  "眉カット",
  "メイク",
  "ネイル",
  "まつげエクステ",
  "フェイシャル",
];

const generateRandomReservations = (count: number): Reservation[] => {
  return Array.from({ length: count }, (_, index) => ({
    key: faker.string.uuid(),
    date: faker.date.future().toISOString().split("T")[0],
    time: faker.date.future().toTimeString().slice(0, 5),
    status: faker.helpers.arrayElement(statuses),
    customerName: `${faker.person.lastName()} ${faker.person.firstName()}`,
    staff: `${faker.person.lastName()}`,
    service: faker.helpers.arrayElement(beautyServices),
    price: Math.floor(faker.number.int({ min: 3000, max: 20000 }) / 100) * 100,
  }));
};

export default generateRandomReservations;
