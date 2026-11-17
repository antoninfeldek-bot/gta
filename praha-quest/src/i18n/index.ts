import { cs, csContent } from './cs';

/** The active string table. Swap by locale once an English table exists. */
export const t = cs;
/** Longer content: legends, dishes, quests, ranks, rivals. */
export const tc = csContent;
export { formatNumber, fmtDistance } from './cs';
