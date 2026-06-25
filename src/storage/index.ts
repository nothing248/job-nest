import { JobRecord, SiteConfig } from '../types';
import { DEFAULT_SITE_CONFIGS } from '../config/seed';
import { GM_getValue, GM_setValue, GM_registerMenuCommand, GM_setClipboard } from '$';
import { Logger } from '../utils/logger';


const STORAGE_KEYS = {
  JOB_RECORDS: 'jp_job_records',
  REMOTE_CONFIGS: 'jp_remote_configs',
  LAST_SYNC: 'jp_last_sync_time',
  DISABLE_REMOTE_SYNC: 'jp_disable_remote_sync'
};

// 获取所有职位记录，以字典形式返回以方便查找
function getJobRecordsMap(): Record<string, JobRecord> {
  try {
    const raw = GM_getValue<string>(STORAGE_KEYS.JOB_RECORDS, '{}');
    return JSON.parse(raw);
  } catch (e) {
    Logger.error('解析 JobRecord 失败，回退到空对象:', e);
    return {};
  }
}

// 保存职位记录字典
function saveJobRecordsMap(map: Record<string, JobRecord>): void {
  GM_setValue(STORAGE_KEYS.JOB_RECORDS, JSON.stringify(map));
}

export const Storage = {
  // 获取是否禁用远程配置
  isRemoteSyncDisabled(): boolean {
    return GM_getValue<boolean>(STORAGE_KEYS.DISABLE_REMOTE_SYNC, false);
  },

  // 设置是否禁用远程配置
  setRemoteSyncDisabled(disabled: boolean): void {
    GM_setValue(STORAGE_KEYS.DISABLE_REMOTE_SYNC, disabled);
  },

  // 保存或更新一条职位记录
  saveJobRecord(record: JobRecord): void {
    const map = getJobRecordsMap();
    map[record.jobGlobalId] = record;
    saveJobRecordsMap(map);
  },

  // 获取单个职位记录
  getJobRecord(jobGlobalId: string): JobRecord | undefined {
    const map = getJobRecordsMap();
    return map[jobGlobalId];
  },

  // 删除一条职位记录
  deleteJobRecord(jobGlobalId: string): void {
    const map = getJobRecordsMap();
    if (map[jobGlobalId]) {
      delete map[jobGlobalId];
      saveJobRecordsMap(map);
    }
  },

  // 获取所有职位记录数组
  getAllJobRecords(): JobRecord[] {
    const map = getJobRecordsMap();
    return Object.values(map);
  },

  // 获取配置：合并默认配置与云端更新的配置
  getSiteConfigs(): SiteConfig[] {
    if (this.isRemoteSyncDisabled()) {
      return DEFAULT_SITE_CONFIGS;
    }
    try {
      const rawRemote = GM_getValue<string>(STORAGE_KEYS.REMOTE_CONFIGS, '[]');
      const remoteConfigs: SiteConfig[] = JSON.parse(rawRemote);
      
      if (!Array.isArray(remoteConfigs) || remoteConfigs.length === 0) {
        return DEFAULT_SITE_CONFIGS;
      }

      // 将远程配置与默认配置合并，如果 platformKey 冲突，优先使用远程配置
      const merged: Record<string, SiteConfig> = {};
      
      // 1. 先载入默认配置
      for (const config of DEFAULT_SITE_CONFIGS) {
        merged[config.platformKey] = config;
      }
      
      // 2. 用远程配置覆盖
      for (const config of remoteConfigs) {
        if (config && config.platformKey) {
          merged[config.platformKey] = config;
        }
      }
      
      return Object.values(merged);
    } catch (e) {
      Logger.error('获取合并配置失败，回退到本地默认配置:', e);
      return DEFAULT_SITE_CONFIGS;
    }
  },

  // 保存远程配置
  saveRemoteConfigs(configs: SiteConfig[]): void {
    GM_setValue(STORAGE_KEYS.REMOTE_CONFIGS, JSON.stringify(configs));
  },

  // 获取上一次同步时间
  getLastSyncTime(): number {
    return GM_getValue<number>(STORAGE_KEYS.LAST_SYNC, 0);
  },

  // 保存上一次同步时间
  saveLastSyncTime(time: number): void {
    GM_setValue(STORAGE_KEYS.LAST_SYNC, time);
  },

  // 清空所有数据
  clearAllData(): void {
    GM_setValue(STORAGE_KEYS.JOB_RECORDS, '{}');
    GM_setValue(STORAGE_KEYS.REMOTE_CONFIGS, '[]');
    GM_setValue(STORAGE_KEYS.LAST_SYNC, 0);
  },

  // 导出为 JSON 字符串
  exportToJson(): string {
    const records = this.getAllJobRecords();
    return JSON.stringify(records, null, 2);
  },

  // 导出为 CSV 字符串
  exportToCsv(): string {
    const records = this.getAllJobRecords();
    const headers = ['jobGlobalId', 'platform', 'title', 'company', 'salary', 'description', 'jobTags', 'viewedAt', 'status', 'tags', 'note', 'address'];
    
    const escapeCsvValue = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      let str = '';
      if (Array.isArray(val)) {
        str = val.join(',');
      } else {
        str = String(val);
      }
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = [headers.join(',')];
    for (const record of records) {
      const values = [
        record.jobGlobalId,
        record.platform,
        record.title,
        record.company,
        record.salary,
        record.description || '',
        record.jobTags || [],
        record.viewedAt,
        record.status,
        record.tags,
        record.note,
        record.address || ''
      ];
      csvRows.push(values.map(escapeCsvValue).join(','));
    }
    
    return csvRows.join('\r\n');
  },

  // 从 JSON 导入数据
  importFromJson(jsonStr: string): { success: boolean; count: number; message: string } {
    try {
      const records = JSON.parse(jsonStr);
      if (!Array.isArray(records)) {
        return { success: false, count: 0, message: '导入的数据不是一个有效的 JSON 数组' };
      }
      
      const map = getJobRecordsMap();
      let importedCount = 0;
      
      for (const item of records) {
        if (item && item.jobGlobalId && item.platform && item.title && item.company && item.status) {
          // 合法性校验
          const record: JobRecord = {
            jobGlobalId: String(item.jobGlobalId),
            platform: String(item.platform),
            title: String(item.title),
            company: String(item.company),
            salary: String(item.salary || ''),
            description: item.description ? String(item.description) : '',
            jobTags: Array.isArray(item.jobTags) ? item.jobTags.map(String) : [],
            viewedAt: String(item.viewedAt || new Date().toISOString()),
            status: item.status as JobRecord['status'],
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            note: String(item.note || ''),
            address: item.address ? String(item.address) : ''
          };
          map[record.jobGlobalId] = record;
          importedCount++;
        }
      }
      
      saveJobRecordsMap(map);
      return { success: true, count: importedCount, message: `成功导入 ${importedCount} 条记录` };
    } catch (e) {
      return { success: false, count: 0, message: `解析 JSON 失败: ${(e as Error).message}` };
    }
  }
};

// 触发浏览器下载文本文件的辅助函数
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 注册油猴菜单命令
export function registerMenuCommands(): void {
  // 1. 导出为 JSON
  GM_registerMenuCommand('导出求职标记数据 (JSON)', () => {
    try {
      const data = Storage.exportToJson();
      downloadFile(data, `job-nest-export-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8;');
      alert('数据导出成功 (JSON)！');
    } catch (e) {
      alert('数据导出失败: ' + (e as Error).message);
    }
  });

  // 2. 导出为 CSV
  GM_registerMenuCommand('导出求职标记数据 (CSV)', () => {
    try {
      const data = Storage.exportToCsv();
      // 使用 BOM 兼容 Excel 中文乱码
      const dataWithBom = '\uFEFF' + data;
      downloadFile(dataWithBom, `job-nest-export-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
      alert('数据导出成功 (CSV)！');
    } catch (e) {
      alert('数据导出失败: ' + (e as Error).message);
    }
  });

  // 3. 导入数据
  GM_registerMenuCommand('导入求职标记数据 (JSON)', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const result = Storage.importFromJson(text);
        alert(result.message);
        if (result.success) {
          window.location.reload();
        }
      };
      reader.readAsText(file);
    };
    fileInput.click();
  });

  // 4. 清除数据
  GM_registerMenuCommand('清除所有标记数据', () => {
    if (confirm('确定要清空所有的求职标记数据吗？该操作不可逆！')) {
      Storage.clearAllData();
      alert('所有数据已被清空。');
      window.location.reload();
    }
  });

  // 5. 复制渲染后的源码 (含 Shadow DOM)
  GM_registerMenuCommand('复制当前页面渲染源码 (含 Shadow DOM)', copyRenderedSource);

  // 6. 复制系统运行日志
  GM_registerMenuCommand('复制当前系统调试日志', copySystemLogs);

  // 7. 切换远程配置同步状态
  const isDisabled = Storage.isRemoteSyncDisabled();
  const syncLabel = isDisabled ? '⚙️ [调试模式] 开启云端同步' : '⚙️ [生产模式] 禁用云端同步(强制本地Seed)';
  GM_registerMenuCommand(syncLabel, () => {
    Storage.setRemoteSyncDisabled(!isDisabled);
    alert(!isDisabled 
      ? '已进入本地调试模式（强制使用本地默认 Seed 配置，不请求远程），页面将刷新生效！' 
      : '已开启云端配置同步，页面将刷新生效！'
    );
    window.location.reload();
  });
}

// 递归穿透 Shadow DOM 序列化页面源码，并把 Shadow Root 转化为 template shadowroot 结构
function getPageSourceWithShadowDOM(root: Node = document.documentElement): string {
  if (root.nodeType === Node.TEXT_NODE) {
    return escapeHtmlForSource(root.textContent || '');
  }
  if (root.nodeType === Node.COMMENT_NODE) {
    return `<!--${root.textContent}-->`;
  }
  if (root.nodeType === Node.DOCUMENT_TYPE_NODE) {
    const docType = root as DocumentType;
    return `<!DOCTYPE ${docType.name}${docType.publicId ? ` PUBLIC "${docType.publicId}"` : ''}${!docType.publicId && docType.systemId ? ' SYSTEM' : ''}${docType.systemId ? ` "${docType.systemId}"` : ''}>\n`;
  }
  
  if (root.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  
  const el = root as HTMLElement;
  const tagName = el.tagName.toLowerCase();
  
  // 拼接属性
  let attrs = '';
  if (el.attributes) {
    for (let i = 0; i < el.attributes.length; i++) {
      const attr = el.attributes[i];
      attrs += ` ${attr.name}="${attr.value.replace(/"/g, '&quot;')}"`;
    }
  }
  
  let innerHTML = '';
  // 穿透 Shadow DOM
  if (el.shadowRoot) {
    innerHTML += `<template shadowrootmode="open">`;
    for (let i = 0; i < el.shadowRoot.childNodes.length; i++) {
      innerHTML += getPageSourceWithShadowDOM(el.shadowRoot.childNodes[i]);
    }
    innerHTML += `</template>`;
  }
  
  if (el.childNodes) {
    for (let i = 0; i < el.childNodes.length; i++) {
      innerHTML += getPageSourceWithShadowDOM(el.childNodes[i]);
    }
  }
  
  const selfClosing = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
  if (selfClosing.includes(tagName)) {
    return `<${tagName}${attrs} />`;
  }
  
  return `<${tagName}${attrs}>${innerHTML}</${tagName}>`;
}

function escapeHtmlForSource(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function copyRenderedSource(): void {
  try {
    const source = getPageSourceWithShadowDOM();
    GM_setClipboard(source, 'text');
    alert('当前页面渲染源码 (含 Shadow DOM) 已成功复制到剪贴板！');
  } catch (e) {
    alert('复制页面源码失败: ' + (e as Error).message);
  }
}

export function copySystemLogs(): void {
  const logs = Logger.getLogs();
  if (logs.length === 0) {
    alert('当前暂无系统运行日志记录。');
    return;
  }
  const formattedLogs = logs.map(log => {
    return `[${log.time}] [${log.level.toUpperCase()}] ${log.message}`;
  }).join('\n');
  
  try {
    GM_setClipboard(formattedLogs, 'text');
    alert('系统调试日志已成功复制到剪贴板！');
  } catch (e) {
    alert('复制日志失败: ' + (e as Error).message);
  }
}
