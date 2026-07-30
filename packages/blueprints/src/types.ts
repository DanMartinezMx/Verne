/** Estado del flujo de trabajo de un documento (campo `estado` del frontmatter). */
export interface WorkflowState {
  id: string;
  label: string;
  /** Color del indicador en la UI (hex). */
  color: string;
}

/**
 * Qué ofrece el panel de exportación de un espacio (RFC-0003 §2).
 * "cms" da HTML/Markdown limpio y el `.md` con su frontmatter tal cual, que es
 * lo que un generador de sitios necesita.
 */
export type ExportProfileId = "cms" | "manuscrito-docx";

/**
 * Una plantilla es un archivo Markdown (RFC-0003 §4, D13). Estas se siembran en
 * `plantillas/` al crear el espacio y a partir de ahí son del usuario: la app
 * lee siempre del disco, nunca de aquí.
 */
export interface TemplateDef {
  /** Nombre del archivo en `plantillas/` (sin `.md`). */
  id: string;
  label: string;
  /** Cuerpo con frontmatter. `{{title}}` y `{{fecha}}` se sustituyen al crear. */
  contents: string;
}

/** Un campo de ficha: da la columna del panel y la línea del `_schema.yaml`. */
export interface CollectionFieldDef {
  key: string;
  label: string;
  /** "document" guarda la ruta relativa de un documento del proyecto. */
  type: "string" | "date" | "enum" | "document";
  /** Valores admitidos cuando `type` es "enum" (el panel los pone en un select). */
  values?: string[];
  /**
   * Solo para "enum": al elegir un valor distinto del primero, sella la fecha de
   * hoy en este otro campo; al volver al primero, la borra. Es lo que hace que
   * marcar un envío como aceptado anote la fecha sin que nadie la escriba.
   */
  stampDateField?: string;
}

/**
 * Una colección del espacio (`colecciones/<name>/`), sobre la primitiva de core.
 *
 * ponytail: los campos se declaran UNA vez y el `_schema.yaml` se genera con
 * `collectionSchemaYaml`. Tener las columnas del panel y el esquema escritos a
 * mano por separado era garantía de que un día dejaran de coincidir.
 */
export interface CollectionDef {
  name: string;
  label: string;
  /** Comentario que encabeza el `_schema.yaml` generado. */
  description: string;
  fields: CollectionFieldDef[];
}

/**
 * Campo de frontmatter editable en la cabecera del documento, más allá de
 * `title` y `estado` (que los necesita toda la app y siempre están).
 *
 * Es la pieza que permite a un espacio hablar el esquema de su destino —el
 * `draft` de un generador de sitios, el `image` de un blog— sin que la app
 * aprenda nada sobre ese destino (RFC-0003 §5, D14).
 */
export interface MetaFieldDef {
  /** Clave exacta en el frontmatter. */
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "list" | "boolean" | "number";
  /**
   * Valores INICIALES de un campo de lista cerrada. Se copian al `verne.yaml`
   * del proyecto al crearlo (`options.<key>`) y desde ese momento los manda el
   * usuario: los edita desde la cabecera o en el archivo.
   *
   * El campo se edita marcando opciones en lugar de escribiendo, así que un
   * valor mal escrito —el que rompe el build de un sitio que valida categorías—
   * deja de ser posible en lugar de quedar para una validación posterior.
   */
  options?: readonly string[];
  /** Se rellena al crear el documento (`date` → ahora en ISO). */
  autoOnCreate?: boolean;
  /**
   * Se recalcula desde `estado` en el mismo guardado que el estado. Es la razón
   * de que los espacios sean TypeScript y no YAML: una derivación es código.
   */
  derivedFromState?: (estado: string) => unknown;
  placeholder?: string;
}

/** Identidad visual del espacio. Se aplica como variables CSS sobre el tema. */
export interface SpaceTheme {
  /** Acento en tema claro (hex). */
  accent: string;
  /**
   * Acento en tema oscuro (hex). Un solo color no sirve para los dos temas: el
   * índigo que se lee bien sobre blanco se apaga sobre negro.
   */
  accentDark: string;
  /** Fuente del editor: novela en serif, guion en monoespaciada. */
  editorFont: "serif" | "sans" | "mono";
}

/**
 * Definición de un espacio (RFC-0001 §10, contrato de RFC-0003 §2): configura
 * vocabulario, estados, plantillas, colecciones, campos de frontmatter, estilo
 * y herramientas de un tipo de proyecto.
 *
 * En el futuro será un paquete instalable; hoy es configuración tipada del
 * monorepo. La UI no debe contener ni un `if` por `id`: lo que un espacio tiene
 * se declara aquí.
 */
export interface BlueprintDef {
  /**
   * Coincide con el campo `blueprint` del manifiesto. Es `string` y no la unión
   * cerrada porque el espacio de reserva no es un id creable; el test que
   * recorre `BLUEPRINT_IDS` comprueba que los demás sí coinciden.
   */
  id: string;
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
  theme: SpaceTheme;
  exportProfiles: ExportProfileId[];
  /**
   * Extensión con la que el perfil "cms" guarda el archivo. Verne siempre
   * escribe `.md` en el proyecto (es lo que dice VPF), pero el destino puede
   * querer otra: el sitio del maintainer solo renderiza `.mdx` y rechaza `.md`
   * en su validación de contenido. Por defecto, "md".
   */
  cmsExtension?: string;
  templates: TemplateDef[];
  /** Colecciones del espacio. Vacío = el espacio no tiene fichas. */
  collections: CollectionDef[];
  /** Campos de frontmatter propios del espacio, además de title y estado. */
  metaFields: MetaFieldDef[];
  /**
   * Campo del que salen las etiquetas para la búsqueda global. "tags" por
   * defecto; el blog usa "categories" porque su sitio lo exige.
   */
  tagsField?: string;
  /** Carpetas que se crean bajo `contenido/` al nacer el espacio. */
  scaffold?: string[];
  /** Cómo se nombra un documento nuevo. "fecha" da orden cronológico. */
  naming?: "slug" | "fecha";
  /**
   * El espacio es UNA obra larga repartida en documentos (una novela), no un
   * conjunto de piezas independientes (un blog). Activa el panel Manuscrito:
   * avance sobre la meta y compilación a un solo documento.
   *
   * ponytail: sustituye a una lista `panels` declarada aparte. Derivar la
   * herramienta de lo que el espacio *es* evita el error de declarar un panel y
   * olvidar los datos que necesita. El panel de colecciones sale, igual, de que
   * `collections` no esté vacío.
   */
  manuscript?: { defaultTarget: number };
}
