import { parse, stringify } from "yaml";
import { VerneError } from "./errors.js";

/** Versión del formato VPF que esta versión de core escribe y entiende. */
export const VPF_VERSION = "0.1";

export const BLUEPRINT_IDS = ["blog", "cuento"] as const;
export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

export interface ProjectManifest {
  /** Versión de la especificación VPF (docs/spec/vpf). */
  vpf: string;
  name: string;
  blueprint: BlueprintId;
  /** Código BCP 47, p. ej. "es" o "es-MX". */
  language: string;
  /** Fecha de creación en ISO 8601. */
  createdAt: string;
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
  const blueprint = m["blueprint"];
  if (typeof blueprint !== "string" || !(BLUEPRINT_IDS as readonly string[]).includes(blueprint)) {
    throw new VerneError(
      "INVALID_MANIFEST",
      `Blueprint desconocido: ${String(blueprint)} (soportados: ${BLUEPRINT_IDS.join(", ")})`,
    );
  }
  return {
    vpf,
    name: m["name"],
    blueprint: blueprint as BlueprintId,
    language: typeof m["language"] === "string" ? m["language"] : "es",
    createdAt: typeof m["createdAt"] === "string" ? m["createdAt"] : "",
  };
}

export function serializeManifest(manifest: ProjectManifest): string {
  return stringify(manifest);
}
