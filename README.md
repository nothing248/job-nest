# Job Nest 随手记 —— 跨平台求职信息标记与辅助决策工具 (MVP 2.0)

`Job Nest` 是一款专为求职者设计的高性能、轻量化跨平台求职标记与决策管理油猴脚本 (Userscript)。

在 **MVP 2.0 升级版** 中，本项目引入了**“配置驱动引擎 (Config-Driven Engine)”**、**“Shadow DOM 样式隔离”**、**“防控制台检测无限刷新对抗层”**以及**“卡片优先的双源解析机制”**，实现了一流的用户交互体验与强大的反爬改版弹性。

---

## 🌟 核心特性展示

### 1. 随手标记与决策辅助
- **四维标记状态**：支持就地标记岗位为“已看（仅查看）”、“意向（已保存）”、“投递（已投递）”、“拒绝（不感兴趣）”。
- **随手记备忘录**：在面板中即时记录通勤距离、面试进展、技术栈要求、薪资细节等。
- **自定义分类标签**：允许用户自己打标签（如：`WLB`、`离家近`、`外企`），并进行高显提示。

### 2. 卡片降噪与备注 Badge 贴纸 (列表页)
- **视觉灰度去噪**：对标记为“已查看”或“不感兴趣（已拒绝）”的岗位卡片，自动追加高保真灰度滤镜并调低不透明度，帮助用户在滑动列表时瞬间剔除噪音。
- **就地 Badge 贴纸**：对已标记“有意向/已投递”或写过备注的岗位，在列表卡片边缘就地悬浮覆盖轻量级 Badge 贴纸，悬停可直接阅读之前的随手记摘要，避免重复点击。

### 3. 配置驱动自适应引擎 (Config-Driven)
- 脚本中不含任何特定平台的类名硬编码，解析和挂载逻辑完全由 `SiteConfig` 配置文件驱动。支持云端静默热更新（热插拔），当招聘网站大改版时，只需在线修改配置文件的选择器（Selector），客户端即可瞬间恢复，无需重新发布脚本。

### 4. 职务描述 (JD) 与工作标签自动采集
- 自动提取岗位的“原始工作标签”（如经验年限、学历、核心福利技术栈等）并在面板头部精美平铺呈现。
- 自动采集长文本的“职务描述”，在面板底部提供折叠式的 JD 预览组件，支持带自定义滚动条的无缝预览，并限制在 `5000` 字符以内以节省存储空间。

### 5. 双源解析与原地防闪烁刷新 (列表详情分栏)
- **双源提取 (Card Priority)**：当用户在列表页点击卡片时，解析引擎会同时在**左侧职位卡片**和**右侧详情预览框**提取数据，基本职位信息（职位名、公司、薪资）优先采用左侧已渲染好的卡片数据进行初始化，实现**零延迟瞬间挂载**。
- **退避重试 (Retry Polling)**：如果网络存在 AJAX 时差导致数据慢渲染，重试机制会以退避算法进行十次重试（最大持续 3 秒），并在数据到位后原地填补。
- **原地刷新 (In-Place Update)**：若预览框已挂载面板且职位 ID 一致，后续重试数据到位时只会原地刷新面板属性，绝不重建 DOM，**彻底消除闪退和闪烁感**。

### 6. 反爬虫与反控制台检测对抗层
- **路由回退劫持**：拦截反爬脚本在检测到控制台打开时触发的 `history.back()` 和 `history.go(-1)` 强行回退页面操作。
- **Location 8秒限频**：拦截反爬脚本由于检测控制台而触发的 Location 无限疯狂重刷，提供 `8` 秒冷却保护，保障 Console 顺畅调试。
- **Shadow DOM 绝对隔离**：基于原生 Web Components + 开启 Shadow DOM (open mode) 渲染，防止反爬脚本查询 DOM 特征和注入样式污染。

### 7. 增强版油猴复制与导入导出
- **穿透 Shadow DOM 的源码复制**：由于常规 outerHTML 读取不出 Shadow DOM 内部结构，系统编写了递归 DOM 序列化算法，在复制时自动将 shadowRoot 转换为 HTML5 声明式的 `<template shadowrootmode="open">` 标签，实现“所见即所得”的渲染源码复制。
- **调试控制台彩蛋**：面板底部版本号连续点击 5 次可滑出独立的系统运行日志浏览器，以红/黄/绿色彩区分日志，并支持一键写入剪贴板（使用特权 API `GM_setClipboard` 写入，100% 成功率）。
- **完全兼容的 JSON/CSV 导入导出**：支持导出为可导入 Notion/Excel 等工具的转义格式数据，并实现对老用户数据的向下兼容。

---

## 🛠️ 技术栈与目录结构

### 技术栈
*   **开发语言**：TypeScript (Strict Mode，严格类型校验)
*   **构建工具**：Vite 5 + `vite-plugin-monkey` (自动处理依赖并打包出带有 metadata 头的单文件 `.user.js`)
*   **UI 框架**：原生 Web Components (Shadow DOM) + Vanilla CSS (高保真玻璃拟态暗黑风)
*   **特权 APIs**：`GM_setValue` / `GM_getValue` (持久化沙箱)、`GM_setClipboard` (剪贴板注入)、`GM_registerMenuCommand` (油猴菜单注册)。

### 目录结构
```text
├── memory/                  # 产品设计与系统设计文档
│   ├── architecture.md      # 数据库设计、Schema 及反爬机制架构说明
│   └── prd.md               # 产品需求规格与 SiteConfig 配置种子示例
├── src/
│   ├── config/              # 内置种子规则数据 ( seed.ts )
│   ├── engine/              # 核心配置驱动解析引擎与双源合并逻辑
│   ├── storage/             # GM 存储层封装、菜单指令与导入导出序列化
│   ├── ui/                  # Shadow DOM 样式表、哈希随机类名防特征探测及面板组件
│   ├── utils/               # 环形日志存储器组件 ( Logger )
│   ├── main.ts              # 脚本主入口、原型防检测劫持层
│   └── scratch_test.ts      # 包含 25 项断言测试的 Fake DOM 单元测试套件
├── .editorconfig            # 编辑器代码风格统一配置
├── .gitattributes           # Git 文件属性（统一换行符等）配置
├── .gitignore               # Git 忽略文件规则配置
├── LICENSE                  # MIT 开源许可证
├── vite.config.ts           # 打包元数据头配置
└── tsconfig.json            # 严格 TS 校验规则
```

---

## 📦 平台配置模型 Schema

任何新平台的适配、更新或大改版，均表现为对以下 `SiteConfig` Schema 配置的修改或拉取更新，无需修改引擎代码：

```typescript
export interface DetailParsers {
  jobId: {
    fromUrl?: string;       // 从详情页 URL 提取 jobId 的正则
    fromDom?: string[];      // 提取 jobId 的备选 DOM 选择器
  };
  title: string[];           // 职位名精准选择器 fallback 链
  company: string[];         // 公司名选择器链
  salary: {
    selectors: string[];     // 薪资选择器链
    regexFallback?: string;  // 提取失败时，从正文匹配薪资的正则兜底
  };
  description?: string[];    // 职务描述 (JD) 选择器链
  jobTags?: string[];        // 职位原始标签选择器链
}

export interface SiteConfig {
  platformKey: string;       // 平台简称 (如 'boss')
  displayName: string;       // 平台显示中文名
  domains: string[];         // 匹配的域名子串 (如 ['zhipin.com'])
  pages: {
    detail?: {
      urlPattern: string;    // 判定为详情页的正则
      injection: {
        targetSelector: string[];  // 挂载随手记面板的锚点选择器优先级列表
        position: 'append' | 'prepend' | 'before' | 'after' | 'fixed';
      };
      parsers: DetailParsers;      // 详情页解析规则
    };
    list?: {
      urlPattern: string;    // 判定为列表页的正则
      cardSelector: string;  // 职位列表卡片的容器选择器
      cardIdExtractor: {
        attrName: string;    // 存储 ID 的 DOM 属性名 (如 'data-jid')
        regex?: string;      // 从属性值中提取原始 ID 的正则
      };
      detailPreview?: {
        triggerSelector: string;   // 列表右侧预览分栏特征容器选择器
        injection: {
          targetSelector: string[];// 预览分栏内部随手记面板挂载锚点选择器
          position: 'append' | 'prepend' | 'before' | 'after' | 'fixed';
        };
        parsers?: DetailParsers;   // 预览专用的独立解析规则，若不提供则退避复用详情页规则
      };
    };
  };
}
```

---

## 🚀 开发者命令与构建

### 1. 安装依赖
```bash
npm install
```

### 2. 运行本地模拟单元测试
本项目编写了极其逼真的 Fake DOM 对象（支持后代选择器、逗号选择器、`i` 标志选择器匹配），可以在 Node 纯环境下脱离浏览器进行完整的核心引擎测试：
```bash
npx vite-node src/scratch_test.ts
```
*(全部 25 项测试均包含在此，确保重构或更新解析规则不会破坏现有平台的解析行为)*。

### 3. 本地编译与打包
```bash
npm run build
```
打包产物位于 `dist/job-nest.user.js`。大小控制在约 **67.79 KB**。

---

## 💡 安装与使用指南

1. 打开 Chrome/Firefox 并安装浏览器插件 **Tampermonkey**。
2. 运行 `npm run build`，打开生成的 `dist/job-nest.user.js` 并将其内容全部复制。
3. 在 Tampermonkey 后台“新建脚本”，清空默认代码后粘贴复制的内容并保存。
4. 打开 **BOSS直聘列表页**（如 `/web/geek/job`）或详情页：
   - 随手记面板会在挂载点就地浮现。
   - 标注为“已看/拒绝”的岗位会在列表页中立即灰度弱化，标注“意向/已投递”或带有备注的岗位则自动浮现 Badge，悬停即可预览您的备忘录。
   - 点击面板右下角版本号 5 下即可就地查阅运行日志，或从油猴菜单中快速导出数据和复制渲染源码。
