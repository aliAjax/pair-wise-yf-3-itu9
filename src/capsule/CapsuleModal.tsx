import { useEffect, useMemo, useState } from 'react';
import { X, Hourglass } from 'lucide-react';
import type { SmellMemory } from '../utils/constants';
import type { SealCapsuleInput } from '../store/memoryStore';
import { tomorrowKey, oneYearLaterKey } from '../capsule/capsuleRules';

interface Props {
  isOpen: boolean;
  memory: SmellMemory | null;
  onClose: () => void;
  onSubmit: (input: SealCapsuleInput) => { ok: boolean; message?: string };
}

export default function CapsuleModal({ isOpen, memory, onClose, onSubmit }: Props) {
  const [sealedAtIso, setSealedAtIso] = useState(() => new Date().toISOString());
  const minDate = useMemo(() => tomorrowKey(new Date(sealedAtIso)), [sealedAtIso]);
  const maxDate = useMemo(() => oneYearLaterKey(sealedAtIso), [sealedAtIso]);

  const [unlockDate, setUnlockDate] = useState('');
  const [clue, setClue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSealedAtIso(new Date().toISOString());
      setUnlockDate('');
      setClue('');
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

  if (!isOpen || !memory) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmit({ unlockDate, clue });
    if (!result.ok) {
      // 拒绝：停留在弹窗内，原记忆不变
      setError(result.message ?? '封存失败，请检查填写内容');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 pt-8 md:p-6 overflow-y-auto">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s ease-out' }}
      />
      <div className="relative w-full max-w-lg bg-paper-50 rounded-3xl shadow-2xl border border-lavender-400/60 animate-slideDown overflow-hidden">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-lavender-400/30 rounded-t-3xl bg-paper-50/95 backdrop-blur">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-800 flex items-center gap-2">
              <Hourglass className="w-6 h-6 text-lavender-600" />
              封入时间胶囊
            </h2>
            <p className="text-sm text-ink-700/60 mt-0.5 font-hand">
              将「{memory.location}」交给未来的自己
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ink-700/60 hover:text-ink-800 hover:bg-paper-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-lavender-300/15 border border-lavender-400/30 text-[13px] text-ink-700/80 space-y-1.5">
            <p className="font-medium text-lavender-600 mb-1">封存须知</p>
            <p>· 封存后来源、正文与颜色将被隐藏，到期或凭完整线索才能重新看见。</p>
            <p>· 解锁日须晚于今天，且不超过一年（{minDate} ～ {maxDate}）。</p>
            <p>· 线索不少于八个字，且不能照抄地点、来源或正文中连续四个字。</p>
            <p>· 封存期间无法编辑、删除或再次封存这条记忆。</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              解锁日 *
            </label>
            <input
              type="date"
              required
              value={unlockDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              className="scent-input"
            />
            <p className="text-[11px] text-ink-700/50 mt-1">
              到了解锁日，胶囊会自动打开
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              解锁线索 *（至少八个字）
            </label>
            <textarea
              value={clue}
              onChange={(e) => setClue(e.target.value)}
              rows={3}
              placeholder="写一句只有你知道的话，作为提前打开胶囊的钥匙……"
              className="scent-textarea font-serif"
            />
            <p className="text-[11px] text-ink-700/50 mt-1">
              提前解锁需逐字输入完整线索，输错胶囊不会有任何变化。
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-brick-500/10 border border-brick-500/30 text-sm text-brick-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              再想想
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 bg-lavender-500 hover:bg-lavender-600 text-paper-50 font-medium rounded-xl px-5 py-2.5 transition-all duration-200 shadow-paper hover:-translate-y-0.5"
            >
              <Hourglass className="w-4 h-4" />
              确认封存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
