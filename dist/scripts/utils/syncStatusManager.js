// scripts/utils/syncStatusManager.js

const syncStatusMap = new Map();

/**
 * ユーザーの同期ステータスを設定します。
 * @param {string} userId - ユーザーID
 * @param {string} status - ステータス ('idle', 'syncing', 'completed', 'error')
 */
function setSyncStatus(userId, status) {
  syncStatusMap.set(userId, status);
}

/**
 * ユーザーの同期ステータスを取得します。
 * @param {string} userId - ユーザーID
 * @returns {string} ステータス
 */
function getSyncStatus(userId) {
  return syncStatusMap.get(userId) || "idle";
}

/**
 * ユーザーの同期ステータスをクリアします。
 * @param {string} userId - ユーザーID
 */
function clearSyncStatus(userId) {
  syncStatusMap.delete(userId);
}

module.exports = {
  setSyncStatus,
  getSyncStatus,
  clearSyncStatus,
};
