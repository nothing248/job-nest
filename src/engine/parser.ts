import { SiteConfig, DetailParsers } from '../types';
import { Logger } from '../utils/logger';

interface DetailParseResult {
  jobId: string;
  title: string;
  company: string;
  salary: string;
  description?: string;
  jobTags?: string[];
}

// 过滤元素内部的 style 和 script 标签，提取干净的纯文本
function getCleanTextContent(el: HTMLElement | null): string {
  if (!el) return '';
  
  if (typeof el.cloneNode === 'function') {
    try {
      const clone = el.cloneNode(true) as HTMLElement;
      const removeList = clone.querySelectorAll('style, script');
      removeList.forEach(s => s.remove());
      return clone.textContent?.trim() || '';
    } catch (e) {
      // 容错退避
    }
  }
  
  return el.textContent?.trim() || '';
}

// 模糊属性匹配辅助函数
function fuzzyQuerySelector(root: Document | HTMLElement, keyword: string, tags: string[]): HTMLElement | null {
  for (const tag of tags) {
    try {
      // 属性选择器，不区分大小写匹配 class 或 id 含有关键字的节点
      const selector = `${tag}[class*="${keyword}" i], ${tag}[id*="${keyword}" i]`;
      const el = root.querySelector(selector);
      if (el && el.textContent?.trim()) {
        return el as HTMLElement;
      }
    } catch (e) {
      // 忽略非法 CSS 选择器错误
    }
  }
  return null;
}

export const Parser = {
  // 解析详情页信息
  parseDetailPage(
    parsers: DetailParsers,
    url: string,
    root: Document | HTMLElement = document
  ): DetailParseResult {
    
    // 1. 解析 jobId
    let jobId = '';
    
    // 优先从 URL 正则匹配
    if (parsers.jobId.fromUrl) {
      try {
        const regex = new RegExp(parsers.jobId.fromUrl, 'i');
        const match = url.match(regex);
        if (match && match[1]) {
          jobId = match[1];
        }
      } catch (e) {
        Logger.error('jobId fromUrl 正则执行失败:', e);
      }
    }
    
    // 如果 URL 提取失败，尝试 DOM 备选选择器
    if (!jobId && parsers.jobId.fromDom) {
      for (const selector of parsers.jobId.fromDom) {
        const el = root.querySelector(selector);
        const text = el?.textContent?.trim() || el?.getAttribute('data-job-id') || el?.getAttribute('id');
        if (text) {
          jobId = text;
          break;
        }
      }
    }

    // 2. 解析 Title (职位名)
    let title = '';
    // 尝试精准选择器 fallback 链
    for (const selector of parsers.title) {
      const el = root.querySelector(selector);
      if (el && el.textContent?.trim()) {
        title = el.textContent.trim();
        break;
      }
    }
    // 兜底模糊匹配
    if (!title) {
      const fuzzyEl = fuzzyQuerySelector(root, 'title', ['h1', 'h2', 'div', 'span']) 
                     || fuzzyQuerySelector(root, 'job-name', ['h1', 'h2', 'div', 'span']);
      if (fuzzyEl) {
        title = fuzzyEl.textContent!.trim();
      }
    }

    // 3. 解析 Company (公司名)
    let company = '';
    // 尝试精准选择器 fallback 链
    for (const selector of parsers.company) {
      const el = root.querySelector(selector);
      if (el && el.textContent?.trim()) {
        company = el.textContent.trim();
        break;
      }
    }
    // 兜底模糊匹配
    if (!company) {
      const fuzzyEl = fuzzyQuerySelector(root, 'company', ['div', 'a', 'span', 'p', 'h3'])
                     || fuzzyQuerySelector(root, 'brand', ['div', 'a', 'span', 'p']);
      if (fuzzyEl) {
        company = fuzzyEl.textContent!.trim();
      }
    }

    // 4. 解析 Salary (薪资)
    let salary = '';
    // 尝试精准选择器 fallback 链
    for (const selector of parsers.salary.selectors) {
      const el = root.querySelector(selector);
      if (el && el.textContent?.trim()) {
        salary = el.textContent.trim();
        break;
      }
    }
    // 兜底：正文文本正则匹配
    if (!salary && parsers.salary.regexFallback) {
      try {
        let textContent = '';
        if (root && root.nodeType === 9) {
          const doc = root as Document;
          textContent = doc.body ? doc.body.textContent || '' : '';
        } else {
          textContent = root.textContent || '';
        }
        if (textContent) {
          const regex = new RegExp(parsers.salary.regexFallback, 'gi');
          const match = textContent.match(regex);
          if (match && match[0]) {
            salary = match[0].trim();
          }
        }
      } catch (e) {
        Logger.error('salary regexFallback 执行失败:', e);
      }
    }
    
    // 5. 解析 Description (职务描述)
    let description = '';
    if (parsers.description) {
      for (const selector of parsers.description) {
        const el = root.querySelector(selector);
        if (el) {
          const cleanText = getCleanTextContent(el as HTMLElement);
          if (cleanText) {
            description = cleanText;
            break;
          }
        }
      }
    }
    // 兜底模糊匹配
    if (!description) {
      const fuzzyEl = fuzzyQuerySelector(root, 'detail', ['div', 'section', 'article'])
                     || fuzzyQuerySelector(root, 'desc', ['div', 'section', 'article'])
                     || fuzzyQuerySelector(root, 'intro', ['div', 'section', 'article']);
      if (fuzzyEl) {
        description = getCleanTextContent(fuzzyEl as HTMLElement);
      }
    }

    if (description) {
      description = description.substring(0, 5000).trim();
    }

    // 6. 解析 JobTags (职位要求/福利原始标签)
    const jobTags: string[] = [];
    if (parsers.jobTags) {
      for (const selector of parsers.jobTags) {
        try {
          const elements = root.querySelectorAll(selector);
          elements.forEach(el => {
            const txt = el.textContent?.trim();
            if (txt) {
              const splitTags = txt.split(/[\s,，|/、\u2022·]+/).map(t => t.trim()).filter(Boolean);
              splitTags.forEach(t => {
                if (t && !jobTags.includes(t)) {
                  jobTags.push(t.substring(0, 20));
                }
              });
            }
          });
        } catch (e) {
          // 忽略
        }
      }
    }
    // 模糊匹配兜底
    if (jobTags.length === 0) {
      try {
        const fuzzyElements = root.querySelectorAll('[class*="tag-list" i] span, [class*="job-tags" i] span, [class*="properties" i] span');
        fuzzyElements.forEach(el => {
          const txt = el.textContent?.trim();
          if (txt) {
            const splitTags = txt.split(/[\s,，|/、\u2022·]+/).map(t => t.trim()).filter(Boolean);
            splitTags.forEach(t => {
              if (t && !jobTags.includes(t) && t.length <= 15) {
                jobTags.push(t.substring(0, 20));
              }
            });
          }
        });
      } catch (e) {
        // 忽略
      }
    }
    const finalJobTags = jobTags.slice(0, 15);
    
    // 清理一下职位和公司名可能含有的多余换行符、空格
    title = title.replace(/\s+/g, ' ');
    company = company.replace(/\s+/g, ' ');
    salary = salary.replace(/\s+/g, ' ');

    return { jobId, title, company, salary, description, jobTags: finalJobTags };
  },

  // 提取列表页卡片的 ID
  extractListCardId(
    listConfig: NonNullable<SiteConfig['pages']['list']>,
    cardEl: HTMLElement
  ): string {
    const extractor = listConfig.cardIdExtractor;
    let rawValue = '';

    if (extractor.attrName === 'href') {
      // 如果是 href，优先获取卡片内 a 标签的 href
      const aEl = cardEl.tagName === 'A' ? cardEl : cardEl.querySelector('a');
      rawValue = aEl?.getAttribute('href') || '';
    } else {
      rawValue = cardEl.getAttribute(extractor.attrName) || '';
      if (!rawValue) {
        // 尝试在子元素上搜寻该属性
        const subEl = cardEl.querySelector(`[${extractor.attrName}]`);
        rawValue = subEl?.getAttribute(extractor.attrName) || '';
      }
    }

    if (!rawValue) return '';

    if (extractor.regex) {
      try {
        const regex = new RegExp(extractor.regex);
        const match = rawValue.match(regex);
        if (match) {
          // 优先使用捕获组
          return match[1] || match[0];
        }
      } catch (e) {
        Logger.error('列表 cardIdExtractor regex 执行错误:', e);
      }
    }

    return rawValue;
  },

  // 获取最外层的卡片容器，过滤掉嵌套在其他卡片容器内部的节点
  getTopLevelCards(cardSelector: string, root: Document | HTMLElement = document): HTMLElement[] {
    const allCards = Array.from(root.querySelectorAll(cardSelector)) as HTMLElement[];
    return allCards.filter(card => {
      let parent = card.parentElement;
      while (parent) {
        if (allCards.includes(parent as HTMLElement)) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    });
  }
};
