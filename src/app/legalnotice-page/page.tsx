import React from "react";

const LegalNoticePage: React.FC = () => {
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
              特定商取引法に基づく表記
            </h2>
            <div className="prose max-w-none">
              <h3>販売業者</h3>
              <p>株式会社LOWE</p>

              <h3>代表者</h3>
              <p>代表取締役社長　斉藤 憲司</p>

              <h3>所在地</h3>
              <p>〒543-0023　大阪府大阪市天王寺区味原町2-1</p>

              <h3>電話番号</h3>
              <p>06-4303-3516（受付時間：平日10:00〜18:00）</p>

              <h3>メールアドレス</h3>
              <p>reservation@harotalo.com</p>

              <h3>サービスの内容</h3>
              <p>
                ハロタロは、美容サロン、美容室向けの事前決済予約システムです。
              </p>

              <h3>料金</h3>
              <p>
                料金は、お客様が予約されるメニュー内容により異なります。各サロンが提供するメニューごとに価格が設定されており、詳細は予約ページにてご確認いただけます。
              </p>

              <h3>追加の手数料などの追加料金</h3>
              <p>なし</p>

              <h3>引き渡し時期</h3>
              <p>
                予約確定時にサービスの提供日時が決定されます。サービス提供日は、お客様が予約時に指定された日時となります。
              </p>

              <h3>支払方法</h3>
              <p>クレジットカード決済</p>

              <h3>決済プロセス</h3>
              <p>
                お客様が予約を行う際に、クレジットカードによる事前決済が行われます。決済完了後、予約が確定されます。
              </p>

              <h3>サービス提供時期</h3>
              <p>ユーザー登録完了後、即時にサービスをご利用いただけます。</p>

              <h3>キャンセル・返金ポリシー</h3>
              <p>
                キャンセルポリシーは、各サロンが事前に選定したものが適用されます。このポリシーは、エンドユーザーが予約時にメールにて事前に告知されます。詳細は予約確認メールをご確認ください。
              </p>

              <h3>決済期間</h3>
              <p>クレジットカード決済の場合はただちに処理されます。</p>

              <h3>個人情報保護方針</h3>
              <p>
                当社は、ユーザーの個人情報を適切に管理し、法令を遵守して取り扱います。詳細は「プライバシーポリシー」をご確認ください。
              </p>
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

export default LegalNoticePage;
