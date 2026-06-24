# Project Custom Rules (AGENTS.md)

> [!IMPORTANT]
> # Always read memory/@architecture.md before writing any code. Include entire database schema.
> # Always read memory/@prd.md before writing any code.
> # After adding a major feature or completing a milestone, update memory/@architecture.md.
> This is a project-specific ruleset for AI Agents working on this codebase. All agents MUST strictly adhere to these instructions when modifying code, adding features, or proposing changes.

## 1. Business Logic & Constraints
- **Core Goals**:
  - 本项目为一个跨平台求职信息标记与辅助决策工具，采用**配置驱动引擎 (Config-Driven Engine)** 将各个招聘平台的特异性逻辑（如 DOM 选择器、匹配正则、注入节点等）抽离为标准的配置 Schema，从而动态执行解析与渲染。
  - 核心目标是帮助用户标记已查看、已投递或不感兴趣的岗位，并允许添加备注、标签，同时能够在职位卡片上叠加徽章以及对已查看卡片进行灰度化处理。
- **Key Entities & Workflows**:
  - **SiteConfigSchema**: 平台自适应配置 Schema，定义了平台标识 `platformKey`、匹配域名 `domains`，以及页面解析逻辑（详情页 `pages.detail` 的 DOM 选择器和注入设置，列表页 `pages.list` 的卡片容器选择器和 ID 提取器等）。
  - **JobRecord**: 用户求职数据模型，主键为 `jobGlobalId` (格式为 `平台标识_职位原始ID`)，包含 `platform`、`title`、`company`、`salary`、`viewedAt`、`status`、`tags`、`note` 等属性。
  - **核心执行流**:
    1. **域名匹配**: 页面加载或 URL 改变时，遍历 `SiteConfigs` 寻找匹配的 `domains` 项，若不匹配则退出。
    2. **页面类型判定**: 根据 `pages.detail.urlPattern` 或 `pages.list.urlPattern` 路由至详情页解析或列表页解析。
    3. **详情页处理**: 采用退避机制 (Fallback) 解析职位信息并注入随手记面板。若备选节点失效，降级为 `position: "fixed"` 在屏幕右下角悬浮展示。
    4. **列表页处理**: 通过 `MutationObserver` 监听 DOM 变化，增量抓取职位卡片，并比对本地数据库对“已查看/不感兴趣”卡片追加灰度样式，对“有备注/已保存”卡片覆盖轻量级 Badge 摘要。
- **Business Restrictions**:
  - **禁止硬编码平台特异类名**: 不得在核心引擎逻辑中硬编码任何特定招聘网站的 class 类名、ID 或选择器。所有解析与注入逻辑必须完全由配置驱动。
  - **保证面板可用性**: 如果 `targetSelector` 中的节点都找不到，必须自动降级为 `fixed` 悬浮框，绝不能由于页面改版导致脚本报错或面板无法显示。

## 2. Tech Stack & Architecture Rules
- **Core Stack**:
  - **开发语言**: TypeScript (Strict Mode，必须开启严格类型校验，降低处理复杂 DOM 和存储数据时的错误率)。
  - **脚本引擎标准**: Tampermonkey / Greasemonkey 插件环境，完全兼容 Manifest V3。
  - **核心特权 API**: 使用 `GM_setValue` / `GM_getValue` 实现跨域持久化存储，使用 `GM_xmlhttpRequest` 实现跨域拉取远程动态配置，使用 `GM_registerMenuCommand` 注册插件菜单全局入口。
  - **工程化构建**: 使用 Vite 配合 `vite-plugin-monkey`，自动完成 TS、模块化和 CSS 的打包，并自动生成带有 `// ==UserScript==` 头的 `.user.js` 单文件。
  - **UI 与沙箱隔离**: 采用**原生 Web Components + Shadow DOM** 渲染 UI 面板。实现绝对样式隔离，规避反爬检测，无需引入 React/Vue，保持体积在 100KB 以内。
- **Directory Structure**:
  - **配置文件**: 项目配置文件（如 `package.json`, `vite.config.ts`, `tsconfig.json`）应位于项目根目录下。
  - **源代码目录**: `src/` 应根据职责模块化，例如：
    - `src/config/`: 默认配置、Schema 校验逻辑。
    - `src/engine/`: 核心解析引擎、MutationObserver 列表监听及路由分发逻辑。
    - `src/storage/`: 封装 Tampermonkey 存储 API 的本地持久化模块。
    - `src/ui/`: 封装 Web Components 和 Shadow DOM 的渲染与样式代码。
- **Technical Restrictions**:
  - **Shadow DOM 约束**: 面板的所有 DOM 和样式必须严格放置在 Shadow DOM 内部，避免样式污染和被招聘网站反爬虫机制轻易探测。
  - **体积与运行时限制**: 严禁引入 React、Vue 等重型框架运行时，保持编译后的打包体积在 100KB 以内。

## 3. Coding Standards & Conventions
- **Style & Naming**:
  - **动态样式名哈希化 (Dynamic Hashed CSS)**: 为了防止招聘网站的反爬机制通过特定类名探测到插件，脚本在每次加载时，必须动态生成一个随机/哈希化的 CSS 类名（例如 `_jobpilot_[random]` 或 `x[hash]` 形式）用于面板容器以及灰度化/徽章覆盖，不得使用任何固定的静态标记类名。
  - **类型声明**: 必须严格为 `SiteConfigSchema` 和 `JobRecord` 声明对应的 TS Interface/Type，在解析 and 序列化时严格约束。
- **Error Handling & Logging**:
  - **鲁棒性解析策略**: 当精确选择器失效时，Parser 必须实现退避机制（如使用属性模糊匹配或正文正则匹配薪资），DOM 提取异常时不应该引发全局 JavaScript 错误或阻塞页面加载。
  - **网络与解析容错**: `JSON.parse` 以及远程获取配置等操作必须包含 try-catch 块，网络超时或配置损坏时需回退到内置的 Local Seed 基础配置。
- **Specific Rules**:
  - **远程同步机制**: 每次启动或每 24 小时一次，脚本需静默通过 `GM_xmlhttpRequest` 请求静态 JSON 配置，成功后覆盖并存入 `remoteConfig`，实现无需重新发布脚本即可热更新反爬选择器。
  - **数据导入与导出**: 使用原生 JSON API 实现 `JobRecord` 的序列化。导入/导出格式必须为标准 UTF-8 编码的 JSON 或 CSV 纯文本，便于用户与外部知识库（Notion, Excel 等）同步。
