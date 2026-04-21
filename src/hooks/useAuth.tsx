import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "teacher" | "student";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string | undefined) => {
    if (!uid) {
      setRoles([]);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as Role));
  };

  useEffect(() => {
    let currentUid: string | undefined;
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      const newUid = s?.user?.id;
      // На TOKEN_REFRESHED / USER_UPDATED не пересоздаём user-объект и не показываем loading,
      // иначе все потребители useAuth перерендерятся при возврате во вкладку и зависимые
      // эффекты (загрузка тестов, подписки) перезапустятся — выглядит как «перезагрузка».
      if (newUid !== currentUid) {
        currentUid = newUid;
        setUser(s?.user ?? null);
        setLoading(true);
        setTimeout(() => {
          loadRoles(newUid).finally(() => setLoading(false));
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      currentUid = data.session?.user?.id;
      setUser(data.session?.user ?? null);
      loadRoles(currentUid).finally(() => setLoading(false));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
  };

  const refreshRoles = async () => loadRoles(user?.id);

  return (
    <Ctx.Provider value={{ user, session, roles, loading, signOut, refreshRoles }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
