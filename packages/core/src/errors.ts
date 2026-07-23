export type VerneErrorCode =
  | "NOT_A_PROJECT"
  | "ALREADY_A_PROJECT"
  | "INVALID_MANIFEST"
  | "UNSUPPORTED_VPF_VERSION";

export class VerneError extends Error {
  constructor(
    public readonly code: VerneErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "VerneError";
  }
}
