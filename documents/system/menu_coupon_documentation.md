# メニューとクーポンシステム説明書

## 1. 概要

Halotaroシステムでは、メニューとクーポンが予約と会計の基盤となるコア機能を提供しています。メニューはサロンで提供されるサービスを、クーポンは割引や特典を表現するためのデータ構造となっています。

## 2. データモデル

### 2.1 メニュー（MenuItem）
- **識別子**: 数値ID
- **主要属性**:
  - `id`: 数値ID
  - `name`: メニュー名
  - `description`: 説明
  - `price`: 価格
  - `duration`: 所要時間（分）
  - `image_url`: 画像URL
  - `is_reservable`: 予約可否フラグ
  - `sort_order`: 表示順序
  - `category_id`: カテゴリID
  - `isCoupon`: クーポンかどうかのフラグ（通常はfalse）

### 2.2 クーポン（Coupon）
- **識別子**: UUID形式
- **主要属性**:
  - `id`: UUID形式のID
  - `name`: クーポン名
  - `description`: 説明
  - `price`: 価格
  - `duration`: 所要時間（分）
  - `image_url`: 画像URL
  - `is_reservable`: 予約可否フラグ
  - `sort_order`: 表示順序
  - `category`: 対象カテゴリ（「新規」「再来」「全員」など）

## 3. 管理機能

### 3.1 メニュー管理
- メニューの追加・編集・削除機能
- カテゴリ分類機能
- 画像アップロード機能
- 表示順序の管理
- 予約可否の切り替え

### 3.2 クーポン管理
- クーポンの追加・編集・削除機能
- 顧客カテゴリ（新規・再来・全員など）の設定
- 画像アップロード機能
- 表示順序の管理
- 予約可否の切り替え

## 4. 予約システムとの連携

### 4.1 予約作成プロセス
1. ユーザーがメニューまたはクーポンを選択
2. システムはID形式を判断（数値→メニュー、UUID→クーポン）
3. 選択されたアイテムの価格と所要時間が予約に反映
4. 予約データには`menu_id`または`coupon_id`のいずれかが設定される

### 4.2 予約データにおける参照
- メニューとクーポンは別テーブルで管理
- 予約データ内では別フィールドに保存
- 取得時は`fetchMenuOrCouponInfo`関数等で共通処理

### 4.3 料金と時間への影響
- 選択されたメニュー/クーポンの価格が予約の支払い金額に反映
- メニュー/クーポンの所要時間が予約枠の計算に使用
- 支払い処理はメニュー/クーポンの金額に基づいて実行

## 5. 外部システム連携

### 5.1 サロンボード連携
- 予約データのサロンボードへの同期機能
- メニューデータのスクレイピングと同期機能
- クーポンデータのスクレイピングと同期機能

### 5.2 データ集計・レポート
- 売上明細でのメニュー/クーポン別集計
- 会計画面でのクーポン情報表示
- 顧客名、日付、スタッフ、メニュー項目でのフィルタリング

## 6. 関連ファイル

### 6.1 モデル定義
- `/src/types/menuItem.ts` - メニュー関連の型定義
- `/src/types/coupon.ts` - クーポン関連の型定義

### 6.2 API
- `/src/app/api/get-menu-items/route.ts` - メニュー一覧取得API
- `/src/app/api/post-menu-item/route.ts` - メニュー登録API
- `/src/app/api/update-menu-item/route.ts` - メニュー更新API
- `/src/app/api/delete-menu-item/route.ts` - メニュー削除API
- `/src/app/api/update-menu-item-reservable/route.ts` - メニュー予約可否切替API
- `/src/app/api/get-coupons/route.ts` - クーポン一覧取得API
- `/src/app/api/post-coupons/route.ts` - クーポン登録API
- `/src/app/api/delete-coupon/route.ts` - クーポン削除API
- `/src/app/api/update-coupon-reservable/route.ts` - クーポン予約可否切替API

### 6.3 管理UI
- `/src/sections/listing/menu/listing-menu-view.tsx` - メニュー管理画面
- `/src/sections/listing/coupon/coupon-settings-view.tsx` - クーポン管理画面
- `/src/components/CouponFormModal.tsx` - クーポン編集モーダル

### 6.4 同期機能
- `/scripts/menu/scrapeMenus.ts` - メニュースクレイピング
- `/scripts/menu/processMenuData.ts` - メニューデータ処理
- `/scripts/menu/save-menu.ts` - メニュー保存
- `/scripts/coupon/scrapeCoupons.ts` - クーポンスクレイピング
- `/scripts/coupon/processCouponData.ts` - クーポンデータ処理
- `/scripts/coupon/save-coupons.ts` - クーポン保存
- `/scripts/harotaro-to-salonboard/syncReseravtionToSalonboardHelpers.ts` - サロンボード同期

### 6.5 予約連携
- `/src/app/actions/menuActions.ts` - メニュー関連アクション
- `/src/app/actions/couponActions.ts` - クーポン関連アクション
- `/src/app/actions/reservationActions.ts` - 予約関連アクション

## 7. 技術的な考慮事項

- メニューIDは数値、クーポンIDはUUID形式という違いで内部的に区別
- 予約データにはメニューとクーポンの両方のIDフィールドがあり、どちらか一方のみが設定される
- 予約APIは統一的なインターフェースを維持するため、`menuId`パラメータで両方を受け付ける
- メニューとクーポンの選択時、価格と所要時間が自動的に予約データに組み込まれる
- クーポンはメニューと異なり、特定の顧客カテゴリを対象とすることができる