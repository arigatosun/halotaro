// src/utils/generateRandomReservations.ts

import { faker } from "@faker-js/faker";

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

const staffMembers = ["佐藤 健", "鈴木 愛", "田中 誠", "渡辺 美咲", "高橋 淳"];
const services = [
  "カット",
  "カラー",
  "パーマ",
  "トリートメント",
  "ヘッドスパ",
  "セット",
];
const statuses = ["受付済み", "来店済み", "施術中", "会計済み", "キャンセル"];

const generateRandomReservations = (count: number): Reservation[] => {
  return Array.from({ length: count }, (_, index) => ({
    key: index.toString(),
    date: faker.date
      .between({ from: "2024-07-01", to: "2024-07-31" })
      .toISOString()
      .split("T")[0],
    time: faker.date.future().toTimeString().slice(0, 5),
    status: faker.helpers.arrayElement(statuses),
    customerName: faker.person.lastName() + " " + faker.person.firstName(),
    staff: faker.helpers.arrayElement(staffMembers),
    service: faker.helpers.arrayElement(services),
    price: faker.number.int({ min: 3000, max: 20000 }),
  }));
};

export default generateRandomReservations;
