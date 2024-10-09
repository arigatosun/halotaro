require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { syncAllData } = require("./scripts/main");

// ミドルウェアの設定
app.use(bodyParser.json());

// 認証ミドルウェア
function authenticate(req, res, next) {
  const apiKey = req.headers["x-api-key"];
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(403).json({ error: "Forbidden" });
  }
}

// エンドポイントの定義
app.post("/salonboard-integration", authenticate, async (req, res) => {
  try {
    const { haloTaroUserId } = req.body;

    if (!haloTaroUserId) {
      res.status(400).json({ error: "HaloTaro User ID is required" });
      return;
    }

    // 同期処理を非同期で実行
    syncAllData(haloTaroUserId)
      .then(() => {
        console.log(`ユーザー ${haloTaroUserId} の同期が完了しました`);
      })
      .catch((error) => {
        console.error(
          `ユーザー ${haloTaroUserId} の同期中にエラーが発生しました:`,
          error
        );
      });

    // リクエストに対してすぐにレスポンスを返す
    res.status(200).json({ message: "同期を開始しました。" });
  } catch (error) {
    console.error("Integration error:", error);
    res.status(500).json({ error: "Integration failed" });
  }
});

// サーバーの起動
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
});
