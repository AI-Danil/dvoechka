import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, MessageSquarePlus } from "lucide-react";

const QUIZ_TEMPLATE = `КВИЗ
Класс: 8
Предмет: физика
Название: Электричество. Базовые понятия
Время на вопрос (сек): 30
---
В1. Что такое сила тока?
А) поток электронов в секунду
Б) количество заряда, прошедшее в единицу времени  ✅
В) напряжение, делённое на сопротивление
Г) работа поля
---
В2. Единица измерения напряжения?
А) Ампер
Б) Ом
В) Вольт  ✅
Г) Ватт
---
(добавьте ещё вопросы по образцу — минимум 5)`;

const WRITTEN_TEMPLATE = `САМОСТОЯТЕЛЬНАЯ
Класс: 7
Предмет: технология
Название: Контрольная №3. Материаловедение
---
Задача 1 (2 балла).
Текст задачи здесь...
---
Задача 2 (1 балл).
Текст задачи здесь...
---
Задача 3 (3 балла).
Текст задачи здесь...
(можно прикреплять схемы / фото — учитель пришлёт отдельно)`;

export default function CreateTestViaChat() {
  const { toast } = useToast();
  const [tab, setTab] = useState("quiz");

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Скопировано", description: `${label} — вставьте в чат Lovable` });
    } catch {
      toast({ title: "Не удалось скопировать", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          Создать тест (через чат)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Скопируйте подходящий шаблон, заполните вопросами и пришлите его в чат Lovable.
          Тест будет добавлен в систему и появится у учеников выбранного класса/предмета.
        </p>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quiz">Квиз (тест с вариантами)</TabsTrigger>
            <TabsTrigger value="written">Самостоятельная (письменная)</TabsTrigger>
          </TabsList>

          <TabsContent value="quiz" className="space-y-2">
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
              {QUIZ_TEMPLATE}
            </pre>
            <Button size="sm" onClick={() => copy(QUIZ_TEMPLATE, "Шаблон квиза")}>
              <Copy className="h-4 w-4 mr-2" /> Скопировать шаблон квиза
            </Button>
            <p className="text-xs text-muted-foreground">
              Правильный вариант пометьте галочкой ✅ в конце строки. Время на вопрос — обычно 20–30 сек.
            </p>
          </TabsContent>

          <TabsContent value="written" className="space-y-2">
            <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto whitespace-pre-wrap font-mono">
              {WRITTEN_TEMPLATE}
            </pre>
            <Button size="sm" onClick={() => copy(WRITTEN_TEMPLATE, "Шаблон самостоятельной")}>
              <Copy className="h-4 w-4 mr-2" /> Скопировать шаблон самостоятельной
            </Button>
            <p className="text-xs text-muted-foreground">
              Каждая задача — с баллами в скобках. Ученик сможет писать ответ и прикреплять фото.
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
