/**
 * App — 系统监控小部件主布局（Tauri 版本）
 *
 * 组合所有组件组成完整的桌面浮窗界面：
 *   - DragHandle: 窗口拖拽标题栏
 *   - MetricRow: CPU / 内存 / 磁盘 / 网络 / GPU / FPS 指标行
 *   - ProcessList: Top 3 进程列表
 *   - ContextMenu: 右键菜单（刷新频率、窗口置顶、退出等）
 *
 * 状态管理：
 *   useSystemInfo 提供系统数据 + CPU/内存频谱历史
 *   useFps 提供实时帧率
 *   右键菜单状态由本地 useState 维护
 *
 * 数据未就绪时显示"正在采集数据..."加载提示。
 */
import { useState, useCallback, useEffect } from 'react';
import type { JSX } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSystemInfo, getSpectrumData } from './hooks/useSystemInfo';
import { useFps } from './hooks/useFps';
import './App.css';
import DragHandle from './components/DragHandle';
import MetricRow from './components/MetricRow';
import ProcessList from './components/ProcessList';
import ContextMenu from './components/ContextMenu';

function App(): JSX.Element {
  const { info, cpuHistory, memHistory } = useSystemInfo();
  const fps = useFps();

  /** 右键菜单位置，null 表示菜单关闭 */
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  /** 窗口置顶状态 */
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);

  /** 右键菜单项配置 */
  const menuItems = [
    { label: '刷新频率: 2s', action: 'refresh-2', checked: true },
    { label: '刷新频率: 1s', action: 'refresh-1' },
    { label: '刷新频率: 5s', action: 'refresh-5' },
    { label: '窗口置顶', action: 'toggle-ontop', checked: alwaysOnTop },
    { label: '开机启动', action: 'autostart' },
    { label: '退出', action: 'quit' },
  ];

  // 使用原生事件监听右键点击（比 React 合成事件更可靠，尤其是 Tauri webview 中）
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, []);

  /** 菜单选择处理 */
  const handleMenuSelect = useCallback((action: string) => {
    setMenu(null);
    switch (action) {
      case 'refresh-1':
        invoke('set_refresh_interval', { ms: 1000 });
        break;
      case 'refresh-2':
        invoke('set_refresh_interval', { ms: 2000 });
        break;
      case 'refresh-5':
        invoke('set_refresh_interval', { ms: 5000 });
        break;
      case 'toggle-ontop':
        const newState = !alwaysOnTop;
        setAlwaysOnTop(newState);
        invoke('set_always_on_top', { on: newState });
        break;
      case 'quit':
        invoke('quit_app');
        break;
    }
  }, [alwaysOnTop]);

  /** 从历史数据中提取 CPU 和内存频谱 */
  const cpuSpectrum = getSpectrumData(cpuHistory);
  const memSpectrum = getSpectrumData(memHistory);

  // 数据未就绪时显示加载状态
  if (!info) {
    return (
      <div className="app" >
        <DragHandle />
        <div className="metrics-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p style={{ color: '#5c5854', fontSize: '12px' }}>正在采集数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" >
      <DragHandle />

      <div className="metrics-body">
        {/* CPU 行：显示总使用率、温度、每核负载详情 */}
        <MetricRow
          label="CPU"
          color="#e89540"
          mainValue={`${info.cpu.usage}%`}
          extra={info.cpu.temperature != null ? `${info.cpu.temperature}°C` : undefined}
          extraStyle={{ color: '#e89540' }}
          spectrumData={cpuSpectrum}
          detail={
            <div>
              <div style={{ marginBottom: '6px', color: '#e6e0d8', fontWeight: 600 }}>每核负载</div>
              {info.cpu.cores.map((load, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ width: '28px', textAlign: 'right', color: '#5c5854' }}>核{i}</span>
                  <div style={{ flex: 1, background: '#2a2a30', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      className="core-bar"
                      style={{
                        width: `${Math.min(load, 100)}%`,
                        height: '6px',
                        borderRadius: '3px',
                        background: load > 80 ? '#e05555' : '#e89540',
                      }}
                    />
                  </div>
                  <span style={{ width: '36px', color: load > 80 ? '#e05555' : '#e6e0d8', fontVariantNumeric: 'tabular-nums' }}>
                    {load}%
                  </span>
                </div>
              ))}
              {info.cpu.speed > 0 && (
                <div style={{ marginTop: '4px', color: '#5c5854' }}>
                  频率: {info.cpu.speed} GHz
                </div>
              )}
            </div>
          }
        />

        {/* 内存行：显示真实应用占用（active）/总量，不含系统缓存 */}
        <MetricRow
          label="MEM"
          color="#5cb878"
          mainValue={`${info.memory.used}/${info.memory.total}GB`}
          spectrumData={memSpectrum}
          detail={
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#e6e0d8', fontWeight: 600 }}>内存分布</span>
                <span style={{ color: '#5c5854' }}>{info.memory.usagePercent}% 已用</span>
              </div>
              {/* 三色进度条：active + 缓存 + 空闲 */}
              <div style={{ background: '#2a2a30', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px', display: 'flex' }}>
                <div
                  className="core-bar"
                  style={{
                    width: `${info.memory.usagePercent}%`,
                    height: '8px',
                    background: info.memory.usagePercent > 80 ? '#e05555' : '#5cb878',
                    flexShrink: 0,
                  }}
                />
                <div
                  className="core-bar"
                  style={{
                    width: `${Math.min(info.memory.cached / info.memory.total * 100, 100 - info.memory.usagePercent)}%`,
                    height: '8px',
                    background: '#7eb8da',
                    opacity: 0.6,
                    flexShrink: 0,
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '10px' }}>
                <span>应用 <b style={{ color: '#5cb878' }}>{info.memory.used}GB</b></span>
                <span>缓存 <b style={{ color: '#7eb8da' }}>{info.memory.cached}GB</b></span>
                <span>空闲 <b style={{ color: '#8c8680' }}>{(info.memory.total - info.memory.used - info.memory.cached).toFixed(1)}GB</b></span>
              </div>
              <div style={{ color: '#5c5854', fontSize: '10px' }}>
                交换 {info.memory.swapUsed}GB · 缓存可随时释放给应用使用
              </div>
            </div>
          }
        />

        {/* 磁盘行：显示读写速率 */}
        <MetricRow
          label="DSK"
          color="#7eb8da"
          mainValue={`R ${info.disk.readSpeed}  W ${info.disk.writeSpeed}`}
          subValue="MB/s"
        />

        {/* 网络行：显示上下行速率 */}
        <MetricRow
          label="NET"
          color="#c9a0dc"
          mainValue={`↓${info.network.downloadSpeed}  ↑${info.network.uploadSpeed}`}
        />

        {/* GPU 行：显示使用率和温度（不可用时显示 "—"） */}
        <MetricRow
          label="GPU"
          color="#e8a040"
          mainValue={info.gpu.usage != null ? `${info.gpu.usage}%` : '—'}
          extra={info.gpu.temperature != null ? `${info.gpu.temperature}°C` : undefined}
          extraStyle={{ color: '#e8a040' }}
        />

        {/* FPS 实时帧率 */}
        <MetricRow
          label="FPS"
          color="#f0c060"
          mainValue={`${fps}`}
        />

        {/* 进程 Top 3 */}
        <ProcessList processes={info.processes} />
      </div>

      {/* 右键菜单 */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onSelect={handleMenuSelect}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

export default App;
