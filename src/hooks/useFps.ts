/**
 * useFps — 实时帧率测量 Hook
 *
 * 通过 requestAnimationFrame 计数来实现 FPS 测量。
 * 不依赖 Display 的刷新率信息，而是统计每秒实际触发的 rAF 回调次数。
 *
 * 工作原理：
 *   1. 每次 rAF 回调递增计数器
 *   2. 每秒（1000ms）读取并重置计数器
 *   3. 返回的 FPS 值在下一轮更新时刷新
 *
 * 注意：这个值受帧渲染耗时影响，当主线程繁忙时 FPS 会下降。
 * 切换到后台标签页时 rAF 会暂停，FPS 保持最后一次计数值。
 */
import { useState, useEffect, useRef } from 'react';

export function useFps(): number {
  const [fps, setFps] = useState(0);
  /** rAF 调用计数器（每帧 +1） */
  const frameCount = useRef(0);
  /** 上一轮 FPS 统计的起始时间戳 */
  const lastTime = useRef(performance.now());

  useEffect(() => {
    let rafId: number;

    /**
     * 每帧回调：递增计数，每满 1 秒上报一次 FPS
     */
    function tick(): void {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - lastTime.current;

      if (elapsed >= 1000) {
        // 上报当前帧数并重置计数器
        setFps(frameCount.current);
        frameCount.current = 0;
        lastTime.current = now;
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    // 清理：停止 rAF 循环
    return () => cancelAnimationFrame(rafId);
  }, []);

  return fps;
}
