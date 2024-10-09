
import dynamic from 'next/dynamic';

const RegisterClosingList = dynamic(() => import("@/sections/sales/closing-list-view"), { ssr: false });

export default function ClosingListPage() {
  return <RegisterClosingList />;
}