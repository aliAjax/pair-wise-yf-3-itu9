/**
 * 时间胶囊 · 规则层（纯逻辑，不依赖存储与界面）
 *
 * 规则：
 *  1. 封存需要「解锁日」与「线索」。
 *  2. 解锁日必须晚于封存时间，且不超过封存时间起一年。
 *  3. 线索不少于八个字；且不得包含地点 / 来源 / 正文中的连续四字片段。
 *  4. 封存后隐藏来源、正文与颜色；编辑、移除、再次封存停用。
 *  5. 到期自动解锁；提前解锁须输入完整线索，输错不改状态。
 */

export interface CapsuleInput {
  unlockDate: string;
  clue: string;
}

export interface CapsuleRuleResult {
  ok: boolean;
  /** 校验失败时面向界面的提示语 */
  message?: string;
}

export const MIN_CLUE_LENGTH = 8;
/** 解锁日相对封存日最远可间隔的天数（不超过一年，按 365 天计） */
export const MAX_CAPSULE_DAYS = 365;
/** 连续四字片段的长度 */
const FORBIDDEN_FRAGMENT_LEN = 4;

/* ------------------------------------------------------------------ */
/* 日期工具（均按本地日期处理）                                          */
/* ------------------------------------------------------------------ */

/** 将 Date 格式化为本地日期键 YYYY-MM-DD */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 今天的本地日期键 */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** 明天的本地日期键（解锁日的最早可选值） */
export function tomorrowKey(now: Date = new Date()): string {
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
}

/** 封存日起一年后的本地日期键（解锁日的最晚可选值） */
export function oneYearLaterKey(sealedAtIso: string): string {
  const s = new Date(sealedAtIso);
  return toDateKey(new Date(s.getFullYear(), s.getMonth(), s.getDate() + MAX_CAPSULE_DAYS));
}

/** 把 YYYY-MM-DD 解析为当天 0 点的 Date；非法返回 null */
export function parseDateKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, mo - 1, d);
  // 2 月 30 日之类会被 JS 进位，用回写比对剔除
  if (toDateKey(date) !== key.trim()) return null;
  return date;
}

/**
 * 校验解锁日：
 *  - 必须是合法日期；
 *  - 必须晚于封存时间（封存当天也不可，至少要等到下一天）；
 *  - 不得晚于封存时间起一年。
 */
export function validateUnlockDate(unlockDate: string, sealedAtIso: string): CapsuleRuleResult {
  const date = parseDateKey(unlockDate);
  if (!date) return { ok: false, message: '请选择合法的解锁日期' };

  const sealed = new Date(sealedAtIso);
  const sealedDayKey = toDateKey(sealed);
  const unlockKey = toDateKey(date);

  if (unlockKey <= sealedDayKey) {
    return { ok: false, message: '解锁日必须晚于封存时间（至少要到明天）' };
  }

  const maxKey = oneYearLaterKey(sealedAtIso);
  if (unlockKey > maxKey) {
    return { ok: false, message: '解锁日不能超过封存之日起一年' };
  }
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* 线索校验                                                            */
/* ------------------------------------------------------------------ */

/**
 * 线索规范化：去除所有空白与标点，仅保留汉字、字母与数字。
 * 长度与四字片段比对均在规范化后的文本上进行。
 */
export function normalizeClue(raw: string): string {
  return (raw ?? '').replace(/[\s\p{P}\p{S}]/gu, '');
}

/** 取文本中所有连续四字片段 */
function fourCharFragments(text: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + FORBIDDEN_FRAGMENT_LEN <= text.length; i++) {
    set.add(text.slice(i, i + FORBIDDEN_FRAGMENT_LEN));
  }
  return set;
}

/**
 * 校验线索：
 *  - 去空白标点后不少于八字；
 *  - 不得包含地点、来源、正文中任一连续四字片段。
 */
export function validateClue(
  rawClue: string,
  fields: { location: string; source_guess: string; memory_text: string },
): CapsuleRuleResult {
  const clue = normalizeClue(rawClue);
  if (clue.length < MIN_CLUE_LENGTH) {
    return { ok: false, message: `线索至少需要 ${MIN_CLUE_LENGTH} 个字（不含空格与标点）` };
  }

  const forbidden = new Set<string>();
  [fields.location, fields.source_guess, fields.memory_text].forEach((text) => {
    fourCharFragments(normalizeClue(text)).forEach((frag) => forbidden.add(frag));
  });

  for (let i = 0; i + FORBIDDEN_FRAGMENT_LEN <= clue.length; i++) {
    if (forbidden.has(clue.slice(i, i + FORBIDDEN_FRAGMENT_LEN))) {
      return {
        ok: false,
        message: '线索不得包含地点、来源或正文里的连续四字片段，请换一句只有你知道的话',
      };
    }
  }
  return { ok: true };
}

/** 封存前的完整校验 */
export function validateCapsule(
  input: CapsuleInput,
  sealedAtIso: string,
  fields: { location: string; source_guess: string; memory_text: string },
): CapsuleRuleResult {
  const dateResult = validateUnlockDate(input.unlockDate, sealedAtIso);
  if (!dateResult.ok) return dateResult;
  return validateClue(input.clue, fields);
}

/* ------------------------------------------------------------------ */
/* 状态与解锁                                                          */
/* ------------------------------------------------------------------ */

/** 胶囊是否已到期（解锁日 <= 今天即视为到期，可自动解锁） */
export function isCapsuleDue(unlockDate: string, now: Date = new Date()): boolean {
  return unlockDate <= todayKey(now);
}

/**
 * 距解锁日还剩多少天（按本地自然日计）。
 * 已到期返回 0。
 */
export function daysUntilUnlock(unlockDate: string, now: Date = new Date()): number {
  const target = parseDateKey(unlockDate);
  if (!target) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = target.getTime() - today.getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/**
 * 提前解锁：必须输入与封存时完全一致的完整线索。
 * 仅做比对，不改状态由数据层根据返回值决定。
 */
export function verifyClue(input: string, storedClue: string): boolean {
  return normalizeClue(input) === normalizeClue(storedClue);
}
