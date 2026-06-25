import { HASHED_CLASSES } from './hashes';

// 注入到原页面 head 的全局样式（主要负责灰度化和列表卡片 Badge）
export function injectGlobalStyles(): void {
  const css = `
    [data-jp-gray="true"] {
      filter: grayscale(100%) !important;
      opacity: 0.55 !important;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
    }
    [data-jp-gray="true"]:hover {
      filter: none !important;
      opacity: 1 !important;
    }
    
    /* 列表卡片容器相对定位，确保 Badge 定位正确 */
    .jp-relative-card {
      position: relative !important;
    }
    
    .${HASHED_CLASSES.badge} {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      z-index: 99 !important;
      background: linear-gradient(135deg, #f59e0b, #d97706) !important;
      color: #ffffff !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      padding: 3px 8px !important;
      border-radius: 20px !important;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3) !important;
      pointer-events: auto !important;
      max-width: 150px !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      cursor: help !important;
      font-family: system-ui, -apple-system, sans-serif !important;
      animation: jp-bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
    }
    
    @keyframes jp-bounce-in {
      0% {
        transform: scale(0.3);
        opacity: 0;
      }
      50% {
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }
  `;
  
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);
}

// 返回挂载到 Shadow DOM 内部的面板 CSS 样式
export function getPanelStyles(): string {
  return `
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #f3f4f6;
      box-sizing: border-box;
      margin: 12px 0;
      width: 100%;
    }
    
    *, *::before, *::after {
      box-sizing: inherit;
    }
    
    /* 核心面板容器 - Premium 玻璃拟态暗黑面板 */
    .${HASHED_CLASSES.panelContainer} {
      background: linear-gradient(135deg, rgba(20, 24, 33, 0.95), rgba(30, 37, 50, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: all 0.3s ease;
      font-size: 14px;
    }
    
    /* 悬浮降级模式样式 */
    :host(.jp-fixed-panel) {
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      width: 340px !important;
      z-index: 99999 !important;
      margin: 0 !important;
      animation: jp-slide-up 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }
    
    @keyframes jp-slide-up {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    /* 面板头部 */
    .${HASHED_CLASSES.panelHeader} {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 10px;
    }
    
    .${HASHED_CLASSES.panelHeader} h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 700;
      background: linear-gradient(120deg, #a78bfa, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: 0.5px;
    }
    
    .jp-job-info {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 2px;
    }
    
    .jp-job-original-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
    }
    
    .jp-job-original-tag {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #9ca3af;
      font-size: 10px;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-weight: 500;
    }
    
    /* 状态快捷标记按钮组 */
    .jp-status-title {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .jp-status-group {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 14px;
    }
    
    .${HASHED_CLASSES.statusBtn} {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      color: #d1d5db;
      padding: 8px 4px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .${HASHED_CLASSES.statusBtn}:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: translateY(-1px);
    }
    
    /* 状态激活色彩 */
    .${HASHED_CLASSES.statusBtn}.jp-status-viewed.${HASHED_CLASSES.activeStatus} {
      background: rgba(156, 163, 175, 0.2);
      border-color: rgba(156, 163, 175, 0.6);
      color: #f3f4f6;
      box-shadow: 0 0 10px rgba(156, 163, 175, 0.25);
    }
    
    .${HASHED_CLASSES.statusBtn}.jp-status-saved.${HASHED_CLASSES.activeStatus} {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(245, 158, 11, 0.6);
      color: #fbbf24;
      box-shadow: 0 0 10px rgba(245, 158, 11, 0.25);
    }
    
    .${HASHED_CLASSES.statusBtn}.jp-status-applied.${HASHED_CLASSES.activeStatus} {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.6);
      color: #34d399;
      box-shadow: 0 0 10px rgba(16, 185, 129, 0.25);
    }
    
    .${HASHED_CLASSES.statusBtn}.jp-status-rejected.${HASHED_CLASSES.activeStatus} {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.6);
      color: #f87171;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.25);
    }
    
    /* 备注输入框 */
    .jp-note-title {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .${HASHED_CLASSES.noteTextarea} {
      width: 100%;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 8px 10px;
      color: #e5e7eb;
      font-size: 12.5px;
      resize: vertical;
      min-height: 60px;
      font-family: inherit;
      transition: all 0.2s ease;
      margin-bottom: 12px;
    }
    
    .${HASHED_CLASSES.noteTextarea}:focus {
      outline: none;
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(0, 0, 0, 0.25);
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.15);
    }
    
    /* 标签配置 */
    .jp-tag-title {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 6px;
    }
    
    .${HASHED_CLASSES.tagContainer} {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }
    
    .${HASHED_CLASSES.tagItem} {
      background: rgba(139, 92, 246, 0.12);
      border: 1px solid rgba(139, 92, 246, 0.25);
      color: #c084fc;
      font-size: 11px;
      padding: 2.5px 8px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 4px;
      animation: jp-scale-in 0.2s ease;
    }
    
    @keyframes jp-scale-in {
      from { transform: scale(0.85); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .${HASHED_CLASSES.tagItem} span.jp-tag-del {
      cursor: pointer;
      color: #a78bfa;
      font-weight: bold;
      transition: color 0.15s;
    }
    
    .${HASHED_CLASSES.tagItem} span.jp-tag-del:hover {
      color: #ef4444;
    }
    
    .${HASHED_CLASSES.tagInput} {
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 2.5px 10px;
      color: #f3f4f6;
      font-size: 11px;
      outline: none;
      width: 80px;
      transition: all 0.2s;
    }
    
    .${HASHED_CLASSES.tagInput}:focus {
      width: 110px;
      background: rgba(0, 0, 0, 0.2);
      border-style: solid;
      border-color: rgba(139, 92, 246, 0.5);
    }
    
    /* 底部操作反馈 */
    .${HASHED_CLASSES.panelFooter} {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #6b7280;
    }
    
    .jp-save-status {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #10b981;
      opacity: 0;
      transition: opacity 0.3s;
    }
    
    .jp-save-status.jp-show {
      opacity: 1;
    }
    
    .jp-close-btn {
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      font-size: 12px;
      display: none; /* 仅在 fixed 模式下通过 JS 显示 */
    }
    
    .jp-close-btn:hover {
      color: #f3f4f6;
    }
    
    /* 调试日志抽屉 */
    .${HASHED_CLASSES.logDrawer} {
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      margin-top: 0;
      opacity: 0;
      border-top: 1px dashed rgba(255, 255, 255, 0.0);
    }
    
    .${HASHED_CLASSES.logDrawer}.jp-open {
      max-height: 250px;
      margin-top: 12px;
      padding-top: 10px;
      opacity: 1;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
    }
    
    .${HASHED_CLASSES.logHeader} {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .${HASHED_CLASSES.logHeader} span {
      font-size: 11px;
      font-weight: 700;
      color: #a78bfa;
      letter-spacing: 0.5px;
    }
    
    .jp-log-clear {
      font-size: 10px;
      color: #6b7280;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    
    .jp-log-clear:hover {
      color: #f87171;
    }
    
    .${HASHED_CLASSES.logList} {
      max-height: 180px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 6px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    /* 滚动条美化 */
    .${HASHED_CLASSES.logList}::-webkit-scrollbar {
      width: 4px;
    }
    .${HASHED_CLASSES.logList}::-webkit-scrollbar-track {
      background: transparent;
    }
    .${HASHED_CLASSES.logList}::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .${HASHED_CLASSES.logList}::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .${HASHED_CLASSES.logItem} {
      font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
      font-size: 10px;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .${HASHED_CLASSES.logItem}.jp-log-info {
      color: #d1d5db;
    }
    
    .${HASHED_CLASSES.logItem}.jp-log-warn {
      color: #fbbf24;
    }
    
    .${HASHED_CLASSES.logItem}.jp-log-error {
      color: #f87171;
    }
    
    /* 支持点击彩蛋的特效 */
    .jp-version-clicker {
      cursor: pointer;
      user-select: none;
    }
    .jp-version-clicker:active {
      color: #a78bfa;
    }
    
    /* 职务描述折叠展示样式 */
    .jp-jd-title {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .jp-jd-toggle {
      background: none;
      border: none;
      color: #a78bfa;
      cursor: pointer;
      font-size: 11px;
      padding: 0;
      font-weight: 600;
      transition: color 0.2s;
    }
    
    .jp-jd-toggle:hover {
      color: #c084fc;
    }
    
    .jp-jd-content {
      max-height: 0;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.0);
      border-radius: 8px;
      padding: 0;
      color: #d1d5db;
      font-size: 11.5px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
      opacity: 0;
    }
    
    .jp-jd-content.jp-jd-open {
      max-height: 180px;
      overflow-y: auto;
      padding: 8px 10px;
      opacity: 1;
      border-color: rgba(255, 255, 255, 0.08);
      margin-bottom: 12px;
    }
    
    .jp-jd-content::-webkit-scrollbar {
      width: 4px;
    }
    .jp-jd-content::-webkit-scrollbar-track {
      background: transparent;
    }
    .jp-jd-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .jp-jd-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  `;
}
