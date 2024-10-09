import { Suspense } from "react";
import CustomerListPage from "@/sections/Dashboard/customer/customer-list-view";

// サーバーサイドでのデータ取得は不要になりました
// async function getCustomers() {
//   return generateCustomers(100);
// }

export default function CustomerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerListPage />
    </Suspense>
  );
}

// generateCustomers関数は不要になりました
// function generateCustomers(count: number) { ... }