import { describe, expect, it } from "vitest";
import {
  checkForUpdate,
  isNewerVersion,
  parseVersion,
  type CheckForUpdateOptions,
} from "../src/update.js";

const REPO: CheckForUpdateOptions = { owner: "DanMartinezMx", repo: "Verne", currentVersion: "0.2.0" };

describe("parseVersion / isNewerVersion", () => {
  it("acepta con y sin 'v' e ignora sufijos de prerelease", () => {
    expect(parseVersion("v0.2.1")).toEqual({ major: 0, minor: 2, patch: 1 });
    expect(parseVersion("0.10.0")).toEqual({ major: 0, minor: 10, patch: 0 });
    expect(parseVersion("v1.0.0-beta.2")).toEqual({ major: 1, minor: 0, patch: 0 });
    expect(parseVersion("no soy versión")).toBeNull();
  });

  it("compara por major, minor y patch (no lexicográficamente)", () => {
    expect(isNewerVersion("0.2.0", "0.2.1")).toBe(true);
    expect(isNewerVersion("0.9.0", "0.10.0")).toBe(true); // 10 > 9, no "1" < "9"
    expect(isNewerVersion("0.2.0", "0.2.0")).toBe(false);
    expect(isNewerVersion("0.2.1", "0.2.0")).toBe(false);
    expect(isNewerVersion("0.2.0", "basura")).toBe(false);
  });
});

describe("checkForUpdate", () => {
  const fakeApi = (tag: string, extra: Record<string, unknown> = {}) => async () => ({
    tag_name: tag,
    html_url: `https://github.com/DanMartinezMx/Verne/releases/tag/${tag}`,
    ...extra,
  });

  it("avisa cuando hay una versión más nueva", async () => {
    const info = await checkForUpdate(fakeApi("v0.3.0", { name: "Historial visible" }), REPO);
    expect(info).not.toBeNull();
    expect(info!.latestVersion).toBe("0.3.0");
    expect(info!.tag).toBe("v0.3.0");
    expect(info!.name).toBe("Historial visible");
    expect(info!.url).toContain("/releases/tag/v0.3.0");
  });

  it("no avisa si estás al día o en una versión más nueva", async () => {
    expect(await checkForUpdate(fakeApi("v0.2.0"), REPO)).toBeNull();
    expect(await checkForUpdate(fakeApi("v0.1.5"), REPO)).toBeNull();
  });

  it("ante un fallo de red devuelve null, nunca lanza (el aviso no molesta)", async () => {
    const boom = async () => {
      throw new Error("sin conexión");
    };
    await expect(checkForUpdate(boom, REPO)).resolves.toBeNull();
  });

  it("tolera respuestas malformadas", async () => {
    expect(await checkForUpdate(async () => null, REPO)).toBeNull();
    expect(await checkForUpdate(async () => ({ nada: true }), REPO)).toBeNull();
  });

  it("cae a la página de releases si falta html_url", async () => {
    const info = await checkForUpdate(async () => ({ tag_name: "v0.3.0" }), REPO);
    expect(info!.url).toBe("https://github.com/DanMartinezMx/Verne/releases");
  });
});
