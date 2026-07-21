import type { TreeNode } from "@verne/core";

export interface ProjectTreeProps {
  nodes: TreeNode[];
  selectedPath?: string | undefined;
  onSelect?: (node: TreeNode) => void;
}

/**
 * Árbol de contenido de un proyecto. Componente de presentación puro:
 * recibe el árbol ya leído por core y no sabe nada de archivos.
 */
export function ProjectTree({ nodes, selectedPath, onSelect }: ProjectTreeProps) {
  if (nodes.length === 0) {
    return <p className="tree-empty">Este proyecto aún no tiene documentos.</p>;
  }
  return (
    <ul className="tree" role="tree">
      {nodes.map((node) => (
        <TreeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  selectedPath?: string | undefined;
  onSelect?: ((node: TreeNode) => void) | undefined;
}) {
  const isFolder = node.kind === "folder";
  const isSelected = node.path === selectedPath;
  return (
    <li role="treeitem" aria-expanded={isFolder ? true : undefined} aria-selected={isSelected}>
      <button
        type="button"
        className={`tree-item tree-item--${node.kind}${isSelected ? " tree-item--selected" : ""}`}
        onClick={() => onSelect?.(node)}
      >
        <span aria-hidden="true" className="tree-item-icon">
          {isFolder ? "📁" : "📄"}
        </span>
        {node.name}
      </button>
      {isFolder && node.children && node.children.length > 0 && (
        <ul role="group" className="tree tree--nested">
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}
