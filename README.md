# System Monitor Tauri

实时系统监控桌面浮窗小部件，基于 **Tauri 2.x + React + Rust**，深色主题，置顶显示 CPU、内存、磁盘、网络、GPU、FPS 和进程信息。

> 另有 Electron 版本：[system-monitor](https://github.com/liu-xintao/system-monitor)

## 功能

- **6 个实时指标**：CPU、内存、磁盘、网络、GPU、FPS 帧率
- **频谱柱**：CPU 和内存使用率历史趋势可视化
- **点击展开详情**：CPU 每核负载 / 内存分布（应用 · 缓存 · 空闲）
- **右键菜单**：刷新频率 / 透明度滑动条 / 窗口置顶 / 退出
- **跨平台**：macOS / Windows / Linux
- **体积小**：打包仅 **~3MB**，内存占用 ~30MB

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Tauri 2.x |
| 前端 | React 19 + TypeScript + Vite 7 |
| 后端 | Rust + sysinfo |
| 测试 | Vitest + Cargo Test |
| 打包 | Tauri Bundler |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
cargo tauri dev

# 运行测试
cargo test --lib && npx vitest run

# 生产构建
cargo tauri build
```

## 与 Electron 版对比

| | Tauri | Electron |
|------|-------|----------|
| 包体积 | **3MB** | 104MB |
| 内存占用 | ~30MB | ~100MB |
| 后端语言 | Rust | TypeScript |
| 系统采集 | sysinfo crate | systeminformation npm |
| 前端 | React（共享） | React |

## 项目结构

```
├── src/                    # React 前端
│   ├── App.tsx             # 主布局
│   ├── App.css             # 深色主题
│   ├── types.ts            # TypeScript 类型
│   ├── components/         # UI 组件
│   │   ├── DragHandle.tsx
│   │   ├── MetricRow.tsx
│   │   ├── SpectrumBars.tsx
│   │   ├── ProcessList.tsx
│   │   └── ContextMenu.tsx
│   └── hooks/              # React Hooks
│       ├── useSystemInfo.ts
│       └── useFps.ts
├── src-tauri/              # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json     # 窗口配置
│   └── src/
│       ├── main.rs         # 入口
│       ├── lib.rs          # 命令注册
│       ├── types.rs        # Rust 结构体
│       ├── collector.rs    # 系统采集器
│       └── commands.rs     # IPC 命令
└── tests/
```

## 打包

```bash
# macOS
cargo tauri build

# Windows（需在 Windows 上编译）
cargo tauri build

# 输出在 src-tauri/target/release/bundle/
```

## License

MIT
