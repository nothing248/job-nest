# 系统架构与数据库设计文档 (Architecture & Database Schema)

本项目是一个跨平台求职信息标记与辅助决策的油猴插件 (Userscript)。在 **MVP 2.0** 中，系统进行了配置驱动引擎与防检测对抗层的彻底重构。

---

## 1. 系统总体架构 (System Architecture)

系统采用模块化组织，利用前端工程化方案 (Vite + TS) 打包为单文件油猴脚本。其分层设计如下：

```mermaid
graph TD
  A[网页环境 (BOSS直聘/猎聘等)] -->|加载/导航| B(主入口 main.ts)
  B -->|1. 注入防爬样式| C[样式对抗层 ui/styles.ts]
  B -->|2. 注册控制入口| D[持久化存储层 storage/index.ts]
  B -->|3. 静默拉取云端 JSON| E[云端规则服务器]
  B -->|4. 启动| F[解析引擎 engine/index.ts]
  
  F -->|匹配域名与路由| G{详情页 or 列表页}
  G -->|详情页| H[智能解析提取 parser.ts]
  H -->|退避机制与兜底正则| I[挂载 & 自动降级]
  I -->|挂载 Shadow DOM| J[随手记面板 ui/panel.ts]
  
  G -->|列表页| K[MutationObserver 增量监听]
  K -->|增量扫描卡片| L[列表卡片装饰 ui/badge.ts]
  L -->|查库对比| M[灰度化 / 追加 Badge]
  
  J -->|用户交互保存| D
  D -->|跨域持久化| N[Tampermonkey GM_storage]
```

---

## 2. 数据库设计 (Database Schema)

数据持久化使用油猴提供的特权 API `GM_setValue` / `GM_getValue` 存储在插件沙箱内，实现了跨域持久化。

### 2.1 存储主键映射 (Storage Keys)

| 存储键名 (Key) | 数据类型 | 描述说明 |
| :--- | :--- | :--- |
| `jp_job_records` | `string` (JSON) | 核心用户标记库。序列化存储 `Record<string, JobRecord>`，以职位全局 ID 作为键名。 |
| `jp_remote_configs` | `string` (JSON) | 远程静默更新的选择器配置缓存，结构为 `SiteConfig[]` |
| `jp_last_sync_time` | `number` (Timestamp) | 上一次尝试与云端进行规则拉取同步的毫秒级时间戳。 |

### 2.2 核心求职标记模型 (`JobRecord`)

```json
{
  "type": "object",
  "properties": {
    "jobGlobalId": {
      "type": "string",
      "description": "全局唯一ID，由「平台标识_职位ID」拼接而成。例如: 'boss_v2_1a2b3c' 或 'liepin_19283747'"
    },
    "platform": {
      "type": "string",
      "description": "源招聘平台标识，例如 'boss'、'liepin'"
    },
    "title": {
      "type": "string",
      "description": "岗位名称"
    },
    "company": {
      "type": "string",
      "description": "公司名称"
    },
    "salary": {
      "type": "string",
      "description": "薪资范围，如 '15k-25k'、'20k-35k·16薪'"
    },
    "description": {
      "type": "string",
      "description": "职务描述文本内容，最多截取 5000 字符"
    },
    "jobTags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "从招聘平台网页上采集到的原始岗位工作标签（如经验要求、学历限制、技术栈福利等）"
    },
    "viewedAt": {
      "type": "string",
      "format": "date-time",
      "description": "最近一次查看此岗位的 ISO 时间戳"
    },
    "status": {
      "type": "string",
      "enum": ["viewed", "saved", "applied", "rejected"],
      "description": "求职决策状态：viewed(仅查看)、saved(有意向/已保存)、applied(已投递)、rejected(不感兴趣/已拒绝)"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "自定义的分类标签，例如 ['WLB', '大厂', '通勤近']"
    },
    "note": {
      "type": "string",
      "description": "用户随手记下的自定义备注备忘录"
    }
  },
  "required": ["jobGlobalId", "platform", "title", "company", "viewedAt", "status"]
}
```

### 2.3 平台规则配置模型 (`SiteConfig`)

```json
{
  "type": "object",
  "properties": {
    "platformKey": { "type": "string", "description": "平台英文简称" },
    "displayName": { "type": "string", "description": "平台中文显示名称" },
    "domains": { "type": "array", "items": { "type": "string" }, "description": "匹配的域名关键字" },
    "pages": {
      "type": "object",
      "properties": {
        "detail": {
          "type": "object",
          "properties": {
            "urlPattern": { "type": "string", "description": "详情页URL判定正则" },
            "injection": {
              "type": "object",
              "properties": {
                "targetSelector": { "type": "array", "items": { "type": "string" }, "description": "面板注入的备选选择器" },
                "position": { "type": "string", "enum": ["append", "prepend", "before", "after", "fixed"] }
              }
            },
            "parsers": {
              "type": "object",
              "properties": {
                "jobId": {
                  "type": "object",
                  "properties": {
                    "fromUrl": { "type": "string", "description": "从URL提取ID的正则" },
                    "fromDom": { "type": "array", "items": { "type": "string" } }
                  }
                },
                "title": { "type": "array", "items": { "type": "string" } },
                "company": { "type": "array", "items": { "type": "string" } },
                "salary": {
                  "type": "object",
                  "properties": {
                    "selectors": { "type": "array", "items": { "type": "string" } },
                    "regexFallback": { "type": "string", "description": "全文正则薪资兜底提取正则" }
                  }
                },
                "description": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "职务描述（JD）备选 DOM 选择器列表"
                },
                "jobTags": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "原始岗位工作标签的备选 DOM 选择器列表"
                }
              }
            }
          }
        },
        "list": {
          "type": "object",
          "properties": {
            "urlPattern": { "type": "string", "description": "列表页URL判定正则" },
            "cardSelector": { "type": "string", "description": "卡片容器CSS选择器" },
            "cardIdExtractor": {
              "type": "object",
              "properties": {
                "attrName": { "type": "string", "description": "存储ID的属性名" },
                "regex": { "type": "string", "description": "从属性提取ID的正则" }
              }
            },
            "detailPreview": {
              "type": "object",
              "properties": {
                "triggerSelector": { "type": "string", "description": "详情预览分栏大容器的选择器" },
                "injection": {
                  "type": "object",
                  "properties": {
                    "targetSelector": { "type": "array", "items": { "type": "string" } },
                    "position": { "type": "string", "enum": ["append", "prepend", "before", "after", "fixed"] }
                  }
                },
                "parsers": {
                  "type": "object",
                  "description": "预览分栏专属的独立解析器配置，结构与 detail.parsers 一致，若不提供则退避复用之"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. 防检测与高内聚设计规范

1. **类名动态混淆 (Dynamic Hashed CSS)**: 
   为抵御招聘网站前端反爬脚本依据固定 class 特征对插件的静态检测，系统每次在页面加载时通过 `hashes.ts` 生成具有唯一生命期的随机类名映射（如 `jp_panel_container_[hash]` 对应 `.x4fg2s`）。系统所有组件和全局注入样式均使用哈希映射后的变量。
2. **样式绝对沙箱化 (Shadow DOM)**:
   详情页随手记面板通过原生 `Web Components` 包装，并开启 `Shadow DOM (mode: 'open')`，实现 CSS 的物理隔离，确保不受任何宿主网站的样式污染，同时避开了宿主网站的常规 DOM 查询探测。
3. **退避降级渲染**:
   如果配置定义的目标挂载节点因网站改版全部缺失，解析引擎不抛错、不崩溃，而会自动将随手记面板切换至 `position: fixed` 并挂载至 `body` 根节点，以右下角悬浮框的形式优雅呈现。

4. **反反爬路由/刷新劫持与内置调试控制台**:
   - **路由回退劫持**: 为防止招聘网站（如 BOSS直聘）在检测到开发者工具控制台开启时，通过强制执行 `window.history.back()` 或 `window.history.go(-1)` 强行踢出用户，脚本在 `document-start` 注入的最早阶段，对 `window.history.back` 和 `window.history.go` 进行劫持和静默拦截，从而阻断其踢人跳转行为。
   - **防无限刷新重载**: 针对反爬脚本调用 `location.reload()` 或 `location.replace(...)` 强制网页疯狂重刷进入死循环的对抗手段，系统劫持了 `Location.prototype.reload` 和 `Location.prototype.replace` 原型方法，并引入了 **8秒冷却时间限制（Throttling）**。在此期间内的高频次重载调用将被全部静默拦截，彻底消除了无限刷新的死循环，保障了顺畅的 Console 调试体验。
   - **内置控制台抽屉**: 为免去开启开发者工具，系统在随手记面板内部（基于 Shadow DOM）集成了独立的调试日志浏览器抽屉。通过连续点击底部版本号 5 次触发彩蛋滑出，该日志抽屉能以可视化的红/黄/绿不同色彩级别实时输出路由跳转、DOM Fallback 提取、缓存读写和异常日志，由于其位于 Shadow DOM 内部，避免了被宿主网站脚本轻易探测。

5. **列表详情预览随手记挂载与双源解析机制**:
   - **最外层卡片过滤与去重**: 为防止卡片选择器同时匹配到一个卡片结构下的父子嵌套节点（如 `li` 和其内部的 `div`），系统在处理卡片前引入了最外层卡片过滤机制（`Parser.getTopLevelCards`），通过树层级排除法过滤掉所有嵌套在其他卡片容器内部的子卡片节点，确保每一个实际卡片结构仅在最外层大容器上被处理和挂载最多一个 Badge，彻底杜绝了状态切换或 DOM 重载时因嵌套引发的 Badge 重叠与残留。
   - **就地预览挂载**: 在列表页，当用户点击左侧职位卡片触发右侧详情预览分栏（例如 `.job-detail-box`）出现时，系统通过 `MutationObserver` 快速捕捉，并依据 `detailPreview` 挂载规则，以 `prepend` 形式把随手记面板就地挂载到右侧预览分栏的头部，免去了反复跳转的开销。
   - **双源解析与合并 (卡片优先，预览兜底)**：
     为了缩短列表页挂载时的渲染延迟和填补异步加载时差，解析引擎会同时针对**左侧激活卡片 DOM** 和**右侧预览框 DOM** 执行双源解析。标题、公司名和薪资等基础字段优先使用卡片上已渲染好的数据进行秒级初始化，而详细的 JD（职务描述）和完整的标签则在右侧网络数据加载完毕后由重试 Polling 机制自动解析捕获并无缝填补。
   - **卡片智能联动与原地刷新**: 系统会通过扫描卡片集合，智能得到当前在看职位的 `jobId`。当切换卡片时，面板联动更新。如果面板已处于挂载状态且 ID 与当前选中职位一致，系统**只会就地调用面板的 `initJob` 方法原地更新数据**，而不再销毁和重建 DOM 节点，彻底杜绝了频繁重绘带来的面板闪烁与抖动。
   - **职务描述异步防加载失败与增量补全**: 为防止由于网络延时或首次加载失败时 DOM 节点中呈现的“加载中”或“数据加载失败点击重新加载”占位符被误作为真实职务描述被引擎保存，系统实现了一个 `isInvalidDescription` 判定机制。在重试期间自动屏蔽所有垃圾占位数据。一旦面板成功挂载后，若监测到当前的职务描述依然无效（为空或为错误占位符），每当网页 DOM 发生改变时，系统都会在后台自动同步提取最新的描述数据；一旦接口返回成功或用户手动点击重新加载，真实的职务描述就会立即被捕获并原地更新到面板和本地存储中，实现了无感的数据同步闭环。

6. **增强复制特权与 Shadow DOM 穿透序列化**:
   - **穿透 Shadow DOM 的源码复制**: 由于常规的 `outerHTML` 无法访问及序列化 Shadow DOM 节点，系统实现了一个递归 DOM 序列化算法。当扫描到节点拥有 `shadowRoot` 时，自动将其内部节点转换并使用 HTML5 声明式 Shadow DOM 的 `<template shadowrootmode="open">` 标签进行包裹展开，从而确保复制出的 HTML 源码与页面 in 浏览器里实际渲染和看到的结果完全一致。
   - **剪贴板特权授权**: 采用比 `navigator.clipboard` 更为可靠的油猴特权 API `GM_setClipboard` 写入内容，规避了浏览器焦点激活限制、同源策略封锁或宿主页面脚本的复制劫持拦截，实现了 100% 的成功率。

7. **属性标识定位与动态类名混淆分离**:
   - **状态定位与清理**: 为解决由于每次页面重载、SPA 重新加载或配置热更新导致动态生成的 CSS 类名哈希失效，使得无法精确定位并清理先前阶段创建的老卡片 Badge 或恢复灰度化卡片状态的问题，系统将状态识别从类名依赖中解耦，采用固定的静态自定义 HTML 属性（如 `data-jp-badge="true"` 定位和管理卡片 Badge 生命周期，`data-jp-gray="true"` 切换/标记卡片灰度状态，`data-jp-processed` 作为已处理防重复扫描标记）。
   - **防爬样式混淆**: 注入到网页原生 DOM 结构中的内层具体组件（如 Badge 本身）的 CSS Class 类名仍然保持每次随机生成的混淆字符串（如 `HASHED_CLASSES.badge`），仅作为应用 CSS 样式的媒介，确保招聘网站的安全审计脚本无法通过固定的静态 class 类名特征阻断本插件，兼具了生命周期精准管理的鲁棒性与防爬对抗的安全性。

8. **职务描述脏标签过滤与净化**:
   - **样式/脚本文本剔除**: 为防止在提取详情和预览页的职务描述（desc）时，浏览器 `textContent` 特性将网页大容器内部嵌有的 `<style>` 或 `<script>` 标签内的 CSS 样式定义与 JS 代码当做纯文本一并合并返回（产生形如 `.class { color: red; }` 样式代码块垃圾数据污染），系统在提取纯文本前对目标 DOM 节点进行物理克隆，并在副本中查找到所有的 `style` 和 `script` 标签执行 `remove()` 予以彻底剔除，最后再调用 `textContent` 获取干净、整洁的纯正文职位描述。

9. **标签多段内容智能切分与去重**:
   - **智能正则分割**: 为防止由于选择器配置精度不足（如指向了容器节点）或宿主页面将多段属性合并在同一个文本节点中渲染导致标签数据粘连混淆（如将 `"大专 / 3-5年"` 提取为单个标签），系统在精准和模糊标签提取流程中均引入了正则切分机制。通过对提取文本采用 `/[\s,，|/、\u2022·]+/` 模式进行切分，清理多余空白符、截断过长字符并进行去重，确保随手记面板与本地数据库中均能正常分割并存储规整的独立标签数组。

