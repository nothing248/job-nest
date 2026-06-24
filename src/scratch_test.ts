import { Parser } from './engine/parser';
import { SiteConfig } from './types';

// ==================== 1. 模拟 DOM API ====================

class FakeElement {
  public tagName: string;
  public className: string = '';
  public textContent: string = '';
  public attributes: Record<string, string> = {};
  public children: FakeElement[] = [];
  public nodeType: number = 1;

  constructor(tagName: string, content: string = '') {
    this.tagName = tagName.toUpperCase();
    this.textContent = content;
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
    if (name === 'class') {
      this.className = value;
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] !== undefined ? this.attributes[name] : null;
  }

  appendChild(el: FakeElement) {
    this.children.push(el);
  }

  querySelector(selector: string): FakeElement | null {
    const cleanSel = selector.trim();
    
    const match = (el: FakeElement): boolean => {
      // a. .name 类匹配
      if (cleanSel.startsWith('.')) {
        const cls = cleanSel.substring(1);
        return el.className.split(' ').includes(cls) || el.className.includes(cls);
      }
      
      // b. 模糊属性选择器，如 div[class*="title" i] 或者 [class*="salary"]
      if (cleanSel.includes('[class*=')) {
        const keywordMatch = cleanSel.match(/class\*=["']([^"']+)["']/i);
        const tagMatch = cleanSel.match(/^([a-z0-9]+)\[/i);
        const keyword = keywordMatch ? keywordMatch[1] : '';
        const tag = tagMatch ? tagMatch[1].toUpperCase() : '';
        
        const hasKeyword = el.className.toLowerCase().includes(keyword.toLowerCase());
        const matchesTag = !tag || el.tagName === tag;
        return hasKeyword && matchesTag;
      }
      
      // c. [data-jid] 属性存在匹配
      if (cleanSel.startsWith('[') && cleanSel.endsWith(']')) {
        const attr = cleanSel.slice(1, -1);
        return attr in el.attributes;
      }

      // d. h1.job-title 标签+类匹配
      if (cleanSel.includes('.')) {
        const [tag, cls] = cleanSel.split('.');
        return el.tagName === tag.toUpperCase() && el.className.includes(cls);
      }

      // e. 标签名称直接匹配
      if (/^[a-z0-9]+$/i.test(cleanSel)) {
        return el.tagName === cleanSel.toUpperCase();
      }

      return false;
    };

    const search = (el: FakeElement): FakeElement | null => {
      if (match(el)) return el;
      for (const child of el.children) {
        const found = search(child);
        if (found) return found;
      }
      return null;
    };

    // 从子节点中搜索
    for (const child of this.children) {
      const found = search(child);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const subSelectors = selector.split(',');
    const allResults: FakeElement[] = [];

    for (const subSel of subSelectors) {
      // 过滤掉不区分大小写的 " i]" 标志，并清理首尾空格
      const cleanSub = subSel.trim().replace(/\s+i\s*\]/gi, ']');
      const parts = cleanSub.split(/\s+/).filter(Boolean);
      
      const matchSingle = (el: FakeElement, sel: string): boolean => {
        const s = sel.trim();
        if (s.startsWith('.')) {
          const cls = s.substring(1);
          return el.className.split(' ').includes(cls) || el.className.includes(cls);
        }
        if (s.includes('[class*=')) {
          const keywordMatch = s.match(/class\*=["']?([^"'\]\s]+)["']?/i);
          const tagMatch = s.match(/^([a-z0-9]+)\[/i);
          const keyword = keywordMatch ? keywordMatch[1] : '';
          const tag = tagMatch ? tagMatch[1].toUpperCase() : '';
          
          const hasKeyword = el.className.toLowerCase().includes(keyword.toLowerCase());
          const matchesTag = !tag || el.tagName === tag;
          return hasKeyword && matchesTag;
        }
        if (s.startsWith('[') && s.endsWith(']')) {
          const attr = s.slice(1, -1);
          return attr in el.attributes;
        }
        if (s.includes('.')) {
          const [tag, cls] = s.split('.');
          return el.tagName === tag.toUpperCase() && el.className.includes(cls);
        }
        if (/^[a-z0-9]+$/i.test(s)) {
          return el.tagName === s.toUpperCase();
        }
        return false;
      };

      const results: FakeElement[] = [];
      
      const search = (el: FakeElement, partIndex: number) => {
        const currentSel = parts[partIndex];
        const matches = matchSingle(el, currentSel);
        
        if (matches) {
          if (partIndex === parts.length - 1) {
            if (!results.includes(el)) {
              results.push(el);
            }
          } else {
            for (const child of el.children) {
              search(child, partIndex + 1);
            }
            return;
          }
        }
        
        for (const child of el.children) {
          search(child, partIndex);
        }
      };

      for (const child of this.children) {
        search(child, 0);
      }
      
      for (const res of results) {
        if (!allResults.includes(res)) {
          allResults.push(res);
        }
      }
    }

    return allResults;
  }
}

class FakeDocument extends FakeElement {
  public body: FakeElement;
  constructor() {
    super('DOCUMENT');
    this.nodeType = 9;
    this.body = new FakeElement('BODY');
    this.appendChild(this.body);
  }
}

// ==================== 2. 测试配置 ====================

const mockDetailConfig: NonNullable<SiteConfig['pages']['detail']> = {
  urlPattern: '/job_detail/[^/]+\\.html',
  injection: {
    targetSelector: ['.job-sider', '.job-detail-box', 'body'],
    position: 'append'
  },
  parsers: {
    jobId: {
      fromUrl: 'job_detail/([^/]+)\\.html',
      fromDom: []
    },
    title: ['.name h1', 'h1.job-title', 'h1[class*="name"]'],
    company: ['.company-info .name', '.company-name'],
    salary: {
      selectors: ['.salary', 'span[class*="salary"]'],
      regexFallback: '\\d+-\\d+K(?:·\\d+薪)?'
    },
    description: ['.job-sec-text', '[class*="job-sec"]'],
    jobTags: ['.tag-list span']
  }
};

const mockListConfig: NonNullable<SiteConfig['pages']['list']> = {
  urlPattern: '/web/geek/job',
  cardSelector: '.job-card-wrapper',
  cardIdExtractor: {
    attrName: 'data-jid',
    regex: '(.*)'
  }
};

// ==================== 3. 运行测试集 ====================

function runTests() {
  console.log('🤖 开始执行 Parser 核心引擎单元测试...\n');

  let passed = true;
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(` ✅ PASS: ${msg}`);
    } else {
      console.error(` ❌ FAIL: ${msg}`);
      passed = false;
    }
  };

  // --- 测试 1: 精准选择器完整解析 ---
  try {
    const doc = new FakeDocument();
    
    const h1 = new FakeElement('h1', '高级前端开发工程师');
    h1.className = 'job-title';
    doc.body.appendChild(h1);

    const comp = new FakeElement('div', '字节跳动');
    comp.className = 'company-name';
    doc.body.appendChild(comp);

    const sal = new FakeElement('span', '25K-40K·15薪');
    sal.className = 'salary';
    doc.body.appendChild(sal);

    const desc = new FakeElement('div', '岗位职责：开发 Job Nest 插件');
    desc.className = 'job-sec-text';
    doc.body.appendChild(desc);

    const tagList = new FakeElement('div');
    tagList.className = 'tag-list';
    const tag1 = new FakeElement('span', '1-3年');
    const tag2 = new FakeElement('span', '本科');
    const tag3 = new FakeElement('span', 'TypeScript');
    tagList.appendChild(tag1);
    tagList.appendChild(tag2);
    tagList.appendChild(tag3);
    doc.body.appendChild(tagList);

    const result = Parser.parseDetailPage(
      mockDetailConfig.parsers,
      'https://www.zhipin.com/job_detail/v2_999a888.html',
      doc as any
    );

    assert(result.jobId === 'v2_999a888', '从 URL 解析 JobID 应为 "v2_999a888"');
    assert(result.title === '高级前端开发工程师', '从精准类名解析 Title 应为 "高级前端开发工程师"');
    assert(result.company === '字节跳动', '从精准类名解析 Company 应为 "字节跳动"');
    assert(result.salary === '25K-40K·15薪', '从精准类名解析 Salary 应为 "25K-40K·15薪"');
    assert(result.description === '岗位职责：开发 Job Nest 插件', '从精准类名解析 Description 应为 "岗位职责：开发 Job Nest 插件"');
    assert(Array.isArray(result.jobTags) && result.jobTags.join(',') === '1-3年,本科,TypeScript', '从精准选择器解析 jobTags 应为 ["1-3年", "本科", "TypeScript"]');
  } catch (e) {
    console.error('测试 1 发生未捕获异常:', e);
    passed = false;
  }

  // --- 测试 2: 精准选择器失效时的 Fallback 链与模糊属性匹配 ---
  try {
    const doc = new FakeDocument();
    
    // 精准选择器全挂，改用模糊的 h1 匹配
    const h1 = new FakeElement('h1', '算法专家');
    h1.setAttribute('class', 'some-random-obfuscated-class-title-box');
    doc.body.appendChild(h1);

    // 精准的公司选择器被混淆成 brand
    const comp = new FakeElement('div', '阿里巴巴');
    comp.setAttribute('class', 'aside-brand-name-7hsg');
    doc.body.appendChild(comp);

    // 职务描述被混淆为 some-random-desc
    const desc = new FakeElement('div', '岗位职责：大数据开发');
    desc.setAttribute('class', 'some-random-desc-888');
    doc.body.appendChild(desc);

    // 工作标签列表容器被混淆成 job-tags-container，包含 span 子元素
    const jobTagsContainer = new FakeElement('div');
    jobTagsContainer.setAttribute('class', 'job-tags-container-xyz');
    const fTag1 = new FakeElement('span', '3-5年');
    const fTag2 = new FakeElement('span', '硕士');
    const fTag3 = new FakeElement('span', 'Python');
    jobTagsContainer.appendChild(fTag1);
    jobTagsContainer.appendChild(fTag2);
    jobTagsContainer.appendChild(fTag3);
    doc.body.appendChild(jobTagsContainer);

    const result = Parser.parseDetailPage(
      mockDetailConfig.parsers,
      'https://www.zhipin.com/job_detail/ali_8888.html',
      doc as any
    );

    assert(result.jobId === 'ali_8888', 'JobID 提取应正确');
    assert(result.title === '算法专家', '类名混淆时通过模糊匹配 [class*="title" i] 提取 Title 应成功');
    assert(result.company === '阿里巴巴', '公司名精准类名失效时通过模糊匹配 [class*="brand" i] 提取 Company 应成功');
    assert(result.description === '岗位职责：大数据开发', '职位描述失效时通过模糊匹配 [class*="desc" i] 提取 Description 应成功');
    assert(Array.isArray(result.jobTags) && result.jobTags.join(',') === '3-5年,硕士,Python', '标签名失效时通过模糊匹配 [class*="job-tags" i] span 提取 jobTags 应成功');
  } catch (e) {
    console.error('测试 2 发生未捕获异常:', e);
    passed = false;
  }

  // --- 测试 3: 薪资精准选择器全毁后的正文文本正则匹配兜底 ---
  try {
    const doc = new FakeDocument();
    
    const h1 = new FakeElement('h1', '产品经理');
    h1.className = 'job-title';
    doc.body.appendChild(h1);
    
    const comp = new FakeElement('div', '腾讯');
    comp.className = 'company-name';
    doc.body.appendChild(comp);

    // 薪资标签没有用选择器规定的类名，而是无名 div，只包含在正文文本中
    const contentText = '深圳腾讯总部招募优秀产品经理，薪资水平在 20-35k·16薪 左右，要求有AI经验。';
    doc.body.textContent = contentText;

    const result = Parser.parseDetailPage(
      mockDetailConfig.parsers,
      'https://www.zhipin.com/job_detail/tx_7777.html',
      doc as any
    );

    assert(result.salary === '20-35k·16薪', '薪资选择器完全失效时应退避使用 regexFallback 全文捕获薪资');
  } catch (e) {
    console.error('测试 3 发生未捕获异常:', e);
    passed = false;
  }

  // --- 测试 4: 列表页卡片 ID 提取 ---
  try {
    // A. 属性提取
    const cardEl1 = new FakeElement('div');
    cardEl1.setAttribute('data-jid', 'boss_jid_1234');
    const id1 = Parser.extractListCardId(mockListConfig, cardEl1 as any);
    assert(id1 === 'boss_jid_1234', '从卡片属性提取 ID 应为 "boss_jid_1234"');

    // B. 内置 a 标签的 href 属性提取
    const listConfigHref: NonNullable<SiteConfig['pages']['list']> = {
      urlPattern: '/zhaopin/',
      cardSelector: '.job-card',
      cardIdExtractor: {
        attrName: 'href',
        regex: 'job/(\\d+)\\.shtml'
      }
    };
    const cardEl2 = new FakeElement('div');
    const aEl = new FakeElement('a');
    aEl.setAttribute('href', 'https://www.liepin.com/job/19203848.shtml');
    cardEl2.appendChild(aEl);

    const id2 = Parser.extractListCardId(listConfigHref, cardEl2 as any);
    assert(id2 === '19203848', '从卡片 a[href] 正则提取 ID 应为 "19203848"');
  } catch (e) {
    console.error('测试 4 发生未捕获异常:', e);
    passed = false;
  }

  // --- 测试 5: 列表页预览独立解析器匹配测试 (异构 DOM 结构) ---
  try {
    const previewParsers = {
      jobId: { fromUrl: 'job_detail/([^/]+)\\.html' },
      title: ['.preview-title'],
      company: ['.preview-comp'],
      salary: { selectors: ['.preview-sal'] },
      description: ['.preview-desc'],
      jobTags: ['.preview-tags span']
    };

    const doc = new FakeElement('div');
    doc.className = 'preview-wrapper';
    
    const h1 = new FakeElement('h1', '数据分析师');
    h1.className = 'preview-title';
    doc.appendChild(h1);

    const comp = new FakeElement('div', '网易');
    comp.className = 'preview-comp';
    doc.appendChild(comp);

    const sal = new FakeElement('span', '18K-30K');
    sal.className = 'preview-sal';
    doc.appendChild(sal);

    const desc = new FakeElement('div', '岗位职责：负责游戏数据挖掘');
    desc.className = 'preview-desc';
    doc.appendChild(desc);

    const tags = new FakeElement('div');
    tags.className = 'preview-tags';
    tags.appendChild(new FakeElement('span', '3年'));
    tags.appendChild(new FakeElement('span', '大专'));
    doc.appendChild(tags);

    const result = Parser.parseDetailPage(
      previewParsers,
      'https://www.zhipin.com/job_detail/wangyi_123.html',
      doc as any
    );

    assert(result.jobId === 'wangyi_123', '预览专属规则解析 jobId 正确');
    assert(result.title === '数据分析师', '预览专属规则解析 title 正确');
    assert(result.company === '网易', '预览专属规则解析 company 正确');
    assert(result.salary === '18K-30K', '预览专属规则解析 salary 正确');
    assert(result.description === '岗位职责：负责游戏数据挖掘', '预览专属规则解析 description 正确');
    assert(Array.isArray(result.jobTags) && result.jobTags.join(',') === '3年,大专', '预览专属规则解析 jobTags 正确');
  } catch (e) {
    console.error('测试 5 发生未捕获异常:', e);
    passed = false;
  }

  // --- 测试 6: 列表页双源合并解析测试 (卡片优先，预览兜底) ---
  try {
    const commonParsers = {
      jobId: { fromUrl: 'job_detail/([^/]+)\\.html' },
      title: ['.job-title'],
      company: ['.company-name'],
      salary: { selectors: ['.salary'] },
      description: ['.job-desc'],
      jobTags: ['.tag-list span']
    };

    // 1. 模拟左侧列表卡片 (包含基础职位信息，但没有 JD)
    const cardEl = new FakeElement('div');
    cardEl.className = 'job-card-wrapper';
    
    const cardTitle = new FakeElement('span', '资深测试开发');
    cardTitle.className = 'job-title';
    cardEl.appendChild(cardTitle);
    
    const cardComp = new FakeElement('span', '美团');
    cardComp.className = 'company-name';
    cardEl.appendChild(cardComp);
    
    const cardSal = new FakeElement('span', '22K-35K');
    cardSal.className = 'salary';
    cardEl.appendChild(cardSal);

    const cardTagList = new FakeElement('div');
    cardTagList.className = 'tag-list';
    cardTagList.appendChild(new FakeElement('span', '5-10年'));
    cardEl.appendChild(cardTagList);

    // 2. 模拟右侧详情预览框 (包含 JD 和更全的工作标签，但公司/职位可能和卡片一致)
    const previewEl = new FakeElement('div');
    previewEl.className = 'job-detail-box';
    
    const previewTitle = new FakeElement('span', '资深测试开发');
    previewTitle.className = 'job-title';
    previewEl.appendChild(previewTitle);

    const previewComp = new FakeElement('span', '美团');
    previewComp.className = 'company-name';
    previewEl.appendChild(previewComp);
    
    const previewDesc = new FakeElement('div', '主要职责：负责美团外卖核心链路的质量建设。');
    previewDesc.className = 'job-desc';
    previewEl.appendChild(previewDesc);

    const previewTagList = new FakeElement('div');
    previewTagList.className = 'tag-list';
    previewTagList.appendChild(new FakeElement('span', '5-10年'));
    previewTagList.appendChild(new FakeElement('span', '本科'));
    previewTagList.appendChild(new FakeElement('span', 'Go'));
    previewEl.appendChild(previewTagList);

    // 3. 执行双源独立解析
    const cardResult = Parser.parseDetailPage(commonParsers, '', cardEl as any);
    const previewResult = Parser.parseDetailPage(commonParsers, 'https://www.zhipin.com/job_detail/meituan_99.html', previewEl as any);

    // 4. 执行双源合并
    const mergedResult = {
      title: cardResult.title || previewResult.title || '',
      company: cardResult.company || previewResult.company || '',
      salary: cardResult.salary || previewResult.salary || '',
      description: cardResult.description || previewResult.description || '',
      jobTags: [] as string[]
    };
    const tagsSet = new Set([...(cardResult.jobTags || []), ...(previewResult.jobTags || [])]);
    mergedResult.jobTags = Array.from(tagsSet).slice(0, 15);

    // 5. 校验断言
    assert(mergedResult.title === '资深测试开发', '双源合并：职位名正确');
    assert(mergedResult.company === '美团', '双源合并：公司名正确');
    assert(mergedResult.salary === '22K-35K', '双源合并：薪资正确');
    assert(mergedResult.description === '主要职责：负责美团外卖核心链路的质量建设。', '双源合并：JD 成功由右侧预览补全');
    assert(mergedResult.jobTags.join(',') === '5-10年,本科,Go', '双源合并：标签成功去重合并');
  } catch (e) {
    console.error('测试 6 发生未捕获异常:', e);
    passed = false;
  }

  console.log('\n======================================');
  if (passed) {
    console.log('🎉 恭喜！Parser 引擎所有测试用例通过！');
    process.exit(0);
  } else {
    console.error('🚨 糟糕！部分测试用例未通过，请检查解析器细节。');
    process.exit(1);
  }
}

runTests();
