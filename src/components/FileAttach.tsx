import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";

interface FileAttachProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

const FileAttach = ({ file, onFileChange }: FileAttachProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.py,.txt,.pdf"
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
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
          <button onClick={() => onFileChange(null)} className="text-muted-foreground hover:text-destructive">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileAttach;
