/**
 * SpectrumBars — 纯 CSS 频谱柱状图组件
 *
 * 将数值数组渲染为等宽竖条，用于展示 CPU、内存等指标的近期变化趋势。
 *
 * 设计特点：
 *   - 纯 CSS 实现，无需 Canvas / SVG，渲染性能开销低
 *   - 竖条高度按 maxValue 归一化，高度范围 3px ~ maxHeight
 *   - 不透明度随数值线性变化（0.4 ~ 1.0），增强视觉层次感
 *   - CSS transition 提供平滑动画过渡
 */
import type { JSX } from 'react';

interface SpectrumBarsProps {
  /** 0-100 的数值数组，每根柱子对应一个值 */
  data: number[];
  /** 柱子的颜色（CSS 色值，如 '#e89540'） */
  color: string;
  /** 最大值归一化基准，默认 100，超出时截断为 1 */
  maxValue?: number;
}

export default function SpectrumBars({ data, color, maxValue = 100 }: SpectrumBarsProps): JSX.Element {
  const maxHeight = 20; // 柱子最大高度 px

  return (
    <div
      className="spectrum-bars"
      style={{
        display: 'flex',
        gap: '1px',
        alignItems: 'flex-end',
        height: maxHeight,
      }}
    >
      {data.map((value, i) => {
        // 归一化比率，限制不超过 1
        const ratio = Math.min(value / maxValue, 1);
        // 高度映射：最低 3px（保证可见），最高 maxHeight
        const height = Math.max(3, ratio * maxHeight);
        // 不透明度映射：0.4（最低）~ 1.0（满值）
        const opacity = 0.4 + ratio * 0.6;

        return (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${height}px`,
              backgroundColor: color,
              borderRadius: '1px',
              opacity,
              transition: 'height 0.3s ease',
            }}
          />
        );
      })}
    </div>
  );
}
