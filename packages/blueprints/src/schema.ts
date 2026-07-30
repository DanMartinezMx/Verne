import type { CollectionDef } from "./types.js";

/**
 * Genera el `_schema.yaml` descriptivo de una colección a partir de sus campos.
 * La spec VPF pide que el esquema sea YAML legible por un humano con cualquier
 * editor; generarlo evita que se desincronice de lo que el panel muestra.
 */
export function collectionSchemaYaml(def: CollectionDef): string {
  const lines = [`# ${def.description}`, "fields:"];
  for (const field of def.fields) {
    lines.push(`  ${field.key}:`);
    // "document" no es un tipo del formato: en disco es la ruta relativa del
    // documento, o sea una cadena. `ref` lo deja dicho para quien lea el archivo.
    lines.push(`    type: ${field.type === "document" ? "string" : field.type}`);
    lines.push(`    label: ${quoteIfNeeded(field.label)}`);
    if (field.type === "document") lines.push("    ref: documento");
    if (field.type === "enum" && field.values) {
      lines.push(`    values: [${field.values.join(", ")}]`);
    }
  }
  return `${lines.join("\n")}\n`;
}

/** Los paréntesis y los dos puntos rompen un escalar YAML sin comillas. */
function quoteIfNeeded(text: string): string {
  return /^[\w áéíóúüñÁÉÍÓÚÜÑ.-]+$/.test(text) ? text : JSON.stringify(text);
}
