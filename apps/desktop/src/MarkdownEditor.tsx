import { createProseEditor, type FormatState, type ProseEditorHandle } from "@verne/editor";
import { useEffect, useRef } from "react";

interface MarkdownEditorProps {
  /** Cuerpo Markdown inicial. El componente se monta con key=ruta del doc. */
  initialBody: string;
  onReady: (handle: ProseEditorHandle) => void;
  onDocChanged: () => void;
  onFormatStateChanged: (state: FormatState) => void;
}

/** Puente React → @verne/editor. Sin ProseMirror aquí: solo la API pública. */
export function MarkdownEditor({
  initialBody,
  onReady,
  onDocChanged,
  onFormatStateChanged,
}: MarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onReady, onDocChanged, onFormatStateChanged });
  callbacksRef.current = { onReady, onDocChanged, onFormatStateChanged };

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;
    const handle = createProseEditor({
      parent,
      initialMarkdown: initialBody,
      onDocChanged: () => callbacksRef.current.onDocChanged(),
      onFormatStateChanged: (state) => callbacksRef.current.onFormatStateChanged(state),
    });
    callbacksRef.current.onReady(handle);
    handle.focus();
    return () => handle.destroy();
    // Montaje único por documento: el padre nos remonta con key={path}.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="editor-surface" />;
}
