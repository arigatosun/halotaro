import React from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  DollarSign,
  Scissors,
  CreditCard,
} from "lucide-react";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-50 to-red-50">
      {/* ヘッダー */}
      <header className="bg-white bg-opacity-90 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-red-600">ハロタロ</h1>
          <nav className="flex items-center">
            <ul className="flex space-x-6 mr-6">
              <li>
                <a
                  href="#features"
                  className="text-gray-700 hover:text-yellow-500 transition duration-300"
                >
                  機能
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-gray-700 hover:text-yellow-500 transition duration-300"
                >
                  料金
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-gray-700 hover:text-yellow-500 transition duration-300"
                >
                  お問い合わせ
                </a>
              </li>
            </ul>
            <Link
              href="/auth/login"
              className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-red-600 transition duration-300"
            >
              ログイン
            </Link>
          </nav>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow">
        {/* ヒーローセクション */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-red-400 opacity-10 transform -skew-y-6"></div>
          <div className="container mx-auto text-center relative z-10">
            <h2 className="text-5xl font-extrabold mb-6 text-gray-800 leading-tight">
              美容サロン管理を、
              <br className="hidden sm:inline" />
              <span className="text-red-600">もっとスマートに。</span>
            </h2>
            <p className="text-xl mb-10 text-gray-700 max-w-2xl mx-auto">
              ハロタロは、予約管理から売上分析まで、サロン運営に必要なすべての機能を提供します。
              効率的で洗練されたサロン運営を、今すぐ始めましょう。
            </p>
            <Link
              href="/dashboard"
              className="bg-yellow-400 text-gray-800 px-8 py-4 rounded-full text-lg font-semibold hover:bg-yellow-500 transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              無料でデモを体験する
            </Link>
          </div>
        </section>

        {/* 特徴セクション */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-800">
              ハロタロの特徴
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* 中央の大きなカード（事前決済機能） */}
              <div className="md:col-span-3 mb-8">
                <FeatureCard
                  icon={<CreditCard className="w-24 h-24 text-yellow-500" />}
                  title="事前決済機能"
                  description="オンラインでの事前決済で、キャンセル率を大幅に低減し、収益を安定化。予約時点で確実な売上を確保し、ビジネスの安定性を向上させます。"
                  isPrimary={true}
                />
              </div>
              {/* その他の機能 */}
              <FeatureCard
                icon={<Calendar className="w-16 h-16 text-red-500" />}
                title="簡単予約管理"
                description="直感的なインターフェースで、予約の管理が簡単に行えます。"
              />
              <FeatureCard
                icon={<Users className="w-16 h-16 text-red-500" />}
                title="スタッフ管理"
                description="スタッフのシフトやパフォーマンスを効率的に管理できます。"
              />
              <FeatureCard
                icon={<DollarSign className="w-16 h-16 text-red-500" />}
                title="売上分析"
                description="詳細な売上レポートで、ビジネスの成長を可視化します。"
              />
            </div>
          </div>
        </section>

        {/* CTAセクション */}
        <section className="py-20 bg-gradient-to-r from-yellow-400 to-red-500 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">
              サロン運営をもっと効率的に
            </h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto">
              今すぐハロタロを試して、サロン管理の新しい形を体験しましょう。
              あなたのビジネスの成長をサポートします。
            </p>
            <Link
              href="/auth/login"
              className="bg-white text-red-600 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              ログイン
            </Link>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="mb-4 md:mb-0">
              &copy; 2024 ハロタロ. All rights reserved.
            </p>
            <nav>
              <ul className="flex space-x-6">
                <li>
                  <a
                    href="#"
                    className="hover:text-yellow-400 transition duration-300"
                  >
                    利用規約
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-yellow-400 transition duration-300"
                  >
                    プライバシーポリシー
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-yellow-400 transition duration-300"
                  >
                    お問い合わせ
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  isPrimary?: boolean;
}> = ({ icon, title, description, isPrimary = false }) => (
  <div
    className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:-translate-y-2 overflow-hidden ${
      isPrimary ? "border-4 border-yellow-400" : ""
    }`}
  >
    <div className={`p-8 ${!isPrimary && "border-t-4 border-red-400"}`}>
      <div className="flex justify-center mb-6">{icon}</div>
      <h3
        className={`${
          isPrimary ? "text-3xl" : "text-2xl"
        } font-semibold mb-4 text-gray-800`}
      >
        {title}
      </h3>
      <p className={`${isPrimary ? "text-lg" : "text-base"} text-gray-600`}>
        {description}
      </p>
    </div>
  </div>
);

export default LandingPage;
