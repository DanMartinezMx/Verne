import type { TreeNode } from "@verne/core";

/** Decoración opcional por ruta: punto de color de estado y pista textual. */
export interface TreeDecoration {
  dotColor?: string;
  hint?: string;
}

export interface ProjectTreeProps {
  nodes: TreeNode[];
  selectedPath?: string | undefined;
  onSelect?: (node: TreeNode) => void;
  decorations?: Record<string, TreeDecoration>;
}

/**
 * Árbol de contenido de un proyecto. Componente de presentación puro:
 * recibe el árbol ya leído por core y no sabe nada de archivos.
 */
export function ProjectTree({ nodes, selectedPath, onSelect, decorations }: ProjectTreeProps) {
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
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  selectedPath,
  onSelect,
  decorations,
}: {
  node: TreeNode;
  selectedPath?: string | undefined;
  onSelect?: ((node: TreeNode) => void) | undefined;
  decorations?: Record<string, TreeDecoration> | undefined;
}) {
  const isFolder = node.kind === "folder";
  const isSelected = node.path === selectedPath;
  const decoration = decorations?.[node.path];
  return (
    <li role="treeitem" aria-expanded={isFolder ? true : undefined} aria-selected={isSelected}>
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
      {isFolder && node.children && node.children.length > 0 && (
        <ul role="group" className="tree tree--nested">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              decorations={decorations}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
