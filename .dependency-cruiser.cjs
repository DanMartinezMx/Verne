/**
 * Fronteras de arquitectura de Verne (RFC-0002 §4.3), vigiladas en CI desde M0:
 *  - core no conoce la UI ni React
 *  - solo packages/editor puede importar ProseMirror
 *  - solo packages/core puede importar SQLite
 *  - core y ui deben poder correr en un WebView (sin builtins de Node)
 */
module.exports = {
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$|/tests/" },
    tsPreCompilationDeps: true,
  },
  forbidden: [
    {
      name: "core-independiente",
      comment: "packages/core no puede depender de React, de la UI ni de las apps",
      severity: "error",
      from: { path: "^packages/core/src" },
      to: { path: "^(packages/ui|apps/)|^node_modules/(react|react-dom)" },
    },
    {
      name: "prosemirror-solo-editor",
      comment: "Nada importa ProseMirror fuera de packages/editor (RFC-0001 §7.2)",
      severity: "error",
      from: { pathNot: "^packages/editor/" },
      to: { path: "^node_modules/prosemirror" },
    },
    {
      name: "sqlite-solo-core",
      comment: "Nada importa SQLite fuera de packages/core (RFC-0001 §6.4)",
      severity: "error",
      from: { pathNot: "^packages/core/" },
      to: { path: "sqlite|better-sqlite3|libsql" },
    },
    {
      name: "webview-safe",
      comment: "core y ui corren dentro del WebView: prohibidos los builtins de Node",
      severity: "error",
      from: { path: "^(packages/core|packages/ui|packages/editor)/src" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "sin-circulares",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
};
