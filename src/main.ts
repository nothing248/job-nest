import { Storage, registerMenuCommands } from './storage';
import { injectGlobalStyles } from './ui/styles';
import { startEngine } from './engine';
import { SiteConfig } from './types';
import { GM_xmlhttpRequest } from '$';
import { Logger } from './utils/logger';

// ==================== 1. 防爬路由回退与页面刷新劫持对抗 (Anti-Kick & Anti-Reload Hijack) ====================
if (window.location.hostname.includes('zhipin.com')) {
  try {
    // A. 拦截路由回退
    window.history.back = function(): void {
      Logger.warn('拦截了 BOSS直聘 的控制台反爬 history.back() 自动回退动作。');
    };

    const originalGo = window.history.go;
    window.history.go = function(delta?: number): any {
      if (delta === -1) {
        Logger.warn('拦截了 BOSS直聘 的控制台反爬 history.go(-1) 自动回退动作。');
        return;
      }
      return originalGo.call(window.history, delta);
    };

    // B. 拦截频繁刷新重载 (8秒冷却时间限制)
    let lastReloadTime = 0;
    const RELOAD_COOL_DOWN = 8000;

    const originalReload = Location.prototype.reload;
    Location.prototype.reload = function(): void {
      const now = Date.now();
      if (now - lastReloadTime < RELOAD_COOL_DOWN) {
        Logger.warn('已拦截高频次的 Location.reload() 刷新动作。');
        return;
      }
      lastReloadTime = now;
      return originalReload.call(this);
    };

    const originalReplace = Location.prototype.replace;
    Location.prototype.replace = function(url: string): void {
      const now = Date.now();
      const isSelf = url === window.location.href || url.includes(window.location.pathname);
      if (isSelf && (now - lastReloadTime < RELOAD_COOL_DOWN)) {
        Logger.warn('已拦截高频次的 Location.replace() 同页重载跳转。目标:', url);
        return;
      }
      if (isSelf) {
        lastReloadTime = now;
      }
      return originalReplace.call(window.location, url);
    };

    Logger.info('防回退及防无限刷新重载对抗机制已成功在 document-start 注入。');
  } catch (e) {
    Logger.error('注入防回退及防无限刷新重载对抗机制异常:', e);
  }
}

// 远程同步配置文件 URL (GitHub Pages API 路由)
const REMOTE_CONFIG_URL = 'https://nothing248.github.io/job-nest/v1/remote-configs.json';
const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 24小时同步一次

function init(): void {
  Logger.info('Job Nest v2.0 Config-Driven 初始化中...');

  // 1. 注入全局防检测样式 (灰度卡片、列表 Badge 等)
  try {
    injectGlobalStyles();
  } catch (e) {
    Logger.error('Job Nest: 注入全局样式失败:', e);
  }

  // 2. 注册油猴插件菜单项 (数据导入/导出/清理)
  try {
    registerMenuCommands();
  } catch (e) {
    Logger.error('Job Nest: 注册插件菜单失败:', e);
  }

  // 3. 异步尝试远程配置静默热同步
  try {
    syncRemoteConfigsIfExpired();
  } catch (e) {
    Logger.error('Job Nest: 异步同步配置异常:', e);
  }

  // 4. 获取本地或云端配置，启动路由与解析引擎
  const configs = Storage.getSiteConfigs();
  try {
    startEngine(configs);
  } catch (e) {
    Logger.error('Job Nest: 引擎启动失败:', e);
  }
}

// 检查是否过期并执行配置拉取
function syncRemoteConfigsIfExpired(): void {
  if (Storage.isRemoteSyncDisabled()) {
    Logger.info('Job Nest: 当前处于本地调试模式（禁用远程同步），不进行云端配置拉取。');
    return;
  }
  const lastSync = Storage.getLastSyncTime();
  const now = Date.now();

  if (now - lastSync > SYNC_INTERVAL) {
    Logger.info('Job Nest: 云端解析规则已过期，正在静默热拉取最新选择器规则...');
    
    GM_xmlhttpRequest({
      method: 'GET',
      url: REMOTE_CONFIG_URL,
      timeout: 10000, // 10秒超时
      onload: (response: any) => {
        if (response.status === 200) {
          try {
            const configs: SiteConfig[] = JSON.parse(response.responseText);
            if (Array.isArray(configs) && configs.length > 0 && configs[0].platformKey) {
              Storage.saveRemoteConfigs(configs);
              Storage.saveLastSyncTime(now);
              Logger.info(`Job Nest: 云端配置同步成功，已同步 ${configs.length} 个平台的选择器规则。`);
            } else {
              Logger.warn('Job Nest: 远程配置格式不合法，未进行覆盖。');
            }
          } catch (err) {
            Logger.warn('Job Nest: 远程配置 JSON 解析失败，维持当前本地配置。', err);
          }
        } else {
          Logger.warn(`Job Nest: 远程配置请求失败，HTTP 状态码: ${response.status}`);
        }
      },
      onerror: (err: any) => {
        Logger.warn('Job Nest: 无法连接至云端配置服务器，将继续使用内置/缓存的配置规则。', err);
      },
      ontimeout: () => {
        Logger.warn('Job Nest: 远程配置同步超时，将继续使用内置/缓存配置。');
      }
    });
  } else {
    const hoursLeft = ((SYNC_INTERVAL - (now - lastSync)) / (60 * 60 * 1000)).toFixed(1);
    Logger.info(`Job Nest: 规则缓存尚在有效期内，距离下次静默检查还有 ${hoursLeft} 小时。`);
  }
}

// 启动执行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
