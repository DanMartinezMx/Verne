import { createProseEditor, type ProseEditorHandle } from "@verne/editor";
import { useEffect, useRef } from "react";

interface MarkdownEditorProps {
  /** Cuerpo Markdown inicial. El componente se monta con key=ruta del doc. */
  initialBody: string;
  onReady: (handle: ProseEditorHandle) => void;
  onDocChanged: () => void;
}

/** Puente React → @verne/editor. Sin ProseMirror aquí: solo la API pública. */
export function MarkdownEditor({ initialBody, onReady, onDocChanged }: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onReady, onDocChanged });
  callbacksRef.current = { onReady, onDocChanged };

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const handle = createProseEditor({
      parent,
      initialMarkdown: initialBody,
      onDocChanged: () => callbacksRef.current.onDocChanged(),
    });
    callbacksRef.current.onReady(handle);
    handle.focus();
    return () => handle.destroy();
    // Montaje único por documento: el padre nos remonta con key={path}.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="editor-surface" />;
}
