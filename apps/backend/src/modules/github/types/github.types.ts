// ---------------------------------------------------------------------------
// GitHub Module — Domain Types
//
// Internal representations of GitHub API responses.
// These types decouple the rest of the application from the raw Octokit
// response shapes so that API changes only need to be handled in one place.
// ---------------------------------------------------------------------------

/**
 * Repository metadata fetched from GitHub via an Installation Access Token.
 * Fields are a curated subset of the GitHub API response, mapped to our
 * naming conventions.
 */
export interface GitHubRepositoryMetadata {
  /** GitHub's internal integer ID for the repository. */
  githubRepositoryId: number;

  /** Owner login (user or org). */
  owner: string;

  /** Short repository name (e.g. "my-repo"). */
  name: string;

  /** Full slugged name (e.g. "my-org/my-repo"). */
  fullName: string;

  /** The default branch configured on GitHub. */
  defaultBranch: string;

  /** Whether the repository is private. */
  isPrivate: boolean;

  /** Repository description, if set. */
  description: string | null;

  /** Primary programming language, if detected by GitHub. */
  language: string | null;

  /** HTTPS clone URL. */
  cloneUrl: string;

  /** URL to the repository on github.com. */
  htmlUrl: string;

  /** Visibility string as returned by GitHub ("public" | "private" | "internal"). */
  visibility: string;
}
