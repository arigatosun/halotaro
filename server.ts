// server.ts

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';

import {
  syncReservations,
  syncMenus,
  syncStaffData,
  syncCoupons,
} from './scripts/main';
import { decrypt } from './src/utils/encryption';


const app = express();
app.use(bodyParser.json());

// 環境変数から許可するオリジンを取得
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());

// CORS設定を動的に行う
app.use(cors({
  origin: function (origin, callback) {
    // オリジンが許可リストに含まれているかチェック
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: This origin is not allowed.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}));
// Supabaseクライアントの作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 認証ミドルウェア
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey === process.env.API_KEY) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Sync結果の型定義（必要に応じて拡張可能）
type SyncResult = 
  | string
  | {
      itemsProcessed: number;
      itemsUpdated: number;
      itemsAdded: number;
      itemsDeactivated: number;
      dataHash: string;
    };

// エンドポイントの定義
app.post('/salonboard-integration', authenticate, async (req: Request, res: Response) => {
  try {
    const { haloTaroUserId, syncType } = req.body;

    // バリデーション
    if (!haloTaroUserId) {
      res.status(400).json({ error: 'HaloTaro User ID is required' });
      return;
    }

    if (!syncType || !['reservations', 'menus', 'staff', 'coupons'].includes(syncType)) {
      res.status(400).json({ error: 'Invalid or missing sync type' });
      return;
    }

    // サロンボードの認証情報を取得
    const { data, error } = await supabase
      .from('salonboard_credentials')
      .select('username, encrypted_password')
      .eq('user_id', haloTaroUserId)
      .single();

    if (error || !data) {
      console.error('Error fetching salonboard credentials:', error);
      res.status(500).json({ error: 'Failed to retrieve credentials' });
      return;
    }

    const { username: salonboardUserId, encrypted_password } = data;
    const password = decrypt(encrypted_password);

    let result: SyncResult;

    // サロンボード連携を実行
    switch (syncType) {
      case 'reservations':
        result = await syncReservations(haloTaroUserId, salonboardUserId, password);
        break;
      case 'menus':
        result = await syncMenus(haloTaroUserId, salonboardUserId, password);
        break;
      case 'staff':
        result = await syncStaffData(haloTaroUserId, salonboardUserId, password);
        break;
      case 'coupons':
        result = await syncCoupons(haloTaroUserId, salonboardUserId, password);
        break;
      default:
        res.status(400).json({ error: 'Invalid sync type' });
        return;
    }

    res.json({ message: result });
  } catch (error) {
    console.error('Integration error:', error);
    res.status(500).json({ error: 'Integration failed' });
  }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
