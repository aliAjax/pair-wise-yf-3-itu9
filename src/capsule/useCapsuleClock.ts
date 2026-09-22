import { useEffect, useState } from 'react';
import { useMemoryStore } from '../store/memoryStore';

/**
 * 时间胶囊心跳：
 *  - 挂载时、每 30 秒、页面重新可见时检查到期胶囊并自动解锁；
 *  - 同时提供一个「当前时间」状态，驱动卡片倒计时按天刷新。
 */
export function useCapsuleClock(): Date {
  const unlockDue = useMemoryStore((s) => s.unlockDueCapsules);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    unlockDue();

    const timer = window.setInterval(() => {
      setNow(new Date());
      unlockDue();
    }, 30000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date());
        unlockDue();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [unlockDue]);

  return now;
}
