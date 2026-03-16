import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface TestResult {
  id: string;
  student_name: string;
  grade: number;
  subject: string;
  attempt: number;
  test_type: string;
  answers: Record<string, unknown>;
  attachments: Record<string, string>;
  cheat_log: string[];
  time_spent: number;
  created_at: string;
}

const Results = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      let query = supabase
        .from("test_results")
        .select("*")
        .order("created_at", { ascending: false });

      if (gradeFilter !== "all") {
        query = query.eq("grade", Number(gradeFilter));
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching results:", error);
      } else {
        setResults((data as unknown as TestResult[]) || []);
      }
      setLoading(false);
    };

    fetchResults();
  }, [gradeFilter]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Результаты тестов</h1>
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Класс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все классы</SelectItem>
              <SelectItem value="7">7 класс</SelectItem>
              <SelectItem value="8">8 класс</SelectItem>
              <SelectItem value="9">9 класс</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-12">Загрузка...</p>
        ) : results.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Нет результатов</p>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Ученик</TableHead>
                    <TableHead>Класс</TableHead>
                    <TableHead>Попытка</TableHead>
                    <TableHead>Время</TableHead>
                    <TableHead>Дата</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <Collapsible key={r.id} open={expandedId === r.id} onOpenChange={(open) => setExpandedId(open ? r.id : null)} asChild>
                      <>
                        <CollapsibleTrigger asChild>
                          <TableRow className="cursor-pointer">
                            <TableCell>
                              {expandedId === r.id ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{r.student_name}</TableCell>
                            <TableCell>{r.grade}</TableCell>
                            <TableCell>{r.attempt}</TableCell>
                            <TableCell>{r.time_spent ? formatTime(r.time_spent) : "—"}</TableCell>
                            <TableCell>{formatDate(r.created_at)}</TableCell>
                          </TableRow>
                        </CollapsibleTrigger>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={6} className="p-4 bg-muted/30">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground mb-2">Ответы:</h4>
                                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-96 text-foreground">
                                    {JSON.stringify(r.answers, null, 2)}
                                  </pre>
                                </div>
                                {r.attachments && Object.keys(r.attachments).length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-foreground mb-2">Файлы:</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(r.attachments).map(([key, url]) => (
                                        <a
                                          key={key}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-primary underline"
                                        >
                                          📎 Задача {key}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {r.cheat_log && r.cheat_log.length > 0 && (
                                  <div>
                                    <h4 className="font-semibold text-sm text-foreground mb-2">
                                      🛑 Античит ({r.cheat_log.length} событий):
                                    </h4>
                                    <ul className="text-xs space-y-1 text-muted-foreground">
                                      {r.cheat_log.map((entry, i) => (
                                        <li key={i}>• {entry}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Results;
