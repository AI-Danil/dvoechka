import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileAttachProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 МБ

// Whitelist допустимых файлов:
// - изображения (image/*)
// - PDF
// - текст (.txt, .py — у них часто пустой/text/plain MIME)
const ALLOWED_MIME_PREFIXES = ["image/"];
const ALLOWED_MIME_EXACT = ["application/pdf", "text/plain", "text/x-python", ""];
const ALLOWED_EXTENSIONS = [".py", ".txt", ".pdf"];

const isAllowedFile = (file: File): boolean => {
  if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  if (ALLOWED_MIME_EXACT.includes(file.type)) {
    // Если MIME пустой — проверим по расширению
    if (file.type === "") {
      const lower = file.name.toLowerCase();
      return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
    }
    return true;
  }
  return false;
};

const FileAttach = ({ file, onFileChange }: FileAttachProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (selected: File | null) => {
    if (!selected) {
      onFileChange(null);
      return;
    }

    if (!isAllowedFile(selected)) {
      toast({
        title: "⛔ Недопустимый тип файла",
        description: "Разрешены только изображения, PDF и текстовые файлы (.txt, .py).",
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      const sizeMb = (selected.size / 1024 / 1024).toFixed(1);
      toast({
        title: "⛔ Файл слишком большой",
        description: `Размер ${sizeMb} МБ. Максимум — 5 МБ.`,
        variant: "destructive",
      });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    onFileChange(selected);
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.py,.txt,.pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        className="gap-1"
      >
        <Paperclip className="h-3.5 w-3.5" />
        Прикрепить файл
      </Button>
      {file && (
        <div className="flex items-center gap-2 text-sm bg-muted px-2 py-1 rounded">
          {file.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt="preview"
              className="h-8 w-8 object-cover rounded"
            />
          ) : null}
          <span className="max-w-[150px] truncate">{file.name}</span>
          <button
            onClick={() => handleFile(null)}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      <span className="text-xs text-muted-foreground">до 5 МБ</span>
    </div>
  );
};

export default FileAttach;
