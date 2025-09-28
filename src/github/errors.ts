export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly documentationUrl?: string,
    public readonly errors?: unknown
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

export class InsufficientScopeError extends GitHubApiError {
  constructor(message: string, status = 403) {
    super(message, status);
    this.name = 'InsufficientScopeError';
  }
}

export class TokenRevokedError extends GitHubApiError {
  constructor(message = '令牌失效或已撤销') {
    super(message, 401);
    this.name = 'TokenRevokedError';
  }
}

export class ResourceNotFoundError extends GitHubApiError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'ResourceNotFoundError';
  }
}

export class ValidationError extends GitHubApiError {
  constructor(message: string, public readonly fields?: unknown) {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

