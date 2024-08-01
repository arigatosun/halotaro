import React from "react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-100 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center text-sm text-gray-600">
          <Link href="/inquiries" className="mx-2 hover:underline">
            お問い合わせ
          </Link>
          <Link href="/terms" className="mx-2 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy-policy" className="mx-2 hover:underline">
            プライバシーポリシー
          </Link>
          <Link href="/help" className="mx-2 hover:underline">
            ヘルプ
          </Link>
        </div>
        <div className="text-center mt-4">
          <span className="text-sm text-gray-500">&copy; LOWE Co., Ltd.</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
