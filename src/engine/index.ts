import { SiteConfig, JobRecord } from '../types';
import { Parser } from './parser';
import { Storage } from '../storage';
import { PANEL_TAG_NAME, JobNestPanel } from '../ui/panel';
import { updateCardBadge } from '../ui/badge';
import { HASHED_CLASSES } from '../ui/hashes';
import { Logger } from '../utils/logger';

let listObserver: MutationObserver | null = null;
let urlCheckInterval: number | null = null;
let lastUrl = window.location.href;
let currentConfigs: SiteConfig[] = [];


// 启动引擎
export function startEngine(configs: SiteConfig[]): void {
  currentConfigs = configs;

  // 1. 初次路由判定
  runRouteCheck();

  // 2. 监听浏览器前进后退、哈希改变等
  window.addEventListener('popstate', runRouteCheck);
  window.addEventListener('hashchange', runRouteCheck);

  // 3. SPA 页面下，部分跳转不触发上述事件，使用 interval 脏检查 URL 变化
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
  }
  urlCheckInterval = window.setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      runRouteCheck();
    }
  }, 800);

  // 4. 监听全局 JobRecord 变更，以就地同步列表页卡片状态
  window.removeEventListener('jp-record-changed', handleGlobalRecordChange as EventListener);
  window.addEventListener('jp-record-changed', handleGlobalRecordChange as EventListener);
}

// 路由分发判定
function runRouteCheck(): void {
  const url = window.location.href;
  const hostname = window.location.hostname;

  // 1. 查找匹配平台的配置
  const config = currentConfigs.find(cfg => {
    return cfg.domains.some(domain => {
      // 兼容 Glob 模式（如 *.zhipin.com）或子串匹配
      const cleanDomain = domain.replace(/\*/g, '');
      return hostname.includes(cleanDomain);
    });
  });

  if (!config) {
    // 未匹配到当前平台的配置，静默退出
    cleanupListObserver();
    removePanelFromDom();
    return;
  }



  // 2. 检查是详情页还是列表页
  let matched = false;

  // A. 判定是否为详情页
  if (config.pages.detail && config.pages.detail.urlPattern) {
    try {
      const detailRegex = new RegExp(config.pages.detail.urlPattern, 'i');
      if (detailRegex.test(url)) {
        cleanupListObserver();
        handleDetailPage(config.platformKey, config.pages.detail);
        matched = true;
      }
    } catch (e) {
      Logger.error('详情页 urlPattern 正则匹配出错:', e);
    }
  }

  // B. 判定是否为列表页
  if (!matched && config.pages.list && config.pages.list.urlPattern) {
    try {
      const listRegex = new RegExp(config.pages.list.urlPattern, 'i');
      if (listRegex.test(url)) {
        removePanelFromDom();
        handleListPage(config.platformKey, config.pages.list);
        matched = true;
      }
    } catch (e) {
      Logger.error('列表页 urlPattern 正则匹配出错:', e);
    }
  }

  // C. 两者都不是，清除
  if (!matched) {
    cleanupListObserver();
    removePanelFromDom();
  }
}

// ------------------- 详情页业务处理 -------------------

function handleDetailPage(platformKey: string, detailConfig: NonNullable<SiteConfig['pages']['detail']>): void {
  // 1. 如果页面上已经有正确的面板，不用重复处理
  const existingPanel = document.querySelector(PANEL_TAG_NAME) as JobNestPanel | null;
  if (existingPanel) return;

  let retryCount = 0;
  const maxRetries = 12; // 约6秒的加载缓冲

  function tryParseAndInject() {
    // 检查页面 URL 是否改变（若重试期间用户跳转了，立刻停止）
    const detailRegex = new RegExp(detailConfig.urlPattern, 'i');
    if (!detailRegex.test(window.location.href)) return;

    const result = Parser.parseDetailPage(detailConfig.parsers, window.location.href, document);

    // 如果 jobId 或 title 没拿到，说明 DOM 树还在渲染或加载中，执行退避重试
    if (!result.jobId || !result.title) {
      if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryParseAndInject, 500);
        return;
      }
    }

    // 已经拿全，或达到最大重试次数，尝试注入
    if (result.jobId) {
      injectDetailPagePanel(platformKey, detailConfig, result);
    } else {
      Logger.warn('Job Nest: 未能抓取到 jobId，放弃注入随手记面板。');
    }
  }

  // 延时启动，等待页面基本 DOM 结构渲染
  setTimeout(tryParseAndInject, 300);
}

// 注入详情页面板
function injectDetailPagePanel(
  platformKey: string,
  detailConfig: NonNullable<SiteConfig['pages']['detail']>,
  jobData: { jobId: string; title: string; company: string; salary: string; description?: string; jobTags?: string[] }
): void {
  removePanelFromDom(); // 确保清理旧面板

  const panel = document.createElement(PANEL_TAG_NAME) as JobNestPanel;

  // 1. 尝试配置的目标注入点
  let injected = false;
  const injection = detailConfig.injection;

  if (injection.position !== 'fixed') {
    for (const selector of injection.targetSelector) {
      const target = document.querySelector(selector);
      if (target) {
        try {
          if (injection.position === 'append') {
            target.appendChild(panel);
          } else if (injection.position === 'prepend') {
            target.insertBefore(panel, target.firstChild);
          } else if (injection.position === 'before') {
            target.parentNode?.insertBefore(panel, target);
          } else if (injection.position === 'after') {
            target.parentNode?.insertBefore(panel, target.nextSibling);
          }
          injected = true;
          break;
        } catch (err) {
          Logger.error(`挂载到目标元素失败: ${selector}`, err);
        }
      }
    }
  }

  // 2. 退避降级机制：如果所有挂载点失效或显式设为 fixed
  if (!injected) {
    Logger.info('Job Nest: 精准挂载节点失效或设定为悬浮，启用降级挂载 (Fixed Panel)。');
    panel.classList.add('jp-fixed-panel');
    document.body.appendChild(panel);
  }

  // 3. 初始化面板数据
  panel.initJob(jobData.jobId, platformKey, jobData.title, jobData.company, jobData.salary, jobData.description, jobData.jobTags);
}

function removePanelFromDom(): void {
  const panel = document.querySelector(PANEL_TAG_NAME);
  if (panel) {
    panel.remove();
  }
}

// ------------------- 列表页业务处理 -------------------

let lastPreviewJobGlobalId = '';

function handleListPage(platformKey: string, listConfig: NonNullable<SiteConfig['pages']['list']>): void {
  cleanupListObserver();
  lastPreviewJobGlobalId = '';

  // 1. 先对当前已经渲染的卡片进行一次增量扫描
  scanListCards(platformKey, listConfig);
  checkDetailPreview(platformKey, listConfig);

  // 2. 使用 MutationObserver 增量监听无限滚动和异步渲染的卡片，并实时检测预览面板
  listObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      scanListCards(platformKey, listConfig);
    }
    checkDetailPreview(platformKey, listConfig);
  });

  listObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 扫描列表页的职位卡片
function scanListCards(platformKey: string, listConfig: NonNullable<SiteConfig['pages']['list']>): void {
  const cards = Parser.getTopLevelCards(listConfig.cardSelector);

  cards.forEach(cardEl => {
    const hasProcessed = cardEl.hasAttribute(HASHED_CLASSES.processedAttribute);
    const existingGlobalId = cardEl.getAttribute('data-jp-global-id');

    if (hasProcessed && existingGlobalId) {
      // 若卡片已处理，我们仅在 DOM 发生改变导致 Badge 或灰度属性被清除时，进行按需补偿重绘
      const record = Storage.getJobRecord(existingGlobalId);
      if (record) {
        const hasBadgeEl = cardEl.querySelector('[data-jp-badge="true"]');
        const hasRelativeCls = cardEl.classList.contains('jp-relative-card');
        const needsBadge = record.status === 'saved' || record.status === 'applied' || (!!record.note && record.note.trim().length > 0);
        
        const isGray = cardEl.hasAttribute('data-jp-gray');
        const needsGray = record.status === 'viewed' || record.status === 'rejected';

        if ((needsBadge && (!hasBadgeEl || !hasRelativeCls)) || (needsGray && !isGray) || (!needsGray && isGray)) {
          updateCardBadge(cardEl, record);
        }
      }
      return;
    }

    // 标记卡片已扫描
    cardEl.setAttribute(HASHED_CLASSES.processedAttribute, 'true');

    // 提取 jobId
    const jobId = Parser.extractListCardId(listConfig, cardEl);
    if (!jobId) return;

    const globalId = `${platformKey}_${jobId}`;

    // 在卡片上打上自定义属性，方便后续 jp-record-changed 全局同步时查找
    cardEl.setAttribute('data-jp-global-id', globalId);

    // 比对本地数据库
    const record = Storage.getJobRecord(globalId);
    if (record) {
      updateCardBadge(cardEl, record);
    }
  });
}

function cleanupListObserver(): void {
  if (listObserver) {
    listObserver.disconnect();
    listObserver = null;
  }
  lastPreviewJobGlobalId = '';
}

// 寻找列表页中处于 active 激活状态的卡片
function findActiveCard(cardSelector: string): HTMLElement | null {
  const cards = Parser.getTopLevelCards(cardSelector);
  for (const cardEl of cards) {
    const hasActive = cardEl.classList.contains('active') ||
      Array.from(cardEl.classList).some(cls => cls.includes('active')) ||
      cardEl.getAttribute('class')?.includes('active');
    if (hasActive) {
      return cardEl;
    }
  }
  return null;
}

// 判定职务描述是否为无效/占位用数据（如加载中、加载失败、重新加载等）
function isInvalidDescription(desc?: string): boolean {
  if (!desc || desc.trim().length === 0) return true;
  const invalidKeywords = ['加载中', '加载失败', '重新加载', '正在加载', '数据读取', '网络错误', '点击重试', '请稍后', 'loading', '尊享0大特权提升求职效率'];
  return invalidKeywords.some(keyword => desc.includes(keyword));
}

// 检查列表页右侧详情预览的存在性，并更新挂载随手记面板
function checkDetailPreview(platformKey: string, listConfig: NonNullable<SiteConfig['pages']['list']>): void {
  const previewConfig = listConfig.detailPreview;
  if (!previewConfig) return;

  const triggerEl = document.querySelector(previewConfig.triggerSelector);
  if (!triggerEl) {
    lastPreviewJobGlobalId = '';
    return;
  }

  // 1. 寻找当前处于 active 激活状态的卡片
  const activeCard = findActiveCard(listConfig.cardSelector);
  if (!activeCard) return;

  // 2. 提取当前卡片的 ID
  const jobId = Parser.extractListCardId(listConfig, activeCard);
  if (!jobId) return;

  const globalId = `${platformKey}_${jobId}`;
  const existingPanel = triggerEl.querySelector(PANEL_TAG_NAME) as JobNestPanel | null;

  // 3. 判断是否需要重新挂载或首次挂载
  if (lastPreviewJobGlobalId !== globalId || !existingPanel) {
    lastPreviewJobGlobalId = globalId;

    // 寻找对应平台的 detail 页面解析器配置以复用
    const platformConfig = currentConfigs.find(cfg => cfg.platformKey === platformKey);
    const detailConfig = platformConfig?.pages.detail;
    // 优先获取列表页预览独立解析器，否则退避复用详情页解析器
    const activeParsers = previewConfig.parsers || detailConfig?.parsers;

    let retryCount = 0;
    const maxRetries = 10; // 重试 10 次，每次间隔 300ms，共计 3 秒

    function tryParsePreview() {
      // 检查当前环境是否有效（预览容器和卡片是否依然存在）
      const currentTriggerEl = document.querySelector(previewConfig!.triggerSelector);
      const currentActiveCard = findActiveCard(listConfig.cardSelector);
      if (!currentTriggerEl || !currentActiveCard) return;

      // 提取最新的卡片 ID 校验，防止在重试周期内用户已点击切换了卡片
      const currentJobId = Parser.extractListCardId(listConfig, currentActiveCard);
      const currentGlobalId = `${platformKey}_${currentJobId}`;
      if (currentGlobalId !== globalId) return; // 已经发生卡片切换，直接静默退出本次重试

      let parsedData = { jobId, title: '', company: '', salary: '', description: '', jobTags: [] as string[] };

      if (activeParsers) {
        // A. 优先从左侧激活卡片节点中提取职位基本数据（无网络延时）
        const cardResult = Parser.parseDetailPage(activeParsers, '', currentActiveCard);

        // B. 其次从右侧预览大容器中提取完整数据（包含长文本 JD 等）
        const previewResult = Parser.parseDetailPage(activeParsers, window.location.href, currentTriggerEl as HTMLElement);

        // C. 数据合并：卡片信息优先（防延时），预览大框兜底/补充
        parsedData.title = cardResult.title || previewResult.title || '';
        parsedData.company = cardResult.company || previewResult.company || '';
        parsedData.salary = cardResult.salary || previewResult.salary || '';
        parsedData.description = cardResult.description || previewResult.description || '';

        // 原始标签合并去重
        const tagsSet = new Set([...(cardResult.jobTags || []), ...(previewResult.jobTags || [])]);
        parsedData.jobTags = Array.from(tagsSet).slice(0, 15);
      } else {
        // 模糊兜底提取 (卡片优先，预览兜底)
        const getFuzzyTitle = (root: HTMLElement) => root.querySelector('h1, [class*="title" i]')?.textContent?.trim() || '';
        const getFuzzyCompany = (root: HTMLElement) => root.querySelector('[class*="company" i], [class*="brand" i]')?.textContent?.trim() || '';
        const getFuzzySalary = (root: HTMLElement) => root.querySelector('[class*="salary" i]')?.textContent?.trim() || '';
        const getFuzzyDesc = (root: HTMLElement) => root.querySelector('[class*="job-sec" i], [class*="detail" i], [class*="desc" i], [class*="intro" i]')?.textContent?.trim() || '';
        const getFuzzyTags = (root: HTMLElement) => {
          const tagSpans = root.querySelectorAll('[class*="tag" i] span, [class*="properties" i] span');
          const tags: string[] = [];
          tagSpans.forEach(span => {
            const txt = span.textContent?.trim();
            if (txt && !tags.includes(txt) && txt.length <= 15) {
              tags.push(txt);
            }
          });
          return tags;
        };

        const cardTitle = getFuzzyTitle(currentActiveCard);
        const cardCompany = getFuzzyCompany(currentActiveCard);
        const cardSalary = getFuzzySalary(currentActiveCard);
        const cardTags = getFuzzyTags(currentActiveCard);

        const previewTitle = getFuzzyTitle(currentTriggerEl as HTMLElement);
        const previewCompany = getFuzzyCompany(currentTriggerEl as HTMLElement);
        const previewSalary = getFuzzySalary(currentTriggerEl as HTMLElement);
        const previewDesc = getFuzzyDesc(currentTriggerEl as HTMLElement);
        const previewTags = getFuzzyTags(currentTriggerEl as HTMLElement);

        parsedData.title = cardTitle || previewTitle;
        parsedData.company = cardCompany || previewCompany;
        parsedData.salary = cardSalary || previewSalary;
        parsedData.description = previewDesc;

        const tagsSet = new Set([...cardTags, ...previewTags]);
        parsedData.jobTags = Array.from(tagsSet).slice(0, 15);
      }

      // 如果发现标题/公司为空，或者职务描述暂未加载（为空或包含错误占位符），且重试次数未用尽，则退避重试
      const titleOrCompanyEmpty = !parsedData.title || !parsedData.company;
      const descInvalid = isInvalidDescription(parsedData.description);
      if ((titleOrCompanyEmpty || descInvalid) && retryCount < maxRetries) {
        retryCount++;
        setTimeout(tryParsePreview, 300);
        return;
      }

      // 拿到了合并后完备的数据，或者重试次数用尽，则挂载或更新面板
      injectPreviewPanel(platformKey, previewConfig!, currentTriggerEl as HTMLElement, parsedData);
    }

    tryParsePreview();
  } else {
    // 已经挂载了面板且职位未切换。当 DOM 发生改变时，检查如果先前保存的 JD 依然无效，则同步尝试提取并补全更新
    const localRecord = Storage.getJobRecord(globalId);
    if (localRecord && isInvalidDescription(localRecord.description)) {
      const platformConfig = currentConfigs.find(cfg => cfg.platformKey === platformKey);
      const detailConfig = platformConfig?.pages.detail;
      const activeParsers = previewConfig.parsers || detailConfig?.parsers;

      if (activeParsers) {
        const previewResult = Parser.parseDetailPage(activeParsers, window.location.href, triggerEl as HTMLElement);
        if (previewResult.description && !isInvalidDescription(previewResult.description)) {
          localRecord.description = previewResult.description;
          if (previewResult.jobTags && previewResult.jobTags.length > 0) {
            const tagsSet = new Set([...(localRecord.jobTags || []), ...previewResult.jobTags]);
            localRecord.jobTags = Array.from(tagsSet).slice(0, 15);
          }
          Storage.saveJobRecord(localRecord);
          existingPanel.initJob(jobId, platformKey, localRecord.title, localRecord.company, localRecord.salary, localRecord.description, localRecord.jobTags);
        }
      } else {
        const previewDesc = triggerEl.querySelector('[class*="job-sec" i], [class*="detail" i], [class*="desc" i], [class*="intro" i]')?.textContent?.trim() || '';
        if (previewDesc && !isInvalidDescription(previewDesc)) {
          localRecord.description = previewDesc;
          Storage.saveJobRecord(localRecord);
          existingPanel.initJob(jobId, platformKey, localRecord.title, localRecord.company, localRecord.salary, localRecord.description, localRecord.jobTags);
        }
      }
    }
  }
}

function injectPreviewPanel(
  platformKey: string,
  previewConfig: NonNullable<NonNullable<SiteConfig['pages']['list']>['detailPreview']>,
  triggerEl: HTMLElement,
  jobData: { jobId: string; title: string; company: string; salary: string; description?: string; jobTags?: string[] }
): void {
  const existingPanel = triggerEl.querySelector(PANEL_TAG_NAME) as JobNestPanel | null;
  const targetGlobalId = `${platformKey}_${jobData.jobId}`;

  // 如果已经存在面板了，且其绑定的职位全局 ID 与我们要挂载的一致，则就地调用 initJob 更新数据，彻底消除销毁重建导致的闪烁和闪退
  if (existingPanel) {
    const panelGlobalId = existingPanel.getAttribute('data-job-global-id');
    if (panelGlobalId === targetGlobalId) {
      existingPanel.initJob(jobData.jobId, platformKey, jobData.title, jobData.company, jobData.salary, jobData.description, jobData.jobTags);
      return;
    }
    existingPanel.remove();
  }

  const panel = document.createElement(PANEL_TAG_NAME) as JobNestPanel;
  const injection = previewConfig.injection;
  let injected = false;

  for (const selector of injection.targetSelector) {
    const target = triggerEl.querySelector(selector) || (selector === 'body' ? null : document.querySelector(selector));
    if (target) {
      try {
        if (injection.position === 'append') {
          target.appendChild(panel);
        } else if (injection.position === 'prepend') {
          target.insertBefore(panel, target.firstChild);
        } else if (injection.position === 'before') {
          target.parentNode?.insertBefore(panel, target);
        } else if (injection.position === 'after') {
          target.parentNode?.insertBefore(panel, target.nextSibling);
        }
        injected = true;
        break;
      } catch (err) {
        Logger.error(`挂载预览随手记面板失败: ${selector}`, err);
      }
    }
  }

  if (!injected) {
    panel.classList.add('jp-fixed-panel');
    document.body.appendChild(panel);
  }

  panel.initJob(jobData.jobId, platformKey, jobData.title, jobData.company, jobData.salary, jobData.description, jobData.jobTags);
}

// ------------------- 全局协同刷新逻辑 -------------------

// 当详情页的用户操作导致 JobRecord 更改，同步更新当前页的列表卡片（若是在分屏或 SPA 中）
function handleGlobalRecordChange(event: CustomEvent<JobRecord>): void {
  const record = event.detail;
  if (!record || !record.jobGlobalId) return;

  // 找到页面上所有包含该 JobID 的卡片
  const matchingCards = document.querySelectorAll(`[data-jp-global-id="${record.jobGlobalId}"]`);
  matchingCards.forEach(card => {
    updateCardBadge(card as HTMLElement, record);
  });
}
