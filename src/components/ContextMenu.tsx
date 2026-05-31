/**
 * ContextMenu — 右键上下文菜单组件
 *
 * 在鼠标位置弹出浮层菜单，提供刷新频率、透明度调节、窗口置顶、退出等操作。
 * 支持两种菜单项类型：普通点击项（action）和滑块（slider）。
 *
 * 关键行为：
 *   1. 菜单位置自适应：确保不超出窗口右边界和下边界
 *   2. 点击菜单外部自动关闭（延迟绑定 click 监听，避免与右键事件冲突）
 *   3. 选中项显示 ✓ 标记
 *   4. 滑块实时调节，点击菜单外部才关闭
 */
import type { JSX } from 'react';
import { useEffect, useRef } from 'react';

interface MenuItem {
  /** 菜单项显示文字 */
  label: string;
  /** 操作标识，onSelect 回调时返回 */
  action: string;
  /** 是否选中（显示 ✓） */
  checked?: boolean;
  /** 菜单项类型：普通项或滑块 */
  type?: 'normal' | 'slider';
  /** 滑块当前值（type='slider' 时有效） */
  value?: number;
  /** 滑块最小值 */
  min?: number;
  /** 滑块最大值 */
  max?: number;
  /** 滑块步长 */
  step?: number;
  /** 滑块值变化回调 */
  onChange?: (value: number) => void;
}

interface ContextMenuProps {
  /** 菜单弹出位置 X 坐标 */
  x: number;
  /** 菜单弹出位置 Y 坐标 */
  y: number;
  /** 菜单项列表 */
  items: MenuItem[];
  /** 选择菜单项的回调 */
  onSelect: (action: string) => void;
  /** 关闭菜单的回调 */
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onSelect, onClose }: ContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * 点击外部关闭菜单
   * 使用 setTimeout(0) 延迟绑定，避免当前右键事件的 mouseup/mousedown
   * 立即触发关闭，导致菜单刚出现就消失。
   */
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    const timer = setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  // 确保菜单不超出窗口边界
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - items.length * 34 - 80);

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        background: '#1e1e22',
        border: '1px solid #2e2e34',
        borderRadius: '8px',
        padding: '4px',
        minWidth: '180px',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        userSelect: 'none',
      }}
    >
      {items.map((item) => {
        // 滑块类型：显示标签 + range input
        if (item.type === 'slider') {
          return (
            <div
              key={item.action}
              style={{ padding: '6px 10px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', color: '#8c8680' }}>{item.label}</span>
                <span style={{ fontSize: '10px', color: '#e89540', fontWeight: 600 }}>
                  {Math.round((item.value ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={item.min ?? 0.1}
                max={item.max ?? 1}
                step={item.step ?? 0.1}
                value={item.value ?? 1}
                onChange={(e) => item.onChange?.(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  background: `linear-gradient(to right, #e89540 0%, #e89540 ${((item.value ?? 1) - (item.min ?? 0.1)) / ((item.max ?? 1) - (item.min ?? 0.1)) * 100}%, #2a2a30 ${((item.value ?? 1) - (item.min ?? 0.1)) / ((item.max ?? 1) - (item.min ?? 0.1)) * 100}%, #2a2a30 100%)`,
                  borderRadius: '2px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          );
        }

        // 普通菜单项
        return (
          <div
            key={item.action}
            onClick={() => onSelect(item.action)}
            style={{
              padding: '7px 12px',
              fontSize: '11px',
              color: '#e6e0d8',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = '#2a2a30'; }}
            onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{item.label}</span>
            {item.checked && (
              <span style={{ color: '#5cb878', fontSize: '10px' }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
