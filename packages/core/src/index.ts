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
  readDocument,
  SNAPSHOT_KEEP,
  snapshotDocument,
  splitFrontmatter,
  writeDocument,
  type DocumentParts,
} from "./document.js";
export {
  readDocumentMeta,
  readProjectDocuments,
  type DocumentMeta,
} from "./documents-index.js";
export { VerneError, type VerneErrorCode } from "./errors.js";
export {
  getFrontmatterFields,
  readTags,
  withFrontmatterFields,
} from "./frontmatter.js";
export { searchProject, type SearchResult } from "./search.js";
export {
  listTrash,
  restoreDocument,
  TRASH_DIR,
  trashDocument,
  type TrashEntry,
} from "./trash.js";
export { joinPath, type FsEntry, type VerneFs } from "./fs.js";
export {
  BLUEPRINT_IDS,
  parseManifest,
  serializeManifest,
  VPF_VERSION,
  type BlueprintId,
  type ProjectManifest,
} from "./manifest.js";
export {
  CONTENT_DIR,
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
