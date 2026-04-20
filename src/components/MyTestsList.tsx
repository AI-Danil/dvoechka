import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Eye, EyeOff, Pencil } from "lucide-react";
import TestPreview from "@/components/TestPreview";

interface Row {
  id: string;
  title: string;
  kind: "quiz" | "written";
  status: "draft" | "published";
  created_at: string;
  class: { name: string; year: number } | null;
  subject: { name: string } | null;
}

interface Props {
  isAdmin?: boolean;
  refreshKey?: number;
}

export default function MyTestsList({ isAdmin = false, refreshKey = 0 }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [bump, setBump] = useState(0);

  const load = async () => {
    if (!user) return;
    let q = supabase
      .from("tests")
      .select("id, title, kind, status, created_at, class:classes(name,year), subject:subjects(name)")
      .order("created_at", { ascending: false });
    if (!isAdmin) q = q.eq("author_user_id", user.id);
    const { data } = await q;
    setRows((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, [user, refreshKey, bump]);

  const togglePublish = async (r: Row) => {
    const action = r.status === "published" ? "unpublish" : "publish";
    const { data, error } = await supabase.functions.invoke("publish-test", {
      body: { test_id: r.id, action },
    });
    if (error || !(data as any)?.ok) {
      toast({
        title: "Ошибка",
        description: (data as any)?.error ?? error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: action === "publish" ? "Опубликован" : "Снят с публикации" });
    setBump((x) => x + 1);
  };

  const remove = async (r: Row) => {
    if (!confirm(`Удалить «${r.title}»?`)) return;
    const { data, error } = await supabase.functions.invoke("delete-test", {
      body: { test_id: r.id },
    });
    if (error || !(data as any)?.ok) {
      toast({ title: "Ошибка", description: (data as any)?.error ?? error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Удалено" });
    setBump((x) => x + 1);
  };

  if (editing) {
    return <TestPreview testId={editing} onClose={() => { setEditing(null); setBump((x) => x + 1); }} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isAdmin ? "Все тесты" : "Мои тесты"}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Тестов пока нет.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 border rounded-md p-3"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.kind === "quiz" ? "Квиз" : "Самостоятельная"} ·{" "}
                    {r.class ? `${r.class.name} (${r.class.year})` : "—"} ·{" "}
                    {r.subject?.name ?? "—"} ·{" "}
                    {new Date(r.created_at).toLocaleDateString("ru-RU")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "published" ? "default" : "secondary"}>
                    {r.status === "published" ? "Опубликован" : "Черновик"}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setEditing(r.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublish(r)}>
                    {r.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
