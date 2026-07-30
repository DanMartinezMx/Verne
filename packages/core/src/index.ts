export {
  analyzeInline,
  analyzeText,
  countSyllables,
  type Finding,
  type FindingCategory,
  type InlineFinding,
  type QualityReport,
} from "./analyze.js";
export {
  addCollectionEntry,
  COLLECTIONS_DIR,
  ensureCollection,
  listCollection,
  updateCollectionEntry,
  type CollectionEntry,
} from "./collections.js";
export {
  countWords,
  joinDocument,
  listSnapshots,
  readDocument,
  restoreSnapshot,
  SNAPSHOT_KEEP,
  snapshotDocument,
  splitFrontmatter,
  writeDocument,
  type DocumentParts,
  type Snapshot,
} from "./document.js";
export {
  readDocumentMeta,
  readProjectDocuments,
  type DocumentMeta,
} from "./documents-index.js";
export { VerneError, type VerneErrorCode } from "./errors.js";
export { createFolder, moveEntry, renameEntry } from "./organize.js";
export {
  DEFAULT_TAGS_FIELD,
  getFrontmatterFields,
  readTags,
  withFrontmatterFields,
} from "./frontmatter.js";
export { searchProject, type SearchResult } from "./search.js";
export {
  checkForUpdate,
  compareVersions,
  isNewerVersion,
  latestReleaseApi,
  parseVersion,
  releasesPage,
  type CheckForUpdateOptions,
  type SemVer,
  type UpdateInfo,
} from "./update.js";
export {
  listTrash,
  restoreDocument,
  TRASH_DIR,
  trashDocument,
  type TrashEntry,
} from "./trash.js";
export { joinPath, sanitizeName, type FsEntry, type VerneFs } from "./fs.js";
export {
  BLUEPRINT_IDS,
  isKnownBlueprint,
  parseManifest,
  serializeManifest,
  VPF_VERSION,
  type BlueprintId,
  type ProjectManifest,
} from "./manifest.js";
export {
  CONTENT_DIR,
  convertFolderToProject,
  createProject,
  EXPORT_DIR,
  INTERNAL_DIR,
  MANIFEST_FILE,
  openProject,
  readProjectTree,
  RESOURCES_DIR,
  updateProjectManifest,
  type CreateProjectOptions,
  type Project,
  type TreeNode,
} from "./project.js";
