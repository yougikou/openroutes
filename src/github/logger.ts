export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const redacted = (value: unknown) => {
  if (typeof value === 'string') {
    return value.replace(/[A-Za-z0-9]{6,}/g, '***');
  }
  return value;
};

const sanitize = (meta?: Record<string, unknown>) => {
  if (!meta) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (key.toLowerCase().includes('token')) {
      result[key] = '***';
    } else if (typeof value === 'string') {
      result[key] = redacted(value);
    } else {
      result[key] = value;
    }
  }
  return result;
};

export const consoleLogger: Logger = {
  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[github-oauth] ${message}`, sanitize(meta));
    }
  },
  info(message, meta) {
    console.info(`[github-oauth] ${message}`, sanitize(meta));
  },
  warn(message, meta) {
    console.warn(`[github-oauth] ${message}`, sanitize(meta));
  },
  error(message, meta) {
    console.error(`[github-oauth] ${message}`, sanitize(meta));
  },
};

