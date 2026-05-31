/**
 * DragHandle — 窗口拖拽手柄（Tauri 版本）
 *
 * 为 Tauri 无边框（frameless）窗口提供视觉标题栏和拖拽区域。
 * 通过 data-tauri-drag-region 属性启用窗口拖拽行为。
 *
 * 布局：
 *   左侧 — 三个装饰性圆点（仿 macOS 交通灯风格，深色配色）
 *   中间 — 标题文字（默认 "SYS MONITOR"）
 *   右侧 — 等宽占位块，保持标题居中
 */
import type { JSX } from 'react';

interface DragHandleProps {
  /** 标题文字，默认 "SYS MONITOR" */
  title?: string;
}

export default function DragHandle({ title = 'SYS MONITOR' }: DragHandleProps): JSX.Element {
  return (
    <div
      className="drag-handle"
      data-tauri-drag-region
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px 6px',
        cursor: 'grab',
        background: '#141418',
        userSelect: 'none',
      }}
    >
      {/* 左侧装饰圆点 */}
      <div style={{ display: 'flex', gap: '3px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a2a30' }} />
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a2a30' }} />
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2a2a30' }} />
      </div>
      {/* 标题 */}
      <span
        style={{
          fontSize: '10px',
          color: '#5c5854',
          letterSpacing: '1px',
          fontWeight: 500,
        }}
      >
        {title}
      </span>
      {/* 右侧占位块，对称布局用 */}
      <div style={{ width: '24px' }} />
    </div>
  );
}
