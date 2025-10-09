import type { Log } from 'viem';

export interface ExtendedLog extends Log {
  blockTimestamp?: `0x${string}` | null;
}
