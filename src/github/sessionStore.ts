import type { SessionStateStore } from './types';

const STATE_PREFIX = 'github_oauth_state_';

const hasWindow = () => typeof window !== 'undefined' && !!window.sessionStorage;

export class MemorySessionStateStore implements SessionStateStore {
  private states = new Map<string, number>();

  async setState(state: string, expiresAt: number) {
    this.states.set(state, expiresAt);
  }

  async consumeState(state: string): Promise<boolean> {
    const expiresAt = this.states.get(state);
    if (!expiresAt) {
      return false;
    }
    if (Date.now() > expiresAt) {
      this.states.delete(state);
      return false;
    }
    this.states.delete(state);
    return true;
  }
}

export class WebSessionStateStore implements SessionStateStore {
  async setState(state: string, expiresAt: number): Promise<void> {
    if (!hasWindow()) {
      throw new Error('sessionStorage not available');
    }
    window.sessionStorage.setItem(`${STATE_PREFIX}${state}`, expiresAt.toString());
  }

  async consumeState(state: string): Promise<boolean> {
    if (!hasWindow()) {
      throw new Error('sessionStorage not available');
    }
    const value = window.sessionStorage.getItem(`${STATE_PREFIX}${state}`);
    if (!value) {
      return false;
    }
    window.sessionStorage.removeItem(`${STATE_PREFIX}${state}`);
    return Number(value) > Date.now();
  }
}

export const createSessionStore = (): SessionStateStore => {
  if (hasWindow()) {
    return new WebSessionStateStore();
  }
  return new MemorySessionStateStore();
};

