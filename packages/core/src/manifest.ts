import { parse, stringify } from "yaml";
import { VerneError } from "./errors.js";

/** Versión del formato VPF que esta versión de core escribe y entiende. */
export const VPF_VERSION = "0.1";

export const BLUEPRINT_IDS = ["blog", "cuento", "guion", "podcast", "diario"] as const;
export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

/** ¿Es un tipo de espacio que esta versión conoce? */
export function isKnownBlueprint(id: string): id is BlueprintId {
  return (BLUEPRINT_IDS as readonly string[]).includes(id);
}

export interface ProjectManifest {
  /** Versión de la especificación VPF (docs/spec/vpf). */
  vpf: string;
  name: string;
  /**
   * Tipo de espacio. Es `string` y no la unión cerrada a propósito: un valor
   * desconocido se preserva y la app cae a un espacio genérico, para que un
   * proyecto creado por una versión futura se pueda abrir y leer
   * (RFC-0003 §7.1). Usa `isKnownBlueprint` para distinguirlos.
   */
  blueprint: string;
  /** Código BCP 47, p. ej. "es" o "es-MX". */
  language: string;
  /** Fecha de creación en ISO 8601. */
  createdAt: string;
  /** Nombre del autor (para exportaciones). */
  author?: string;
  /**
   * Valores admitidos por campo de frontmatter, por clave del campo. El espacio
   * declara la FORMA (que el blog tiene categorías); el proyecto declara los
   * VALORES (cuáles son las tuyas). Nacen de los que sugiere el espacio y a
   * partir de ahí son del usuario: añadir o quitar es editar esta lista, aquí o
   * desde la app.
   *
   * Sigue siendo una lista cerrada dentro del proyecto, que es lo que evita la
   * categoría mal escrita que rompe el sitio destino.
   */
  options?: Record<string, string[]>;
}

export function parseManifest(text: string): ProjectManifest {
  let raw: unknown;
  try {
    raw = parse(text);
  } catch {
    throw new VerneError("INVALID_MANIFEST", "verne.yaml no es YAML válido");
  }
  if (typeof raw !== "object" || raw === null) {
    throw new VerneError("INVALID_MANIFEST", "verne.yaml no contiene un objeto");
  }
  const m = raw as Record<string, unknown>;
  const vpf = typeof m["vpf"] === "number" ? String(m["vpf"]) : m["vpf"];
  if (typeof vpf !== "string") {
    throw new VerneError("INVALID_MANIFEST", "verne.yaml no declara el campo obligatorio 'vpf'");
  }
  if (vpf.split(".")[0] !== VPF_VERSION.split(".")[0]) {
    throw new VerneError(
      "UNSUPPORTED_VPF_VERSION",
      `Este proyecto usa VPF ${vpf}; esta versión de Verne entiende VPF ${VPF_VERSION}`,
    );
  }
  if (typeof m["name"] !== "string" || m["name"].trim() === "") {
    throw new VerneError("INVALID_MANIFEST", "verne.yaml no declara un 'name' válido");
  }
  // Un tipo desconocido NO es un error: se preserva y la app usa el espacio de
  // reserva (RFC-0003 §7.1). Lo que sigue siendo error es que falte o esté vacío.
  const blueprint = m["blueprint"];
  if (typeof blueprint !== "string" || blueprint.trim() === "") {
    throw new VerneError("INVALID_MANIFEST", "verne.yaml no declara un 'blueprint' válido");
  }
  const manifest: ProjectManifest = {
    vpf,
    name: m["name"],
    blueprint,
    language: typeof m["language"] === "string" ? m["language"] : "es",
    createdAt: typeof m["createdAt"] === "string" ? m["createdAt"] : "",
  };
  if (typeof m["author"] === "string" && m["author"].trim() !== "") {
    manifest.author = m["author"];
  }
  const options = readOptions(m["options"]);
  if (options) manifest.options = options;
  return manifest;
}

/**
 * Lee `options` tolerando basura: una lista mal escrita a mano no debe impedir
 * abrir el proyecto, solo se ignora lo que no sea una lista de textos.
 */
function readOptions(raw: unknown): Record<string, string[]> | undefined {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const values = value
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim())
      .filter((v) => v !== "");
    if (values.length > 0) result[key] = [...new Set(values)];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function serializeManifest(manifest: ProjectManifest): string {
  return stringify(manifest);
}
