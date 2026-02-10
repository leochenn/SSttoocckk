# 雪球监控助手重构进度表

## 1. 基础设施建设 (Infrastructure)
- [x] 创建 `REFACTOR_PROGRESS.md`
- [x] 检查 `manifest.json` 支持情况 (ES Modules)
- [x] 提取常量与配置 `modules/config.js`
- [x] 封装统一日志模块 `modules/logger.js`

## 2. Background 模块化 (Background Refactoring)
- [x] 封装通知模块 `modules/notifier.js` (NTFY + Windows Notification)
- [x] 封装存储模块 `modules/storage.js` (Settings + Status + LastState)
- [x] 封装调度模块 `modules/scheduler.js` (Alarm + TradingHours)
- [x] 封装核心监控逻辑 `modules/monitor-core.js` (performCheck)
- [x] 重构 `background.js` 为纯调度入口

## 3. Content 传感器化 (Content Refactoring)
- [x] 规范化 Content 日志系统
- [x] 提取时间线传感器 `content/sensors/timeline.js` (已整合到 content.js 对象架构)
- [x] 提取系统消息传感器 `content/sensors/system.js` (已整合到 content.js 对象架构)
- [x] 重构 `content.js` 为纯指令执行器

## 4. 健壮性与自测 (Robustness & Testing)
- [x] 强化 Content 脚本自动重注入机制 (已整合到 MonitorCore)
- [x] Popup 层模块化重构 (接入 Storage/Logger)
- [x] 系统消息详情传感器增强 (IM 窗口深度监控)
- [x] 验证全流程功能一致性
- [x] 最终代码审查与清理

---
**当前进度**: 重构已全部完成。
