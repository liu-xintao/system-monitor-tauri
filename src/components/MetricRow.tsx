/**
 * MetricRow — 指标数据行组件
 *
 * 单行展示一个监控指标（CPU、MEM、DSK 等），布局如下：
 *   [标签] [次要值] [主数值] [额外标签] [频谱图] [展开箭头]
 *
 * 点击展开功能：
 *   当提供了 detail 属性时，点击该行会展开详情面板（如 CPU 每核负载）。
 *   再次点击收起，或点击面板内的"点击收起"按钮。
 *
 * 动画：
 *   展开面板使用 CSS animation slideDown 实现平滑展开效果。
 *   展开箭头旋转 180° 表示当前状态。
 */
import { useState } from 'react';
import type { JSX } from 'react';
import SpectrumBars from './SpectrumBars';

interface MetricRowProps {
  /** 左侧标签文字（如 "CPU"、"MEM"） */
  label: string;
  /** 标签和频谱图的主题色 */
  color: string;
  /** 主数值文字（加粗显示） */
  mainValue: string;
  /** 次要文字，显示在主数值左侧 */
  subValue?: string;
  /** 频谱数据数组，有值时右侧显示频谱柱 */
  spectrumData?: number[];
  /** 额外标签文字（如 "45°C"），显示在主数值右侧 */
  extra?: string;
  /** 额外标签的内联样式，用于设置文字颜色等 */
  extraStyle?: React.CSSProperties;
  /** 点击展开后的详情面板内容，不传则该行不可展开 */
  detail?: React.ReactNode;
}

export default function MetricRow({
  label,
  color,
  mainValue,
  subValue,
  spectrumData,
  extra,
  extraStyle,
  detail,
}: MetricRowProps): JSX.Element {
  /** 展开/收起状态 */
  const [pinned, setPinned] = useState(false);

  const showDetail = pinned && detail;

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="metric-row"
        onClick={() => detail && setPinned(!pinned)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: showDetail ? '2px' : '10px',
          padding: '6px 8px',
          paddingBottom: '8px',
          borderBottom: '1px solid #1e1e24',
          fontVariantNumeric: 'tabular-nums',
          cursor: detail ? 'pointer' : 'default',
          background: showDetail ? '#1c1c21' : 'transparent',
          borderRadius: showDetail ? '6px 6px 0 0' : '0',
          transition: 'background 0.15s ease, border-radius 0.15s ease',
          borderBottomLeftRadius: showDetail ? '0' : undefined,
          borderBottomRightRadius: showDetail ? '0' : undefined,
          borderBottomColor: showDetail ? 'transparent' : undefined,
        }}
      >
        {/* 左侧标签 */}
        <span
          className="metric-label"
          style={{ color, fontWeight: 600, fontSize: '11px', width: '32px', flexShrink: 0 }}
        >
          {label}
        </span>

        {/* 右侧数据区 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            flex: 1,
            justifyContent: 'flex-end',
          }}
        >
          {/* 次要值 */}
          {subValue && (
            <span style={{ fontSize: '10px', color: '#5c5854', marginRight: 'auto' }}>
              {subValue}
            </span>
          )}

          {/* 主数值（根据长度自适应字号） */}
          <span
            className="metric-value"
            style={{
              fontSize: mainValue.length > 6 ? '12px' : '14px',
              fontWeight: 700,
              color: '#e6e0d8',
            }}
          >
            {mainValue}
          </span>

          {/* 额外信息标签 */}
          {extra && (
            <span
              className="metric-extra"
              style={{
                padding: '2px 6px',
                background: '#1e1e22',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                ...extraStyle,
              }}
            >
              {extra}
            </span>
          )}

          {/* 频谱柱 */}
          {spectrumData && spectrumData.length > 0 && (
            <SpectrumBars data={spectrumData} color={color} />
          )}

          {/* 可展开指示器（向下箭头） */}
          {detail && (
            <span
              style={{
                fontSize: '8px',
                color: pinned ? color : '#3a3a40',
                transition: 'color 0.15s ease, transform 0.15s ease',
                transform: pinned ? 'rotate(180deg)' : 'none',
                marginLeft: '2px',
              }}
            >
              ▼
            </span>
          )}
        </div>
      </div>

      {/* 详情弹出层：展开后显示 */}
      {showDetail && (
        <div
          style={{
            background: '#1c1c21',
            border: '1px solid #2a2a30',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            padding: '8px 12px 10px',
            marginBottom: '10px',
            fontSize: '10px',
            color: '#8c8680',
            animation: 'slideDown 0.15s ease',
          }}
        >
          {detail}
          {/* 收起按钮 */}
          {pinned && (
            <div
              onClick={() => setPinned(false)}
              style={{
                textAlign: 'center',
                marginTop: '6px',
                color: '#5c5854',
                cursor: 'pointer',
                fontSize: '9px',
              }}
            >
              点击收起
            </div>
          )}
        </div>
      )}
    </div>
  );
}
