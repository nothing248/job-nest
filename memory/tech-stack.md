# 技术栈选型说明文档 (Tech Stack Selection Document)

## 1. 核心运行环境与脚本标准 (Runtime & Standard)
为了确保脚本能在现代浏览器中安全、高效地运行，并具备强类型的代码契约，选型如下：

*   **开发语言**：**TypeScript (Strict Mode)**
    *   *选型理由*：强类型定义（如上文 PRD 中的 `JobRecord` 接口）可充当 Agent 编写代码时的严格规约，大幅降低其在处理复杂 DOM 和存储数据时产生的语义错误（如 Undefined 属性访问）。
*   **脚本引擎标准**：**Tampermonkey / Greasemonkey API (Manifest V3 兼容)**
    *   *选型理由*：利用成熟的沙箱特权 API 绕过浏览器的同源策略。
    *   *核心引入 API*：
        *   `GM_setValue` / `GM_getValue`：用于跨域持久化存储。
        *   `GM_xmlhttpRequest`：用于跨域拉取动态配置更新（防反爬 CSS 变更）。
        *   `GM_registerMenuCommand`：用于在插件菜单中快速暴露“导入/导出”等全局入口。

---

## 2. 工程化与构建工具 (Build Tools)
不推荐手写单文件 JS，而是采用模块化打包，便于 Agent 维护清晰的目录结构：

*   **构建工具**：**Vite + `vite-plugin-monkey`**
    *   *选型理由*：`vite-plugin-monkey` 是目前最成熟的油猴脚本打包插件。它允许 Agent 使用现代前端工程化方案（TS、模块化、CSS 预处理器）进行开发，并在编译时自动生成符合油猴格式要求的单文件 `.user.js`，同时自动注入 `// ==UserScript==` 头部声明。

---

## 3. UI 渲染与沙箱隔离层 (UI & Isolation)
针对招聘平台可能存在的 CSS 检测或全局样式污染，UI 层的技术选型必须具备天然的隔离性：

*   **UI 渲染方案**：**原生 Web Components + Shadow DOM**
    *   *选型理由*：
        1.  **样式绝对隔离**：Shadow DOM 内部的 CSS 与宿主页面的 CSS 互不干扰，防止招聘网站本身的 CSS 样式污染我们的悬浮面板，也防止我们影响页面。
        2.  **规避反爬检测**：宿主页面上的常规 JS 脚本（如平台的反爬虫脚本）在不特意穿透的情况下，无法通过简单的 `document.querySelectorAll` 轻易探测到 Shadow DOM 内部的 DOM 结构和文本内容，提高了工具的隐蔽性。
        3.  **零外部依赖**：无需引入 React 或 Vue 等重型框架的运行时，保持最终生成的脚本体积轻量（< 100KB）。

---

## 4. 样式引擎与防爬对抗层 (Styling & Anti-Detection)
招聘网站常通过动态变更 class 类名（如混淆类名）来使自动化脚本失效，或通过检测特定的“灰度样式类名”来判定用户使用了插件。

*   **样式处理方案**：**动态 CSS-in-JS 配合样式名哈希化 (Dynamic Hashed CSS)**
    *   *选型理由*：
        1.  **类名随机化**：不使用固定的 `.my-job-viewed`，而是由 Agent 编写一个轻量级的混淆函数，在每次脚本加载时随机生成一个 class 名（例如 `._jobpilot_` 加上当天的时间戳或随机 Hash，如 `.x7a9d2`）。
        2.  **动态样式注入**：利用 `Constructable Stylesheets` 或动态创建 `<style>` 标签并注入到 Shadow DOM 中。
        3.  **动态 Selector 配置**：支持通过 JSON 配置，将原本硬编码的 Selector 转化为从配置读取，保障平台改版时无需重构代码。

---

## 5. 配置化数据解析引擎 (Configuration Engine)
为了实现“反爬措施可配置”与“平台后期可拓展”，需要定义一个配置解析器：

*   **配置解析器**：**标准原生 JSON Parser + Schema 校验器 (轻量级自定义逻辑)**
    *   *选型理由*：
        *   **远程/本地双机制**：配置数据（平台 DOM 规则、混淆 Selector、状态样式映射表）保存为 JSON 格式。优先通过 `GM_xmlhttpRequest` 从指定 URL（如 GitHub Gist）异步拉取最新配置；若网络不通，则降级使用本地内置的 Default Config 运行。
        *   **动态 XPath/QuerySelector 解析**：脚本中寻找职位名称、公司、薪资等 DOM 节点的逻辑，不允许出现写死（Hardcode）的选择器字符串，必须全部通过 `config.platforms[currentPlatform].selectors` 的配置项动态传入。

---

## 6. 数据存储与序列化 (Data Storage & Serialization)
*   **本地序列化库**：**原生 JSON API**
    *   *选型理由*：由于存储的数据结构（`JobRecord`）较轻，原生 `JSON.stringify` 与 `JSON.parse` 性能足够，无需额外引入如 LZ-string 等压缩库，便于用户导出数据后直接查看和编辑。
*   **数据导出格式**：**UTF-8 编码的 JSON / CSV 纯文本**
    *   *选型理由*：保持极高的通用性，便于后续用户将数据导入到 Notion、Excel 或 Obsidian 等个人知识库。