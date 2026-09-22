import { useEffect, useState } from 'react';
import { X, Lock, Unlock, Hourglass, KeyRound, CalendarClock, AlertCircle } from 'lucide-react';
import type { SmellMemory } from '../utils/constants';
import type { Capsule, CapsuleInput } from '../utils/capsuleRules';
import { MIN_CLUE_LENGTH, MAX_CAPSULE_DAYS, daysUntilUnlock } from '../utils/capsuleRules';
import { formatDate } from '../utils/helpers';

/**
 * 时间胶囊 · 界面层
 * 封存弹窗、提前解锁弹窗，以及卡片上的锁定面板。
 */

export type CapsuleModalState =
  | { mode: 'seal'; memory: SmellMemory }
  | { mode: 'unlock'; memory: SmellMemory; capsule: Capsule }
  | null;

interface ModalProps {
  state: CapsuleModalState;
  onClose: () => void;
  /** 返回 null 表示成功（弹窗关闭），否则返回要展示的错误信息 */
  onSeal: (memory: SmellMemory, input: CapsuleInput) => string | null;
  /** 返回 true 表示线索正确（弹窗关闭） */
  onUnlock: (memoryId: string, attempt: string) => boolean;
}

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function CapsuleModal({ state, onClose, onSeal, onUnlock }: ModalProps) {
  const [unlockDate, setUnlockDate] = useState('');
  const [clue, setClue] = useState('');
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');

  const isOpen = state !== null;
  const mode = state?.mode;

  useEffect(() => {
    if (isOpen) {
      setUnlockDate('');
      setClue('');
      setAttempt('');
      setError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!state) return null;

  const minDate = toDateInputValue(new Date(Date.now() + 86400000));
  const maxDate = toDateInputValue(new Date(Date.now() + MAX_CAPSULE_DAYS * 86400000));

  const handleSeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.mode !== 'seal') return;
    const err = onSeal(state.memory, { unlockDate, clue });
    if (err) {
      setError(err); // 拒绝：原记忆不变，仅提示
    } else {
      onClose();
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.mode !== 'unlock') return;
    const ok = onUnlock(state.memory.id, attempt);
    if (ok) {
      onClose();
    } else {
      setError('线索不正确，胶囊保持封存');
      setAttempt('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div
        className="relative w-full max-w-lg bg-paper-50 rounded-3xl shadow-2xl border border-paper-300 animate-slideDown"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.54 0 0 0 0 0.35 0 0 0 0 0.18 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-paper-200 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-2">
              {mode === 'seal' ? (
                <><Hourglass className="w-5 h-5 text-ochre-500" /> 封存为时间胶囊</>
              ) : (
                <><KeyRound className="w-5 h-5 text-ochre-500" /> 提前解锁</>
              )}
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              {mode === 'seal'
                ? `把「${state.memory.location}」藏进时间里`
                : `「${state.memory.location}」正等待被想起`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'seal' ? (
          <form onSubmit={handleSeal} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                解锁日 *
                <span className="ml-2 text-xs font-normal text-ink-700/50">
                  须晚于此刻，且不超过一年
                </span>
              </label>
              <input
                type="date"
                required
                min={minDate}
                max={maxDate}
                value={unlockDate}
                onChange={(e) => setUnlockDate(e.target.value)}
                className="scent-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">
                解锁线索 *
                <span className="ml-2 text-xs font-normal text-ink-700/50">
                  至少 {MIN_CLUE_LENGTH} 字，不能照抄地点、来源或正文
                </span>
              </label>
              <textarea
                required
                rows={3}
                value={clue}
                onChange={(e) => setClue(e.target.value)}
                placeholder="写一句只有未来的你能对上暗号的话…"
                className="scent-textarea"
              />
              <div className="mt-1 text-right text-[11px] text-ink-700/50">
                {clue.trim().length} / {MIN_CLUE_LENGTH} 字
              </div>
            </div>

            <div className="rounded-xl bg-paper-100/80 border border-paper-200 px-4 py-3 text-xs text-ink-700/70 leading-relaxed">
              封存后将隐藏这段记忆的来源、正文与颜色，编辑、移除与再次封存都会停用；
              到期自动解锁，想提前打开只能凭完整线索。
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-brick-500/10 border border-brick-400/40 px-4 py-3 text-sm text-brick-600">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">取消</button>
              <button type="submit" className="btn-primary inline-flex items-center gap-2">
                <Lock className="w-4 h-4" /> 封存
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUnlock} className="p-6 space-y-5">
            <div className="rounded-xl bg-paper-100/80 border border-paper-200 px-4 py-3 text-sm text-ink-700/80 leading-relaxed">
              这枚胶囊将于 <b className="text-ochre-600">{formatDate(state.capsule.unlockAt)}</b> 自动解锁
              （还剩 {daysUntilUnlock(state.capsule)} 天）。
              等不及的话，输入封存时写下的完整线索：
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">完整线索 *</label>
              <textarea
                required
                rows={3}
                value={attempt}
                onChange={(e) => { setAttempt(e.target.value); setError(''); }}
                placeholder="一字不差地输入当时的线索…"
                className="scent-textarea"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-brick-500/10 border border-brick-400/40 px-4 py-3 text-sm text-brick-600">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">再想想</button>
              <button type="submit" className="btn-primary inline-flex items-center gap-2">
                <Unlock className="w-4 h-4" /> 解锁
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** 卡片展开时的锁定面板：替代被隐藏的正文 */
export function CapsuleLockedPanel({ capsule, onRequestUnlock }: { capsule: Capsule; onRequestUnlock: () => void }) {
  const days = daysUntilUnlock(capsule);
  return (
    <div className="p-4 rounded-xl bg-paper-200/50 border-2 border-dashed border-paper-400 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-paper-300/70 text-ochre-600 mb-2">
        <Lock className="w-5 h-5" />
      </div>
      <p className="font-hand text-lg text-ochre-600">这段回忆封存在时间胶囊里</p>
      <p className="mt-1 text-xs text-ink-700/60 leading-relaxed">
        来源、正文与颜色已隐藏 · 封存于 {formatDate(capsule.sealedAt)}
      </p>
      <p className="mt-1 text-xs text-ink-700/60">
        <CalendarClock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
        {formatDate(capsule.unlockAt)} 自动解锁
        {days > 0 && <span className="ml-1 text-ochre-600 font-semibold">（还剩 {days} 天）</span>}
      </p>
      <button
        onClick={(e) => { e.stopPropagation(); onRequestUnlock(); }}
        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ochre-600 bg-ochre-100 hover:bg-ochre-200 transition-colors"
      >
        <KeyRound className="w-3.5 h-3.5" /> 输入完整线索提前解锁
      </button>
    </div>
  );
}
