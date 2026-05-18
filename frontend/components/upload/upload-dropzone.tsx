"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  accept?: string;
  maxBytes?: number;
}

export function UploadDropzone({
  onFile,
  disabled = false,
  accept = ".csv",
  maxBytes = 10 * 1024 * 1024, // 10MB — matches backend MAX_UPLOAD_SIZE
}: UploadDropzoneProps) {
  const [localError, setLocalError] = useState<string | null>(null);

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setLocalError(null);
      if (rejections.length > 0) {
        const first = rejections[0];
        setLocalError(first.errors[0]?.message ?? "File rejected");
        return;
      }
      if (accepted[0]) {
        onFile(accepted[0]);
      }
    },
    [onFile],
  );

  const { getRootProps, getInputProps, isDragActive, isFocused } = useDropzone({
    onDrop,
    accept: { "text/csv": [accept] },
    maxFiles: 1,
    maxSize: maxBytes,
    disabled,
    multiple: false,
  });

  return (
    <div className="flex flex-col gap-3">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center",
          "border border-dashed border-border bg-card px-8 py-14 text-center",
          "transition-colors duration-200",
          isDragActive && "border-primary bg-status-valid-tint",
          isFocused && "outline-hidden ring-1 ring-ring",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />

        {/* Decorative corner ticks — the journal layout hint. */}
        <span className="absolute left-2 top-2 size-3 border-l border-t border-border" aria-hidden />
        <span className="absolute right-2 top-2 size-3 border-r border-t border-border" aria-hidden />
        <span className="absolute bottom-2 left-2 size-3 border-b border-l border-border" aria-hidden />
        <span className="absolute bottom-2 right-2 size-3 border-b border-r border-border" aria-hidden />

        <Upload
          aria-hidden
          className={cn(
            "mb-4 size-7 text-muted-foreground transition-transform duration-200",
            isDragActive && "scale-110 text-primary",
          )}
          strokeWidth={1.25}
        />
        <p className="font-display font-semibold text-lg leading-tight text-foreground">
          {isDragActive ? "Drop to open the review modal" : "Drop a CSV here"}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          or click to select a file from your computer
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          .csv · up to 10 MB
        </p>
      </div>

      {localError && (
        <div
          role="alert"
          className="flex items-start gap-2 border border-status-error/40 bg-status-error-tint px-3 py-2.5 text-sm"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 status-error" />
          <span className="text-foreground">{localError}</span>
        </div>
      )}
    </div>
  );
}

interface SelectedFileChipProps {
  file: File;
  onClear: () => void;
}

/** Small inline strip shown above the dropzone once a file is picked. */
export function SelectedFileChip({ file, onClear }: SelectedFileChipProps) {
  return (
    <div className="flex items-center justify-between border border-border bg-secondary px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="truncate font-mono text-sm">{file.name}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {(file.size / 1024).toFixed(1)} KB
        </span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
