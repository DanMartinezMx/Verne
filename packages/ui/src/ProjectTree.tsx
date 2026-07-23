import type { TreeNode } from "@verne/core";
import { useState } from "react";

/** Decoración opcional por ruta: punto de color de estado y pista textual. */
export interface TreeDecoration {
  dotColor?: string;
  hint?: string;
}

/** Una carpeta destino para el menú de "mover": ruta y etiqueta ya sangrada. */
export interface FolderOption {
  path: string;
  label: string;
}

export interface ProjectTreeProps {
  nodes: TreeNode[];
  selectedPath?: string | undefined;
  onSelect?: (node: TreeNode) => void;
  decorations?: Record<string, TreeDecoration>;
  /** Carpetas destino disponibles (incluida la raíz) para mover elementos. */
  folders?: FolderOption[];
  onRename?: (node: TreeNode, newName: string) => void;
  onMove?: (node: TreeNode, targetDir: string) => void;
}

/**
 * Árbol de contenido de un proyecto. Componente de presentación: recibe el
 * árbol ya leído por core y no toca archivos. Si le pasan callbacks de
 * organización, muestra acciones de renombrar y mover al pasar el cursor.
 */
export function ProjectTree({
  nodes,
  selectedPath,
  onSelect,
  decorations,
  folders,
  onRename,
  onMove,
}: ProjectTreeProps) {
  if (nodes.length === 0) {
    return <p className="tree-empty">Este proyecto aún no tiene documentos.</p>;
  }
  return (
    <ul className="tree" role="tree">
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          decorations={decorations}
          folders={folders}
          onRename={onRename}
          onMove={onMove}
        />
      ))}
    </ul>
  );
}

function parentOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? path : path.slice(0, i);
}

function TreeItem({
  node,
  selectedPath,
  onSelect,
  decorations,
  folders,
  onRename,
  onMove,
}: {
  node: TreeNode;
  selectedPath?: string | undefined;
  onSelect?: ((node: TreeNode) => void) | undefined;
  decorations?: Record<string, TreeDecoration> | undefined;
  folders?: FolderOption[] | undefined;
  onRename?: ((node: TreeNode, newName: string) => void) | undefined;
  onMove?: ((node: TreeNode, targetDir: string) => void) | undefined;
}) {
  const isFolder = node.kind === "folder";
  const isSelected = node.path === selectedPath;
  const decoration = decorations?.[node.path];
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(node.name);

  const canOrganize = Boolean(onRename || onMove);
  // Destinos válidos: ni la carpeta actual, ni (para carpetas) uno mismo o un hijo.
  const moveTargets = (folders ?? []).filter(
    (f) =>
      f.path !== parentOf(node.path) &&
      f.path !== node.path &&
      !(isFolder && f.path.startsWith(`${node.path}/`)),
  );

  function commitRename() {
    const clean = draft.trim();
    setRenaming(false);
    if (clean !== "" && clean !== node.name) onRename?.(node, clean);
    else setDraft(node.name);
  }

  return (
    <li role="treeitem" aria-expanded={isFolder ? true : undefined} aria-selected={isSelected}>
      <div className="tree-row">
        {renaming ? (
          <input
            className="tree-rename"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              else if (e.key === "Escape") {
                setDraft(node.name);
                setRenaming(false);
              }
            }}
            aria-label={`Renombrar ${node.name}`}
          />
        ) : (
          <button
            type="button"
            className={`tree-item tree-item--${node.kind}${isSelected ? " tree-item--selected" : ""}`}
            onClick={() => onSelect?.(node)}
            title={decoration?.hint}
          >
            <span aria-hidden="true" className="tree-item-icon">
              {isFolder ? "📁" : "📄"}
            </span>
            <span className="tree-item-name">{node.name}</span>
            {decoration?.dotColor && (
              <span
                aria-hidden="true"
                className="tree-item-dot"
                style={{ backgroundColor: decoration.dotColor }}
              />
            )}
          </button>
        )}

        {canOrganize && !renaming && (
          <span className="tree-actions">
            {onRename && (
              <button
                type="button"
                className="tree-action"
                title="Renombrar"
                aria-label={`Renombrar ${node.name}`}
                onClick={() => {
                  setDraft(node.name);
                  setRenaming(true);
                }}
              >
                ✎
              </button>
            )}
            {onMove && moveTargets.length > 0 && (
              <select
                className="tree-move"
                title="Mover a…"
                aria-label={`Mover ${node.name} a otra carpeta`}
                value=""
                onChange={(e) => {
                  if (e.target.value) onMove(node, e.target.value);
                }}
              >
                <option value="">Mover…</option>
                {moveTargets.map((f) => (
                  <option key={f.path} value={f.path}>
                    {f.label}
                  </option>
                ))}
              </select>
            )}
          </span>
        )}
      </div>

      {isFolder && node.children && node.children.length > 0 && (
        <ul role="group" className="tree tree--nested">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              decorations={decorations}
              folders={folders}
              onRename={onRename}
              onMove={onMove}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
