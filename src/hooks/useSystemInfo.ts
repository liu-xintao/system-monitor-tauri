/**
 * useSystemInfo — 系统信息 Hook（Tauri 版本）
 *
 * 职责：
 *   1. 通过 @tauri-apps/api/event 监听 Rust 后端推送的系统信息（SystemInfo）
 *   2. 维护 CPU 和内存使用率的滑动窗口历史，供频谱图（SpectrumBars）使用
 *   3. 通知 Rust 后端渲染器已就绪，确保首次数据不丢失
 *
 * 数据流：
 *   Rust 后端 → Tauri event 'system-info' → 本 Hook → React 状态
 */
import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type { SystemInfo } from '../types';

/** 频谱图保留的历史采样点数量 */
const SPECTRUM_WINDOW = 10;
/** 频谱图显示的柱子数量 */
const SPECTRUM_BARS = 8;

/** Hook 返回的状态数据结构 */
interface SystemInfoState {
  /** 最新一条系统信息，初始为 null（表示加载中） */
  info: SystemInfo | null;
  /** CPU 使用率历史滑动窗口 */
  cpuHistory: number[];
  /** 内存使用率历史滑动窗口 */
  memHistory: number[];
}

export function useSystemInfo(): SystemInfoState {
  /** CPU 历史滑动窗口（可变引用，避免频繁 setState） */
  const cpuHistory = useRef<number[]>([]);
  /** 内存历史滑动窗口（可变引用） */
  const memHistory = useRef<number[]>([]);
  /** 组件是否仍挂载的标志，用于防止卸载后 setState */
  const mounted = useRef(true);

  const [state, setState] = useState<SystemInfoState>({
    info: null,
    cpuHistory: [],
    memHistory: [],
  });

  useEffect(() => {
    mounted.current = true;

    let unlisten: (() => void) | undefined;

    async function setup() {
      // 通知 Rust 后端渲染器已就绪，可以开始推送数据
      try {
        await invoke('renderer_ready');
      } catch (e) {
        console.error('Failed to signal renderer ready:', e);
      }

      // 注册 event 监听：接收 Rust 后端推送的系统信息
      unlisten = await listen<SystemInfo>('system-info', (event) => {
        if (!mounted.current) return;

        const newInfo = event.payload;

        // 更新 CPU 历史滑动窗口
        cpuHistory.current.push(newInfo.cpu.usage);
        if (cpuHistory.current.length > SPECTRUM_WINDOW) {
          cpuHistory.current.shift();
        }

        // 更新内存历史滑动窗口
        memHistory.current.push(newInfo.memory.usagePercent);
        if (memHistory.current.length > SPECTRUM_WINDOW) {
          memHistory.current.shift();
        }

        // 展开为普通数组触发 React 重渲染
        setState({
          info: newInfo,
          cpuHistory: [...cpuHistory.current],
          memHistory: [...memHistory.current],
        });
      });
    }

    setup();

    return () => {
      // 组件卸载时取消挂载标志，停止处理 event 消息
      mounted.current = false;
      if (unlisten) unlisten();
    };
  }, []);

  return state;
}

/**
 * 从历史滑动窗口中提取频谱图所需的数据
 *
 * @param history - 完整的采样历史数组
 * @param bars - 需要提取的柱子数量，默认 SPECTRUM_BARS
 * @returns 归一化后的频谱数据数组，长度 = bars
 */
export function getSpectrumData(history: number[], bars: number = SPECTRUM_BARS): number[] {
  if (history.length === 0) return new Array(bars).fill(0);
  // 取最近 bars 个采样点
  const recent = history.slice(-bars);
  // 如果采样点不足 bars 个，前面补零
  while (recent.length < bars) {
    recent.unshift(0);
  }
  return recent;
}
