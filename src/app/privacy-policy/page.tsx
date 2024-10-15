import React from "react";

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ヘッダー */}
      <header className="bg-white bg-opacity-90 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-red-600">ハロタロ</h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-grow">
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="container mx-auto">
            <h2 className="text-4xl font-bold mb-8 text-gray-800 text-center">
              プライバシーポリシー
            </h2>
            <div className="prose max-w-none">
              <p>
                ハロタロ
                プライバシーポリシー（以下「本ポリシー」といいます）は、株式会社LOWE（以下「当社」といいます）が提供するサービス「ハロタロ」（以下「本サービス」といいます）及び当社が提供する本サービスに係るウェブサイト（以下「本サイト」といいます）における個人情報の取扱を定めたものです。
              </p>
              <p>
                当社は、個人情報の重要性を認識し、その保護の徹底が社会的責務であると考え、本サービスをご利用の利用者から取得した個人情報を、個人情報の保護に関する法律その他関連法令及びガイドライン等を遵守するとともに、適正に取り扱うことを約束いたします。
              </p>
              <p>株式会社LOWE</p>
              <p>代表取締役社長　斉藤 憲司</p>
              <p>メールアドレス：reservation@harotalo.com</p>

              <h3>1. 個人情報の取得について</h3>
              <p>
                当社は、本サービスの提供等に必要となる個人情報を、適法かつ公正な手段を用いて取得いたします。また、本サイトではホームページの利用状況を把握するためにGoogle
                Analyticsを利用しています。Google
                Analyticsから提供されるCookieを使用していますが、Google
                Analyticsによって個人を特定する情報は取得していません。Google
                Analyticsの利用により収集されたデータは、Google社のプライバシーポリシーに基づいて管理されています。
              </p>

              <h3>2. 個人情報の利用目的について</h3>
              <p>
                当社は、取得した個人情報を以下に記載される利用目的の範囲でのみ利用し、利用者の合意または法令の定めなく、目的外の利用を行わないものとします。
              </p>
              <ul className="list-disc pl-5">
                <li>本サービスの提供、案内</li>
                <li>本サイト利用者の登録事項確認及び認証</li>
                <li>利用者間のコミュニケーション</li>
                <li>当社と利用者間のコミュニケーション</li>
                <li>本サービス利用状況の調査、分析</li>
                <li>マーケティング調査、アンケートの実施</li>
                <li>本サービスの開発保守、改善、不具合対応</li>
                <li>お問い合わせ対応</li>
                <li>上記に付帯・関連するすべての業務</li>
              </ul>

              <h3>3. 個人情報の安全管理について</h3>
              <p>
                当社は、個人情報の漏えい、滅失若しくは毀損の防止、またはその他の安全管理のために個人情報へのアクセス権限の制限を行っています。利用者から個人情報をご提供いただく際には、通信途上における第三者の不正なアクセスに備え、暗号化技術であるSSL（Secure
                Sockets
                Layer）による個人情報の暗号化またはこれに準ずるセキュリティ技術を施し、安全性を確保しております。
              </p>

              <h3>4. 個人情報の第三者提供について</h3>
              <p>
                当社は、以下の場合において個人情報を第三者に開示することがあります。
              </p>
              <ul className="list-disc pl-5">
                <li>
                  当社が利用目的の達成に必要な範囲で第三者に業務を委託する場合
                </li>
                <li>
                  当社が合併、会社分割、事業譲渡または当社の事業、資産若しくは株式の全部または一部の処分をする場合
                </li>
                <li>
                  その他、利用者に対して開示の同意を求め、利用者がそれに応じた場合
                </li>
              </ul>

              <h3>5. 個人情報の開示等の手続きについて</h3>
              <p>
                利用者は、当社に対してご自身の個人情報の開示等（利用目的の通知、開示、内容の訂正・追加・削除、利用の停止または消去、第三者への提供の停止）に関して、当社問い合わせ窓口に申し出ることができます。
              </p>

              <h3>6. お問い合わせ窓口</h3>
              <p>株式会社LOWE　問い合わせ窓口</p>
              <p>〒543-0023　大阪府大阪市天王寺区味原町2-1</p>
              <p>メールアドレス：reservation@harotalo.com</p>
              <p>
                （受付時間　10:00～17:00
                ※土・日曜日、祝日、年末年始、ゴールデンウィークを除く）
              </p>

              <p className="mt-8">制定日：2024年8月6日</p>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 ハロタロ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;
