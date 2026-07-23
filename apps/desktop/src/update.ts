import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { checkForUpdate, type UpdateInfo } from "@verne/core";

/** Repositorio oficial: de aquí salen las releases que se comparan. */
const OWNER = "DanMartinezMx";
const REPO = "Verne";

/** GitHub exige User-Agent, pero el WebView ya envía el suyo: fetch basta. */
async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** La versión que reporta Tauri (tauri.conf.json); "" fuera de Tauri. */
export async function currentAppVersion(): Promise<string> {
  try {
    return await getVersion();
  } catch {
    return "";
  }
}

/**
 * Comprueba si hay una versión nueva. Devuelve null si estás al día o si algo
 * falla: nunca lanza, nunca descarga. Es un aviso, no un actualizador (P2).
 */
export async function checkForAppUpdate(): Promise<UpdateInfo | null> {
  const currentVersion = await currentAppVersion();
  if (!currentVersion) return null;
  return checkForUpdate(fetchJson, { owner: OWNER, repo: REPO, currentVersion });
}

/** Abre la página de descarga en el navegador del sistema. El usuario decide. */
export async function openDownloadPage(url: string): Promise<void> {
  try {
    await openUrl(url);
  } catch {
    // Si el opener no está disponible, la URL sigue visible para copiarla.
  }
}
