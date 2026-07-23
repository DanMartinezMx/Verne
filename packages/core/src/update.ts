/**
 * Aviso de versión nueva (P2: un aviso, JAMÁS una descarga automática ni un
 * bloqueo). La lógica vive aquí, pura y probable sin red: la app inyecta el
 * `fetchJson` (el del WebView o el de Tauri) y decide cómo y cuándo mostrar.
 */

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

/** Acepta "0.2.0" o "v0.2.0"; ignora sufijos de prerelease ("-beta.1"). */
export function parseVersion(tag: string): SemVer | null {
  const m = /^\s*v?(\d+)\.(\d+)\.(\d+)/.exec(tag);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

export function compareVersions(a: SemVer, b: SemVer): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

/** ¿`candidate` es estrictamente más nueva que `current`? Ilegibles → false. */
export function isNewerVersion(current: string, candidate: string): boolean {
  const c = parseVersion(current);
  const n = parseVersion(candidate);
  if (!c || !n) return false;
  return compareVersions(n, c) > 0;
}

export interface UpdateInfo {
  /** Versión de la última release, normalizada (p. ej. "0.2.1"). */
  latestVersion: string;
  /** Etiqueta original de la release (p. ej. "v0.2.1"). */
  tag: string;
  /** Página de la release, para descargar a mano. */
  url: string;
  /** Nombre de la release, si lo tiene. */
  name: string | null;
}

export interface CheckForUpdateOptions {
  owner: string;
  repo: string;
  currentVersion: string;
}

/**
 * Devuelve la versión nueva si la hay, o null si estás al día o algo falla.
 * NUNCA lanza: un chequeo de actualización que reviente no debe estropear la
 * apertura ni la escritura.
 */
export async function checkForUpdate(
  fetchJson: (url: string) => Promise<unknown>,
  options: CheckForUpdateOptions,
): Promise<UpdateInfo | null> {
  try {
    const data = await fetchJson(latestReleaseApi(options.owner, options.repo));
    if (!isRecord(data)) return null;
    const tag = typeof data["tag_name"] === "string" ? data["tag_name"] : null;
    if (!tag || !isNewerVersion(options.currentVersion, tag)) return null;
    const parsed = parseVersion(tag);
    return {
      latestVersion: parsed ? `${parsed.major}.${parsed.minor}.${parsed.patch}` : tag,
      tag,
      url:
        typeof data["html_url"] === "string" && data["html_url"]
          ? data["html_url"]
          : releasesPage(options.owner, options.repo),
      name: typeof data["name"] === "string" && data["name"] ? data["name"] : null,
    };
  } catch {
    return null;
  }
}

export function latestReleaseApi(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
}

export function releasesPage(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/releases`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
