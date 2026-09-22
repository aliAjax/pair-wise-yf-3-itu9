import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SmellMemory, Season, SmellType, Emotion, CapsuleData } from '../utils/constants';
import { generateId } from '../utils/helpers';
import { mockMemories } from '../data/mockData';
import {
  validateCapsule,
  verifyClue,
  isCapsuleDue,
  normalizeClue,
  type CapsuleRuleResult,
} from '../capsule/capsuleRules';

export interface MemoryInput {
  location: string;
  source_guess: string;
  intensity: number;
  humidity: number;
  season: Season;
  smell_type: SmellType;
  memory_text: string;
  color_association: string;
  emotion: Emotion;
  want_again: boolean;
}

/** 封存胶囊的入参（数据层，规则细节见 capsuleRules） */
export interface SealCapsuleInput {
  unlockDate: string;
  clue: string;
}

interface MemoryStore {
  memories: SmellMemory[];
  addMemory: (input: MemoryInput) => void;
  updateMemory: (id: string, input: MemoryInput) => void;
  deleteMemory: (id: string) => void;
  initIfEmpty: () => void;
  /** 封存时间胶囊；校验失败时拒绝，原记忆保持不变 */
  sealCapsule: (id: string, input: SealCapsuleInput) => CapsuleRuleResult;
  /** 凭完整线索提前解锁；线索错误不改状态 */
  unlockCapsuleEarly: (id: string, clue: string) => CapsuleRuleResult;
  /** 解锁所有已到期胶囊，返回本次自动解锁的条数 */
  unlockDueCapsules: () => number;
}

/** 封存后对外展示时的占位颜色（真实颜色已随封存隐藏） */
export const CAPSULE_MASK_COLOR = '#B8A9C4';

/**
 * 数据层脱敏：封存中的记忆隐藏来源、正文与颜色。
 * 返回新对象，原始数据不被改动；非封存记忆原样返回。
 */
export function maskSealedMemory(memory: SmellMemory): SmellMemory {
  if (!memory.capsule) return memory;
  return {
    ...memory,
    source_guess: '',
    memory_text: '',
    color_association: CAPSULE_MASK_COLOR,
  };
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      addMemory: (input) => {
        const now = new Date().toISOString();
        const newMem: SmellMemory = {
          id: generateId(),
          ...input,
          created_at: now,
          updated_at: now,
        };
        set({ memories: [newMem, ...get().memories] });
      },
      updateMemory: (id, input) => {
        const target = get().memories.find((m) => m.id === id);
        // 封存中的记忆禁止编辑
        if (target?.capsule) return;
        set({
          memories: get().memories.map((m) =>
            m.id === id
              ? { ...m, ...input, updated_at: new Date().toISOString() }
              : m,
          ),
        });
      },
      deleteMemory: (id) => {
        const target = get().memories.find((m) => m.id === id);
        // 封存中的记忆禁止移除
        if (target?.capsule) return;
        set({ memories: get().memories.filter((m) => m.id !== id) });
      },
      initIfEmpty: () => {
        if (get().memories.length === 0) {
          set({ memories: mockMemories });
        }
      },
      sealCapsule: (id, input) => {
        const target = get().memories.find((m) => m.id === id);
        if (!target) return { ok: false, message: '没有找到这条记忆' };
        // 已封存（含到期尚未自动解锁）不可再次封存
        if (target.capsule) return { ok: false, message: '这条记忆已在胶囊中封存' };

        const sealedAt = new Date().toISOString();
        const result = validateCapsule(input, sealedAt, {
          location: target.location,
          source_guess: target.source_guess,
          memory_text: target.memory_text,
        });
        if (!result.ok) return result;

        const capsule: CapsuleData = {
          sealed_at: sealedAt,
          unlock_date: input.unlockDate,
          clue: normalizeClue(input.clue),
        };
        set({
          memories: get().memories.map((m) =>
            m.id === id ? { ...m, capsule } : m,
          ),
        });
        return { ok: true };
      },
      unlockCapsuleEarly: (id, clue) => {
        const target = get().memories.find((m) => m.id === id);
        if (!target?.capsule) return { ok: false, message: '这条记忆没有封存中的胶囊' };
        // 到期即自动解锁，无需线索
        if (isCapsuleDue(target.capsule.unlock_date)) {
          get().unlockDueCapsules();
          return { ok: true };
        }
        // 输错线索：仅返回失败，状态不变
        if (!verifyClue(clue, target.capsule.clue)) {
          return { ok: false, message: '线索不完整或不正确，胶囊保持封存' };
        }
        set({
          memories: get().memories.map((m) => {
            if (m.id !== id || !m.capsule) return m;
            const { capsule, ...rest } = m;
            void capsule;
            return rest;
          }),
        });
        return { ok: true };
      },
      unlockDueCapsules: () => {
        const due = get().memories.filter(
          (m) => m.capsule && isCapsuleDue(m.capsule.unlock_date),
        );
        if (due.length === 0) return 0;
        const dueIds = new Set(due.map((m) => m.id));
        set({
          memories: get().memories.map((m) => {
            if (!m.capsule || !dueIds.has(m.id)) return m;
            const { capsule, ...rest } = m;
            void capsule;
            return rest;
          }),
        });
        return due.length;
      },
    }),
    {
      name: 'scent-memory-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
