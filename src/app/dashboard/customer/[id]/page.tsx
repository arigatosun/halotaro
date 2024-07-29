import { Suspense } from "react";
import CustomerDetailPage from "@/sections/Dashboard/customer/customer-details-view";

export default function CustomerPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CustomerDetailPage id={params.id} />
    </Suspense>
  );
}
