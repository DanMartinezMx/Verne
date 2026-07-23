import type { BlueprintId } from "@verne/core";

/** Estado del flujo de trabajo de un documento (campo `estado` del frontmatter). */
export interface WorkflowState {
  id: string;
  label: string;
  /** Color del indicador en la UI (hex). */
  color: string;
}

/**
 * Definición de un Blueprint (RFC-0001 §10, versión M2): configura vocabulario,
 * estados, plantillas y colecciones de un tipo de proyecto. En el futuro será
 * un paquete instalable; hoy es configuración tipada del monorepo.
 */
export interface BlueprintDef {
  id: BlueprintId;
  label: string;
  vocabulary: {
    /** "entrada" / "cuento" */
    documentSingular: string;
    /** "Entradas" / "Cuentos" */
    documentPlural: string;
    /** Placeholder del creador: "Nueva entrada…" */
    newDocumentPlaceholder: string;
  };
  states: WorkflowState[];
  /** Estado con el que nacen los documentos nuevos. */
  initialState: string;
  starterDocument: { fileName: string; contents: string };
  /** Los documentos nuevos se nombran con la fecha del día (diario). */
  dailyNaming?: boolean;
  /** El Blueprint de cuentos activa el registro de envíos (colección VPF). */
  submissions?: {
    collection: string;
    schemaYaml: string;
    responses: { id: string; label: string }[];
  };
}
