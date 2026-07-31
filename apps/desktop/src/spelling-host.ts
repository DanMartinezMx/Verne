import { createSpeller, type Speller } from "@verne/core";

/**
 * Carga del diccionario de español, del lado de la aplicación.
 *
 * core no lee archivos (corre dentro de un WebView), así que aquí se traen los
 * dos archivos del diccionario y se le pasan ya leídos — el mismo patrón que
 * `VerneFs`.
 *
 * Los archivos viven en `public/diccionarios/es/` y se piden por HTTP, no se
 * importan: así los 873 KB quedan fuera del bundle de JavaScript y solo se
 * descargan cuando el escritor enciende la ortografía. Arrancar Verne no debe
 * costar un megabyte de diccionario que quizá nadie use (RFC-0004 §4).
 *
 * Están incorporados al repositorio y no se toman del paquete `dictionary-es`
 * porque su `exports` no permite importar los archivos sueltos. Incorporarlos
 * además deja la obligación de la licencia a la vista, junto a los datos.
 */
const BASE = "diccionarios/es";

let cached: Promise<{ aff: string; dic: string }> | null = null;

function loadDictionary(): Promise<{ aff: string; dic: string }> {
  cached ??= (async () => {
    const [aff, dic] = await Promise.all([
      fetchText(`${BASE}/index.aff`),
      fetchText(`${BASE}/index.dic`),
    ]);
    return { aff, dic };
  })();
  return cached;
}

async function fetchText(path: string): Promise<string> {
  // Ruta relativa a propósito: sirve igual servida por Vite en desarrollo y
  // empaquetada por Tauri, donde el origen no es el mismo.
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
}

/**
 * Crea el corrector para un proyecto, con sus palabras propias. Se rehace cuando
 * cambian esas palabras (al añadir un nombre de personaje); el diccionario del
 * español, que es lo caro, se descarga una sola vez por sesión.
 */
export async function loadSpeller(customWords: readonly string[]): Promise<Speller> {
  return createSpeller(await loadDictionary(), customWords);
}
