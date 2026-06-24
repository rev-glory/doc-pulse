-- Migration: remove_oauth_token_fields
--
-- OAuth access tokens and refresh tokens are no longer stored on the users
-- table. GitHub OAuth is used exclusively to authenticate users into DocPulse.
-- All GitHub API operations use App JWTs or Installation Access Tokens.
--
-- Any existing token values are intentionally dropped — they served no
-- architectural purpose and represent a security risk at rest.

ALTER TABLE "users" DROP COLUMN IF EXISTS "github_access_token";
ALTER TABLE "users" DROP COLUMN IF EXISTS "github_refresh_token";
