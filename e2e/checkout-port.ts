import { createHash } from 'node:crypto';

export const checkoutPortFor = (dir: string) => 3400 + parseInt(createHash('sha256').update(dir).digest('hex').slice(0, 8), 16) % 1600;
