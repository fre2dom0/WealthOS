import type { Log } from 'viem';

export interface ExtendedLog extends Log {
  blockTimestamp?: bigint;
}
