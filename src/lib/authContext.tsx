"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
// ↑ このファイルで使う SupabaseClient (anon key) を import しておく

// --------------------------------------------------
// 1) Context の型定義
// --------------------------------------------------
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshAuthState: () => Promise<void>;
}

// --------------------------------------------------
// 2) Context を作成
// --------------------------------------------------
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshAuthState: async () => {},
});

// --------------------------------------------------
// 3) Provider 用の Props 型
// --------------------------------------------------
interface AuthProviderProps {
  children: ReactNode; // 子要素を持つ
}

// --------------------------------------------------
// 4) AuthProvider コンポーネント
// --------------------------------------------------
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 初回セッション取得
    async function getInitialSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      console.log("getInitialSession result:", session, error);
      if (mounted) {
        if (session) {
          setUser(session.user);
          setSession(session);
        }
        setLoading(false);
      }
    }
    getInitialSession();

    // Auth State変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 任意で呼び出してセッションを更新するメソッド
  const refreshAuthState = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setSession(session);
    } else {
      setUser(null);
      setSession(null);
    }
  }, []);

  // ここで Context に渡すプロパティを定義
  const providerValue: AuthContextType = {
    user,
    session,
    loading,
    refreshAuthState,
  };

  // return の直後に余計なコードや記述ミスがないか確認
  return (
    <AuthContext.Provider value={providerValue}>
      {children}
    </AuthContext.Provider>
  );
}

// --------------------------------------------------
// 5) useAuth フック (context を参照)
// --------------------------------------------------
export function useAuth() {
  return useContext(AuthContext);
}
