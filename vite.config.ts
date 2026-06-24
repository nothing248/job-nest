import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: '跨平台求职信息标记与辅助决策工具',
        namespace: 'https://github.com/nickyang/job-nest',
        version: '2.0.0',
        author: 'Antigravity',
        description: '跨平台求职辅助工具，支持已查看、已投递标记、随手记备注、自定义标签，以及列表页卡片灰度与徽章覆盖。',
        match: [
          'https://*.zhipin.com/*',
          'https://*.liepin.com/*'
        ],
        connect: [
          '*'
        ],
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_xmlhttpRequest',
          'GM_registerMenuCommand',
          'GM_setClipboard'
        ],
        'run-at': 'document-start'
      },
    }),
  ],
});
