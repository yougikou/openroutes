import { z } from 'zod';
import type { OAuthConfig } from './types';

const configSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.string().url(),
  GITHUB_DEFAULT_SCOPES: z.string().optional(),
  GITHUB_ALLOW_PRIVATE_REPO: z
    .string()
    .optional()
    .transform((value) => value === '1' || value === 'true'),
});

let cachedConfig: OAuthConfig | null = null;

const DEFAULT_SCOPES = ['read:user', 'user:email', 'public_repo', 'repo:status'];

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): OAuthConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Missing GitHub OAuth configuration: ${parsed.error.message}`);
  }
  const scopeString = parsed.data.GITHUB_DEFAULT_SCOPES;
  const scopes = scopeString ? scopeString.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SCOPES;
  cachedConfig = {
    clientId: parsed.data.GITHUB_CLIENT_ID,
    clientSecret: parsed.data.GITHUB_CLIENT_SECRET,
    redirectUri: parsed.data.GITHUB_REDIRECT_URI,
    defaultScopes: scopes,
    allowPrivateRepo: parsed.data.GITHUB_ALLOW_PRIVATE_REPO,
  };
  return cachedConfig;
};

export const resetConfigCache = () => {
  cachedConfig = null;
};

export { DEFAULT_SCOPES };

