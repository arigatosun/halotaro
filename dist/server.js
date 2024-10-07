"use strict";
// server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const supabase_js_1 = require("@supabase/supabase-js");
const main_1 = require("./scripts/main");
const encryption_1 = require("./src/utils/encryption");
const app = (0, express_1.default)();
app.use(body_parser_1.default.json());
// 環境変数から許可するオリジンを取得
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = allowedOriginsEnv.split(',').map(origin => origin.trim());
// CORS設定を動的に行う
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // オリジンが許可リストに含まれているかチェック
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS policy: This origin is not allowed.'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
}));
// Supabaseクライアントの作成
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
// 認証ミドルウェア
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey === process.env.API_KEY) {
        next();
    }
    else {
        res.status(401).send('Unauthorized');
    }
};
// エンドポイントの定義
app.post('/salonboard-integration', authenticate, async (req, res) => {
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
        const password = (0, encryption_1.decrypt)(encrypted_password);
        let result;
        // サロンボード連携を実行
        switch (syncType) {
            case 'reservations':
                result = await (0, main_1.syncReservations)(haloTaroUserId, salonboardUserId, password);
                break;
            case 'menus':
                result = await (0, main_1.syncMenus)(haloTaroUserId, salonboardUserId, password);
                break;
            case 'staff':
                result = await (0, main_1.syncStaffData)(haloTaroUserId, salonboardUserId, password);
                break;
            case 'coupons':
                result = await (0, main_1.syncCoupons)(haloTaroUserId, salonboardUserId, password);
                break;
            default:
                res.status(400).json({ error: 'Invalid sync type' });
                return;
        }
        res.json({ message: result });
    }
    catch (error) {
        console.error('Integration error:', error);
        res.status(500).json({ error: 'Integration failed' });
    }
});
// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
