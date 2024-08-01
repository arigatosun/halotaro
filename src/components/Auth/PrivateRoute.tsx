import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function PrivateRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  return children;
}
