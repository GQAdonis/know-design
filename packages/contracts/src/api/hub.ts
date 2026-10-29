// KnowDesign review hub: the daemon's view of the author API.
//
// The source of truth is `docs/contract/openapi.yaml` in the hub repository
// (Know-Me-Tools/know-design-hub). These interfaces mirror its Author API only;
// comment sync reuses `CollabCloudComment` and the collab-cloud types in
// `./collab.ts` unchanged. Pure types: no runtime code here.

export type HubPublicationState = 'draft' | 'live' | 'revoked' | 'expired';

/** Stable error codes returned as `{ error, message }` by the hub. */
export type HubErrorCode =
  | 'invalid_request'
  | 'invalid_path'
  | 'unauthorized'
  | 'forbidden_scope'
  | 'not_found'
  | 'state_conflict'
  | 'manifest_mismatch'
  | 'too_large'
  | 'rate_limited';

export interface HubErrorBody {
  error: HubErrorCode | (string & {});
  message?: string;
  retryAfterSeconds?: number;
}

export interface HubLimits {
  maxSnapshotBytes: number;
  maxFileBytes: number;
  maxFiles: number;
  defaultExpiryDays: number;
  maxExpiryDays: number;
  publishesPerDay: number;
  commentMaxChars: number;
  commentsPerMinutePerGuest: number;
}

/** GET /v1/me. `authorId` is the `teamId` used in collab-cloud paths. */
export interface HubMeResponse {
  authorId: string;
  displayName: string;
  limits?: HubLimits;
}

export interface HubFileEntry {
  path: string;
  size: number;
  sha256: string;
  contentType?: string;
}

/** POST /v1/publications. */
export interface HubCreatePublicationRequest {
  projectId: string;
  entryPath: string;
  title?: string;
  expiresInDays?: number;
  commentsEnabled?: boolean;
}

export interface HubPublication {
  publicationId: string;
  projectId: string;
  slug: string;
  state: HubPublicationState;
  title?: string;
  entryPath: string;
  reviewUrl: string;
  expiresAt: string;
  createdAt: string;
  commentsEnabled?: boolean;
  fileCount?: number;
  totalBytes?: number;
  commentCount?: number;
}

/** POST /v1/publications/:id/finalize. */
export interface HubFinalizeRequest {
  files: HubFileEntry[];
}

export interface HubListPublicationsResponse {
  publications: HubPublication[];
}

/** PUT /v1/publications/:id/expiry. */
export interface HubSetExpiryRequest {
  expiresInDays: number;
}
