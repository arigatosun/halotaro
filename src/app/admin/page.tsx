// app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

const AdminPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ユーザー一覧の取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();

        if (res.ok) {
          setUsers(data.users);
        } else {
          console.error('Error fetching users:', data.error);
          setError(data.error || 'ユーザーの取得に失敗しました。');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('ユーザーの取得中にエラーが発生しました。');
      }
    };

    fetchUsers();
  }, []);

  // ユーザー情報の更新
  const handleUpdateUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUserId,
          email: newEmail || undefined,
          password: newPassword || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('ユーザー情報が更新されました。');
        setNewEmail('');
        setNewPassword('');
        // 必要に応じてユーザーリストを再取得
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === data.user.id ? { ...user, email: data.user.email } : user
          )
        );
      } else {
        console.error('Error updating user:', data.error);
        setError(data.error || 'ユーザーの更新に失敗しました。');
      }
    } catch (err) {
      console.error('Error updating user:', err);
      setError('ユーザーの更新中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>管理者用ユーザー管理ページ</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <select
        value={selectedUserId}
        onChange={(e) => setSelectedUserId(e.target.value)}
        style={{ padding: '0.5rem', marginBottom: '1rem' }}
      >
        <option value="">ユーザーを選択してください</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.email}
          </option>
        ))}
      </select>

      {selectedUserId && (
        <div>
          <h2>ユーザー情報の更新</h2>
          <input
            type="email"
            placeholder="新しいメールアドレス"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            style={{ display: 'block', padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
          />
          <input
            type="password"
            placeholder="新しいパスワード"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ display: 'block', padding: '0.5rem', marginBottom: '1rem', width: '100%' }}
          />
          <button onClick={handleUpdateUser} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
