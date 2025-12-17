declare module 'redis' {
  import { EventEmitter } from 'events';

  export interface RedisClient extends EventEmitter {
    get(key: string, callback: (err: Error | null, value: string | null) => void): void;
    incr(key: string, callback: (err: Error | null) => void): void;
    expire(key: string, seconds: number, callback: (err: Error | null) => void): void;
    pttl(key: string, callback: (err: Error | null, ttl: number) => void): void;
    quit(): void;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export function createClient(options: { host: string; port: number }): RedisClient;
}
