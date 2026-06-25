# 需求设计文档 (PRD) —— 跨平台求职信息标记与辅助决策工具 (MVP 2.0 架构升级版)

## 1. 产品概述 (Product Overview)
本产品是一款运行在浏览器环境下的“求职辅助与决策管理工具”。
*   **MVP 2.0 核心演进**：引入**配置驱动引擎 (Config-Driven Engine)**。将所有平台特异性的 DOM 选择器、匹配正则、注入节点等信息抽离为标准的配置 Schema。引擎通过读取配置动态执行解析与渲染，具备极强的反爬弹性（Resilience to Obfuscation）和平台可扩展性。

---

## 2. 系统核心数据 Schema (Core Data Schemas)

为了让 AI Agent 能够自动生成正确的解析与渲染逻辑，定义以下两大核心 Schema。

### 2.1 平台自适应配置 Schema (`SiteConfigSchema`)
任何平台的适配、新增或防爬更新，都表现为对该 Schema 实例的修改        "detail": {
          "type": "object",
          "properties": {
            "urlPattern": { "type": "string", "description": "判定为详情页的正则" },
            "injection": {
              "type": "object",
              "properties": {
                "targetSelector": { "type": "array", "items": { "type": "string" }, "description": "挂载面板的备选目标节点Selector列表（按优先级尝试，防改版）" },
                "position": { "type": "string", "enum": ["append", "prepend", "before", "after", "fixed"], "description": "挂载相对位置" }
              }
            },
            "parsers": {
              "type": "object",
              "properties": {
                "jobId": { "type": "object", "properties": { "fromUrl": { "type": "string", "description": "从URL提取ID的正则" }, "fromDom": { "type": "array", "items": { "type": "string" }, "description": "DOM备选选择器" } } },
                "title": { "type": "array", "items": { "type": "string" }, "description": "职位名备选 DOM 选择器（顺序尝试，若第一位失效则尝试第二位）" },
                "company": { "type": "array", "items": { "type": "string" }, "description": "公司名备选 DOM 选择器" },
                "salary": { 
                   "type": "object", 
                  "properties": {
                    "selectors": { "type": "array", "items": { "type": "string" } },
                    "regexFallback": { "type": "string", "description": "如果DOM选择器获取失败，在全文或父节点中通过正则匹配薪资的规则，如 '\\d+k-\\d+k'" }
                  }
                },
                "description": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "职务描述（JD）的备选 DOM 选择器列表"
                },
                "jobTags": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "工作标签（Job Tags）的备选 DOM 选择器列表"
                }
              }
            }
          }
        },
        "list": {
          "type": "object",
          "properties": {
            "urlPattern": { "type": "string", "description": "判定为列表页的正则" },
            "cardSelector": { "type": "string", "description": "列表中每个职位卡片的容器选择器" },
            "cardIdExtractor": {
              "type": "object",
              "properties": {
                "attrName": { "type": "string", "description": "存储职位ID的DOM属性名，如 'data-jid' 或 'href'" },
                "regex": { "type": "string", "description": "从该属性提取ID的正则" }
              }
            },
            "detailPreview": {
              "type": "object",
              "properties": {
                "triggerSelector": { "type": "string", "description": "预览分栏的特征容器选择器" },
                "injection": {
                  "type": "object",
                  "properties": {
                    "targetSelector": { "type": "array", "items": { "type": "string" } },
                    "position": { "type": "string", "enum": ["append", "prepend", "before", "after", "fixed"] }
                  }
                },
                "parsers": {
                  "type": "object",
                  "description": "预览页专属独立数据解析器配置规则，结构与 detail.parsers 一致。若省略则退避复用详情页配置规则"
                }
              }
            }
          }
        }
      }
    }
  },
  "required": ["platformKey", "domains", "pages"]
} {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "工作标签（Job Tags）的备选 DOM 选择器列表"
                }
              }
            }
          }
        },
        "list": {
          "type": "object",
          "properties": {
            "urlPattern": { "type": "string", "description": "判定为列表页的正则" },
            "cardSelector": { "type": "string", "description": "列表中每个职位卡片的容器选择器" },
            "cardIdExtractor": {
              "type": "object",
              "properties": {
                "attrName": { "type": "string", "description": "存储职位ID的DOM属性名，如 'data-jid' 或 'href'" },
                "regex": { "type": "string", "description": "从该属性提取ID的正则" }
              }
            }
          }
        }
      }
    }
  },
  "required": ["platformKey", "domains", "pages"]
}
```

### 2.2 用户数据模型 `JobRecord` (保持与 1.0 一致)

```json
{
  "type": "object",
  "properties": {
    "jobGlobalId": {
      "type": "string",
      "description": "全局唯一ID，生成格式：平台标识_职位原始ID。例：'boss_123456' 或 'liepin_abc789'"
    },
    "platform": {
      "type": "string",
      "enum": ["boss", "liepin"],
      "description": "源招聘平台标识"
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
      "description": "薪资范围，如 '20k-30k'"
    },
    "description": {
      "type": "string",
      "description": "职务描述文本内容，最多截取 5000 字符"
    },
    "jobTags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "从网页上采集到的岗位原始工作标签"
    },
    "viewedAt": {
      "type": "string",
      "format": "date-time",
      "description": "首次或最近查看的时间戳"
    },
    "status": {
      "type": "string",
      "enum": ["viewed", "saved", "applied", "rejected"],
      "description": "求职状态：viewed(仅查看), saved(已保存/有意向), applied(已投递), rejected(不感兴趣)"
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" },
      "description": "用户自定义的快速标签，如 ['WLB', "核心技术栈", "离家近"]"
    },
    "note": {
      "type": "string",
      "description": "用户输入的自定义富文本或纯文本备注信息"
    }
  },
  "required": ["jobGlobalId", "platform", "title", "company", "viewedAt", "status"]
}
```

---

## 3. 核心机制设计

### 3.1 核心执行流 (Execution Flow)
每次页面加载或 URL 变更时，核心引擎执行以下无状态流程：

```text
[Page Load / Navigation]
         │
         ▼
[Step 1: 域名匹配] ──► 遍历 SiteConfigs，寻找 domains 匹配项
         │
         ├──(未匹配)──► [退出脚本]
         │
         ▼
[Step 2: 页面类型判定]
         ├── 符合 pages.detail.urlPattern ──► [执行 3.2 详情页逻辑]
         └── 符合 pages.list.urlPattern   ──► [执行 3.3 列表页逻辑]
```

### 3.2 详情页执行逻辑 (Detail Page Engine)
1.  **数据提取**：
    *   按照 `pages.detail.parsers` 中定义的选择器数组，采用**退避机制（Fallback）**依次尝试获取 `jobId`, `title`, `company`, `salary`。
    *   *反爬容错*：如果类名（CSS Class）被加密重命名，优先执行正文匹配（如根据 `salary.regexFallback` 规则，在页面中查找符合 `薪资格式` 的文本节点）。
2.  **组件注入**：
    *   读取 `pages.detail.injection`。
    *   依次尝试 `targetSelector` 中的节点。若成功找到目标节点，根据 `position` 插入“随手记面板”容器。
    *   若所有备选目标节点均未找到（说明平台界面大改），则**降级**为 `position: "fixed"`，将面板强制悬浮渲染在屏幕右下角，确保功能可用性。

### 3.3 列表页执行逻辑 (List Page Engine)
1.  **动态监听**：
    *   由于现代招聘网站多为异步/无限滚动加载，引擎必须注册 `MutationObserver` 监听 body 的变化。
2.  **增量卡片处理**：
    *   每次 DOM 变化，通过 `pages.list.cardSelector` 抓取当前页面上的所有职位卡片。
    *   跳过已经处理过的卡片（通过向已处理 DOM 节点添加私有标记属性避免重复消耗性能）。
3.  **视觉灰度/徽章覆盖**：
    *   对新卡片，通过 `cardIdExtractor` 提取该职位的 `platformKey_jobId`。
    *   比对 `GlobalStorage` 数据库：
        *   若属于“已查看/不感兴趣”：为卡片追加灰度 CSS 样式类名。
        *   若属于“有备注/已保存”：在卡片边缘动态追加轻量标签（Badge），显示用户之前备注的摘要，支持就地查看。

---

## 4. 可配置化与反爬容错方案 (Anti-Scraping & Flexibility)

为了保证这一套逻辑不需要频繁修改代码，需做如下设计：

### 4.1 动态配置更新机制 (Hot-Update Config)
*   **本地默认配置 (Local Seed)**：脚本内置一份基础的 `SiteConfigs` 数组。
*   **云端规则同步 (Remote Fetch)**：
    *   每次启动或每 24 小时一次，脚本尝试静默请求一个静态 JSON 配置（可托管于 GitHub/Gitee Gist 或任何 CDN [2]）。
    *   若成功获取，则将云端更新的 DOM 选择器规则覆盖并存入 `GlobalStorage.settings.remoteConfig`。
    *   **业务价值**：当 Boss 直聘或猎聘网通过更新 CSS 类名进行反爬时，开发者只需在云端修改 JSON 中的 Selector，所有用户的客户端即可自动恢复正常，无需重新打包发布脚本。

### 4.2 鲁棒性提取策略 (Robust Extractor)
为了防止 CSS 类名频繁变动，Agent 在编写 Parser 时应实现以下容错：
1.  **智能模糊匹配**：如果精确选择器（如 `.job-title-box`）失效，尝试使用属性模糊匹配（如 `div[class*="title" i]` 或 `h1[class*="job" i]`）。
2.  **降级至核心文本匹配**：对关键指标（如薪资），若 DOM 树结构改变，使用全局正则匹配（如 `/\d+-\d+K|元\/月/gi`）在父节点文本内容中进行抓取。

---

## 5. 初始配置示例 (Seed SiteConfigs)
AI Agent 可以在脚本当中直接声明此基础配置文件，以便开箱即用：

```json
[
  {
    "platformKey": "boss",
    "displayName": "BOSS直聘",
    "domains": ["*.zhipin.com/*"],
    "pages": {
      "detail": {
        "urlPattern": "/job_detail/.*?\\.html",
        "injection": {
          "targetSelector": [".job-sider", ".job-detail-box", "body"],
          "position": "append"
        },
        "parsers": {
          "jobId": {
            "fromUrl": "job_detail/(.*?)\\.html",
            "fromDom": []
          },
          "title": [".name h1", "h1.job-title", "h1[class*='name']"],
          "company": [".company-info .name", ".company-name", ".aside-company h1"],
          "salary": {
            "selectors": [".salary", "span[class*='salary']"],
            "regexFallback": "\\d+-\\d+K(?:·\\d+薪)?"
          },
          "description": [".job-sec-text", ".job-detail .text", "[class*='job-sec']"],
          "jobTags": [".job-banner .tag-list span", ".job-sec-text .job-tag-list li", ".job-detail .job-tags span"]
        }
      },
      "list": {
        "urlPattern": "/web/geek/job",
        "cardSelector": ".job-card-wrapper, li[class*='job-card']",
        "cardIdExtractor": {
          "attrName": "data-jid",
          "regex": "(.*)"
        }
      }
    }
  }
]
```

---

## 6. Agent 代码生成验收标准 (MVP 2.0 版)

1.  **无状态引擎校验**：核心逻辑不应包含任何硬编码的 `.zhipin` 或 `.liepin` 类名。所有的页面行为、获取行为和注入行为，必须完全由 `SiteConfig` 对象中的参数决定。
2.  **配置热插拔校验**：手动导入一个全新的 `SiteConfig` JSON 规则（例如拉勾网），引擎在无需重新编译/部署的情况下，应能立即适配该新平台的详情页和列表页。
3.  **降级渲染校验**：当配置中的 `targetSelector` 全部在页面上找不到时，面板不能崩溃，必须自动以 `fixed` 悬浮框的形式正常渲染在网页窗口的右下角。
4.  **状态标记定位与类名混淆解耦校验**：列表卡片状态的定位、清理和标记，必须基于固定的静态自定义 HTML 属性进行操作（如使用 `[data-jp-badge="true"]` 来精确定位和移除先前注入的 Badge，使用 `data-jp-gray="true"` 和 `data-jp-processed` 标记卡片灰度和已处理状态），而仅在具体的 Badge 组件上使用动态混淆类名应用样式。这使得即使由于脚本热更新、平台重试加载导致类名哈希变化，系统依然能无缝识别和清理老旧的 Badge 或恢复卡片灰度，绝不出现卡片 Badge 重叠或老灰度无法恢复的异常。
5.  **职务描述异步防脏数据与网络加载容错校验**：对于详情和预览页的职务描述（JD）字段，如果页面 DOM 中正处于“加载中”、“加载失败”、“重新加载”等异步请求过程中的垃圾占位文字，引擎在重试提取期间必须自动予以识别并拦截，绝不能将此类文字作为有效职位信息保存。对于已挂载的面板，一旦接口成功返回，真实的职务描述必须能够在 MutationObserver 监听触发时被无感且瞬间捕获并原地同步，无需人工参与或面板销毁重建。
6.  **标签多段内容智能切分与去重校验**：对于平台解析器提取出的 jobTags 标签数据，引擎必须支持按照空白符、斜杠、竖线、逗号、顿号、间隔符等常见分隔符对文本字符串进行自动拆分。每个被拆分出来的子项需做多余空白清除、去重和防重保护，确保最终存入数据库和渲染在面板上的标签是以干净独立的数组项保存，杜绝一切由于选择器精度或平台渲染粘连引发的标签混淆。
