import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";

import { GitHubAuthService } from "../../src/modules/github/services/github-auth.service";

describe("GitHubAuthService", () => {
  let service: GitHubAuthService;
  let configService: ConfigService;

  beforeEach(() => {
    const mockConfig = {
      appId: "123456",
      privateKey: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
      webhookSecret: "test-secret",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
    };

    configService = {
      get: mock.fn(() => mockConfig),
    } as any;

    service = new GitHubAuthService(configService);
  });

  it("should be defined", () => {
    assert.ok(service);
  });
});
