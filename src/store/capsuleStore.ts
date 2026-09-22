import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory } from '../utils/constants';
import type { Capsule, CapsuleInput, CapsuleValidation } from '../utils/capsuleRules';
import { validateCapsuleInput, isCapsuleLocked, matchClue } from '../utils/capsuleRules';

/**
 * 时间胶囊 · 数据层
 * 胶囊记录独立于记忆本体持久化；校验失败时不触碰任何已有数据。
 */

interface CapsuleStore {
  capsules: Record<string, Capsule>;
  sealCapsule: (memory: SmellMemory, input: CapsuleInput) => CapsuleValidation;
  earlyUnlock: (memoryId: string, attempt: string) => boolean;
  removeCapsule: (memoryId: string) => void;
}

export const useCapsuleStore = create<CapsuleStore>()(
  persist(
    (set, get) => ({
      capsules: {},

      sealCapsule: (memory, input) => {
        const existing = get().capsules[memory.id];
        if (existing && isCapsuleLocked(existing)) {
          return { ok: false, error: '这段记忆已封存在时间胶囊中，解锁前不能再次封存' };
        }
        const result = validateCapsuleInput(memory, input);
        if (!result.ok) return result; // 拒绝：原记忆与已有胶囊保持不动
        const capsule: Capsule = {
          memoryId: memory.id,
          clue: result.clue,
          unlockAt: result.unlockAt,
          sealedAt: new Date().toISOString(),
          earlyUnlocked: false,
        };
        set({ capsules: { ...get().capsules, [memory.id]: capsule } });
        return result;
      },

      earlyUnlock: (memoryId, attempt) => {
        const capsule = get().capsules[memoryId];
        if (!capsule || !isCapsuleLocked(capsule)) return false;
        if (!matchClue(capsule, attempt)) return false; // 输错：不改状态
        set({
          capsules: {
            ...get().capsules,
            [memoryId]: { ...capsule, earlyUnlocked: true },
          },
        });
        return true;
      },

      removeCapsule: (memoryId) => {
        if (!get().capsules[memoryId]) return;
        const next = { ...get().capsules };
        delete next[memoryId];
        set({ capsules: next });
      },
    }),
    {
      name: 'scent-capsule-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
