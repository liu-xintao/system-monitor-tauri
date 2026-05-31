/**
 * ProcessList — Top 3 进程列表组件
 *
 * 显示 CPU 占用最高的前 3 个进程名称及其 CPU/内存使用量。
 * 当进程列表为空时，显示占位符 "—"。
 *
 * 内存单位自适应：
 *   小于 1024MB 显示为 "xxxM"
 *   大于等于 1024MB 显示为 "x.xG"（保留一位小数）
 */
import type { JSX } from 'react';
import type { ProcessInfo } from '../types';

interface ProcessListProps {
  /** 按 CPU 占用降序排列的进程列表，最多 3 个 */
  processes: readonly ProcessInfo[];
}

export default function ProcessList({ processes }: ProcessListProps): JSX.Element {
  return (
    <div
      className="process-list"
      style={{
        marginTop: '2px',
        paddingTop: '6px',
        borderTop: '1px dashed #2a2a30',
      }}
    >
      {/* 表头 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#5c5854',
          fontSize: '10px',
          marginBottom: '3px',
        }}
      >
        <span>进程</span>
        <span>CPU / 内存</span>
      </div>

      {/* 进程列表 */}
      {processes.length === 0 ? (
        <div style={{ fontSize: '10px', color: '#5c5854', textAlign: 'center', padding: '4px 0' }}>
          —
        </div>
      ) : (
        processes.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#8c8680',
              marginBottom: '1px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {/* 进程名（溢出省略） */}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
              {p.name}
            </span>
            {/* CPU 和内存占用 */}
            <span style={{ flexShrink: 0, marginLeft: '8px' }}>
              {p.cpu}% · {p.memoryMB >= 1024 ? `${(p.memoryMB / 1024).toFixed(1)}G` : p.memoryMB < 0.1 ? `${(p.memoryMB * 1024).toFixed(0)}K` : `${p.memoryMB}M`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
