// 动态生成防检测随机哈希 CSS 类名
function generateHashClass(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}_${rand}`;
}

export const HASHED_CLASSES = {
  // 面板容器
  panelContainer: generateHashClass('jp_panel_container'),
  // 面板内的主要布局类
  panelHeader: generateHashClass('jp_header'),
  panelBody: generateHashClass('jp_body'),
  panelFooter: generateHashClass('jp_footer'),
  // 各种状态按键和输入框
  statusBtn: generateHashClass('jp_status_btn'),
  activeStatus: generateHashClass('jp_active'),
  tagContainer: generateHashClass('jp_tag_container'),
  tagItem: generateHashClass('jp_tag_item'),
  tagInput: generateHashClass('jp_tag_input'),
  noteTextarea: generateHashClass('jp_note_textarea'),
  
  // 外部卡片注入和样式
  grayCard: generateHashClass('jp_gray_card'),
  badge: generateHashClass('jp_card_badge'),
  badgeText: generateHashClass('jp_badge_text'),
  
  // 列表标记属性（防重复处理）
  processedAttribute: 'data-jp-processed',
  
  // 日志查看器
  logDrawer: generateHashClass('jp_log_drawer'),
  logList: generateHashClass('jp_log_list'),
  logItem: generateHashClass('jp_log_item'),
  logHeader: generateHashClass('jp_log_header')
};
