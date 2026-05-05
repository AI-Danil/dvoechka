import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, roles, loading } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [showSeed, setShowSeed] = useState(false);

  useEffect(() => {
    // Показывать кнопку сидера если ещё нет учителей.
    // Анонимный SELECT не пройдёт RLS, поэтому пробуем через edge: если 403 — учителя уже есть.
    // Простой эвристический подход: вызываем head-запрос к teachers через anon — вернёт пусто и не упадёт.
    (async () => {
      const { count } = await supabase
        .from("teachers")
        .select("*", { count: "exact", head: true });
      // Anon из-за RLS получит count=null или 0. Чтобы знать наверняка — не критично, кнопку покажем всегда,
      // edge сам вернёт 403 если уже есть.
      setShowSeed(true);
      void count;
    })();
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    if (roles.includes("admin")) navigate("/admin/dashboard", { replace: true });
    else if (roles.includes("teacher")) navigate("/teacher/dashboard", { replace: true });
    else if (roles.includes("student")) navigate("/student/dashboard", { replace: true });
    else navigate("/account", { replace: true });
  }, [user, roles, loading, navigate]);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) toast({ title: "Не удалось войти", description: error.message, variant: "destructive" });
  };

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth` },
    });
    setBusy(false);
    if (error) toast({ title: "Не удалось зарегистрироваться", description: error.message, variant: "destructive" });
    else toast({ title: "Готово", description: "Аккаунт создан. Если нужно — войдите." });
  };

  const onSeedTeacher = async () => {
    setSeedBusy(true);
    const { data, error } = await supabase.functions.invoke("seed-teacher", { body: {} });
    setSeedBusy(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Не удалось создать учителя",
        description: (data as any)?.error ?? error?.message ?? "Возможно, учитель уже создан",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Тестовый учитель создан",
        description: "Teatcher01@test.ru / Teatcher01",
      });
      setEmail("Teatcher01@test.ru");
      setPassword("Teatcher01");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle>Вход в систему</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Вход</TabsTrigger>
              <TabsTrigger value="signup">Регистрация</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Пароль</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "…" : "Войти"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-3 pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Пароль</Label>
                  <Input id="password2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "…" : "Создать аккаунт"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {showSeed && (
            <div className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onSeedTeacher}
                disabled={seedBusy}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {seedBusy ? "Создаём…" : "Создать тестового учителя"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Работает один раз, пока учителей нет в системе
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
