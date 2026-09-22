import type { SmellMemory } from './constants';

/**
 * 时间胶囊 · 规则层
 * 只负责校验与状态推导，不持有数据、不渲染界面。
 */

export interface Capsule {
  memoryId: string;
  clue: string;        // 完整线索（提前解锁的钥匙）
  unlockAt: string;    // 解锁时刻 ISO
  sealedAt: string;    // 封存时刻 ISO
  earlyUnlocked: boolean; // 是否已凭线索提前解锁
}

export interface CapsuleInput {
  unlockDate: string;  // 日期选择器的 YYYY-MM-DD
  clue: string;
}

export const MIN_CLUE_LENGTH = 8;    // 线索至少八字
export const MAX_CAPSULE_DAYS = 365; // 解锁日距封存最多一年
export const FRAGMENT_LENGTH = 4;    // 禁止泄露的连续片段长度

export type CapsuleValidation =
  | { ok: true; clue: string; unlockAt: string }
  | { ok: false; error: string };

/** 取出文本中全部连续 len 字片段 */
function collectFragments(text: string, len: number): string[] {
  const fragments: string[] = [];
  for (let i = 0; i + len <= text.length; i++) {
    fragments.push(text.slice(i, i + len));
  }
  return fragments;
}

/** 线索若含地点 / 来源 / 正文的连续四字片段，返回该片段，否则返回 null */
export function findLeakedFragment(clue: string, memory: SmellMemory): string | null {
  const protectedTexts = [memory.location, memory.source_guess, memory.memory_text];
  for (const text of protectedTexts) {
    for (const fragment of collectFragments(text, FRAGMENT_LENGTH)) {
      if (clue.includes(fragment)) return fragment;
    }
  }
  return null;
}

/** 校验封存请求；任何一条不满足都拒绝，调用方保证原记忆不变 */
export function validateCapsuleInput(
  memory: SmellMemory,
  input: CapsuleInput,
  now: Date = new Date(),
): CapsuleValidation {
  const clue = input.clue.trim();
  if (clue.length < MIN_CLUE_LENGTH) {
    return { ok: false, error: `线索至少需要 ${MIN_CLUE_LENGTH} 个字（当前 ${clue.length} 字）` };
  }

  if (!input.unlockDate) {
    return { ok: false, error: '请选择解锁日' };
  }
  const unlockTs = new Date(`${input.unlockDate}T00:00:00`).getTime();
  if (Number.isNaN(unlockTs)) {
    return { ok: false, error: '解锁日格式不正确' };
  }
  const nowTs = now.getTime();
  if (unlockTs <= nowTs) {
    return { ok: false, error: '解锁日必须晚于封存时间' };
  }
  if (unlockTs > nowTs + MAX_CAPSULE_DAYS * 86400000) {
    return { ok: false, error: `解锁日不能超过封存后 ${MAX_CAPSULE_DAYS} 天` };
  }

  const leaked = findLeakedFragment(clue, memory);
  if (leaked) {
    return {
      ok: false,
      error: `线索不能包含地点、来源或正文中的连续 ${FRAGMENT_LENGTH} 字片段（「${leaked}」）`,
    };
  }

  return { ok: true, clue, unlockAt: new Date(unlockTs).toISOString() };
}

/** 是否仍处于锁定（未提前解锁且未到解锁日）；到期自动解锁 */
export function isCapsuleLocked(capsule: Capsule, now: Date = new Date()): boolean {
  if (capsule.earlyUnlocked) return false;
  return now.getTime() < new Date(capsule.unlockAt).getTime();
}

/** 提前解锁必须输入完整线索；不匹配时调用方不得改动任何状态 */
export function matchClue(capsule: Capsule, attempt: string): boolean {
  return attempt.trim() === capsule.clue;
}

/** 距自动解锁还剩几天（已到期为 0） */
export function daysUntilUnlock(capsule: Capsule, now: Date = new Date()): number {
  const ms = new Date(capsule.unlockAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}
