import { useState } from 'react';
import type { SmellMemory } from '../utils/constants';
import { getSeasonInfo, getSmellTypeInfo, getEmotionInfo } from '../utils/constants';
import { formatDate, contrastTextColor } from '../utils/helpers';
import { daysUntilUnlock } from '../capsule/capsuleRules';
import { Pencil, Trash2, ChevronDown, ChevronUp, Heart, Hourglass, Lock, LockOpen } from 'lucide-react';

interface Props {
  memory: SmellMemory;
  index: number;
  isExpanded: boolean;
  /** 当前时间，用于胶囊倒计时 */
  now: Date;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** 封存胶囊（仅未封存记忆可用） */
  onSeal: () => void;
  /** 凭完整线索提前解锁 */
  onEarlyUnlock: (clue: string) => { ok: boolean; message?: string };
}

export default function MemoryCard({
  memory, index, isExpanded, now, onToggle, onEdit, onDelete, onSeal, onEarlyUnlock,
}: Props) {
  const season = getSeasonInfo(memory.season);
  const stype = getSmellTypeInfo(memory.smell_type);
  const emotion = getEmotionInfo(memory.emotion);

  const capsule = memory.capsule;
  const sealed = !!capsule;
  // 脱敏后的展示值（数据层已隐藏来源、正文与颜色，这里再兜底一次）
  const displayColor = sealed ? '#B8A9C4' : memory.color_association;
  const displaySource = sealed ? '气味来源已封存' : memory.source_guess;

  const [clueInput, setClueInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const intensityWidth = `${memory.intensity * 10}%`;
  const humidityWidth = `${memory.humidity * 10}%`;

  const remainingDays = capsule ? daysUntilUnlock(capsule.unlock_date, now) : 0;

  const handleEarlyUnlock = () => {
    const result = onEarlyUnlock(clueInput);
    if (!result.ok) {
      // 输错不改状态：仅提示
      setUnlockError(result.message ?? '线索不正确');
      return;
    }
    setClueInput('');
    setUnlockError('');
  };

  return (
    <article
      className={`group relative bg-paper-50 rounded-2xl border shadow-card overflow-hidden hover:shadow-paper-hover hover:-translate-y-1 transition-all duration-300 animate-fadeInUp ${
        sealed ? 'border-lavender-400/60' : 'border-paper-300'
      }`}
      style={{ animationDelay: `${Math.min(index * 60, 600)}ms` }}
    >
      <div className="flex">
        <div
          className={`w-2 shrink-0 relative overflow-hidden transition-all duration-300 ${sealed ? '' : 'group-hover:w-3'}`}
          style={{ backgroundColor: displayColor }}
        >
          <div className="absolute inset-0 opacity-30"
            style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="p-4 pb-3 cursor-pointer select-none"
            onClick={onToggle}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl font-semibold text-ink-800 leading-tight truncate flex items-center gap-1.5">
                  {sealed && <Hourglass className="w-4 h-4 text-lavender-600 shrink-0" />}
                  <span className="truncate">{memory.location}</span>
                </h3>
                <p className={`text-sm mt-0.5 truncate ${sealed ? 'text-lavender-600/80 italic' : 'text-ink-700/70'}`}>
                  {!sealed && <span className="mr-1" style={{ color: stype.color }}>{stype.emoji}</span>}
                  {displaySource}
                </p>
              </div>
              {sealed ? (
                <div
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm border-2 border-paper-50 bg-lavender-300/50 text-lavender-600"
                  title="颜色已随胶囊封存"
                >
                  <Lock className="w-4 h-4" />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center shadow-sm border-2 border-paper-50"
                  style={{
                    backgroundColor: displayColor,
                    color: contrastTextColor(displayColor),
                  }}
                  title={`颜色联想: ${displayColor}`}
                >
                  <span className="text-xs font-bold">色</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className={`scent-tag ${emotion.bg} ${emotion.text}`}>
                {emotion.emoji} {emotion.label}
              </span>
              <span className="scent-tag bg-ochre-100 text-ochre-600">
                {season.emoji} {season.label}
              </span>
              <span
                className="scent-tag text-paper-50"
                style={{ backgroundColor: stype.color }}
              >
                {stype.label}
              </span>
              {memory.want_again && (
                <span className="scent-tag bg-moss-100 text-moss-600">
                  <Heart className="w-3 h-3 fill-current" /> 想再闻
                </span>
              )}
              {sealed && (
                <span className="scent-tag bg-lavender-300/30 text-lavender-600">
                  <Lock className="w-3 h-3" />
                  {remainingDays > 0 ? `${remainingDays} 天后解锁` : '今日解锁'}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div>
                <div className="flex items-center justify-between text-[11px] text-ink-700/60 mb-1">
                  <span>强度</span>
                  <span className="font-semibold text-ochre-600">{memory.intensity}/10</span>
                </div>
                <div className="h-1.5 bg-paper-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: intensityWidth,
                      background: 'linear-gradient(90deg, #D4B487 0%, #8B5A2B 60%, #5C3A1D 100%)',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-ink-700/60 mb-1">
                  <span>湿度感</span>
                  <span className="font-semibold text-moss-600">
                    {memory.humidity <= 3 ? '偏干' : memory.humidity <= 6 ? '适中' : '偏湿'}
                  </span>
                </div>
                <div className="h-1.5 bg-paper-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: humidityWidth,
                      background: 'linear-gradient(90deg, #CFDBD3 0%, #7DA08C 60%, #3D5A4A 100%)',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-paper-200/80">
              <span className="text-[11px] text-ink-700/50">{formatDate(memory.created_at)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className="inline-flex items-center gap-1 text-[11px] text-ochre-600 hover:text-ochre-700 font-medium"
              >
                {isExpanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> 收起</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> {sealed ? '查看胶囊' : '展开回忆'}</>
                )}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="px-4 pb-4 animate-expand overflow-hidden">
              {sealed && capsule ? (
                <div className="p-4 rounded-xl bg-lavender-300/12 border border-lavender-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Hourglass className="w-4 h-4 text-lavender-600" />
                    <span className="font-hand text-lg text-lavender-600">时间胶囊封存中</span>
                  </div>
                  <p className="font-serif text-[15px] leading-relaxed text-ink-700/80 italic">
                    来源、正文与颜色都已锁进胶囊，
                    {remainingDays > 0
                      ? <>将在 <b className="text-lavender-600 not-italic">{capsule.unlock_date}</b> 自动打开，还有 <b className="text-lavender-600 not-italic">{remainingDays}</b> 天。</>
                      : <>今天就是解锁日，胶囊随时会自动打开。</>}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-ink-700/55">
                    <span>封存于 {formatDate(capsule.sealed_at)}</span>
                    <span>解锁日 {capsule.unlock_date}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-lavender-400/20">
                    <label className="block text-xs font-medium text-ink-700/70 mb-1.5">
                      等不及了？输入完整线索可以提前打开
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clueInput}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { setClueInput(e.target.value); setUnlockError(''); }}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="逐字输入封存时写下的线索"
                        className="scent-input flex-1 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEarlyUnlock(); }}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-medium bg-lavender-500 hover:bg-lavender-600 text-paper-50 transition-all duration-200 shrink-0"
                      >
                        <LockOpen className="w-3.5 h-3.5" /> 打开
                      </button>
                    </div>
                    {unlockError && (
                      <p className="mt-1.5 text-xs text-brick-600">{unlockError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-paper-100/70 border border-paper-200/80">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-hand text-lg text-ochre-600">关联记忆</span>
                  </div>
                  <p className="font-serif text-[15px] leading-relaxed text-ink-800 whitespace-pre-wrap">
                    {memory.memory_text}
                  </p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-paper-200/60">
                <div className="flex items-center gap-1.5 text-[11px] text-ink-700/50">
                  <span>更新于 {formatDate(memory.updated_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  {!sealed && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onSeal(); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-lavender-600 hover:bg-lavender-300/20 transition-colors"
                      title="封入时间胶囊"
                    >
                      <Hourglass className="w-3.5 h-3.5" /> 胶囊
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!sealed) onEdit(); }}
                    disabled={sealed}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      sealed
                        ? 'text-ink-700/30 cursor-not-allowed'
                        : 'text-ochre-600 hover:bg-ochre-100'
                    }`}
                    title={sealed ? '封存期间不可编辑' : '编辑'}
                  >
                    <Pencil className="w-3.5 h-3.5" /> 编辑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (!sealed) onDelete(); }}
                    disabled={sealed}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      sealed
                        ? 'text-ink-700/30 cursor-not-allowed'
                        : 'text-brick-500 hover:bg-brick-500/10'
                    }`}
                    title={sealed ? '封存期间不可删除' : '删除'}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> 删除
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isExpanded && (
            <div className="px-4 pb-3 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -mt-1">
              {!sealed && (
                <button
                  onClick={(e) => { e.stopPropagation(); onSeal(); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-lavender-600 hover:bg-lavender-300/20 transition-colors"
                  title="封入时间胶囊"
                >
                  <Hourglass className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); if (!sealed) onEdit(); }}
                disabled={sealed}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  sealed
                    ? 'text-ink-700/30 cursor-not-allowed'
                    : 'text-ochre-600 hover:bg-ochre-100'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); if (!sealed) onDelete(); }}
                disabled={sealed}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  sealed
                    ? 'text-ink-700/30 cursor-not-allowed'
                    : 'text-brick-500 hover:bg-brick-500/10'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
