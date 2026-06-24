import { Storage } from '../storage';
import { JobRecord, JobStatus } from '../types';
import { HASHED_CLASSES } from './hashes';
import { getPanelStyles } from './styles';
import { Logger } from '../utils/logger';

export class JobNestPanel extends HTMLElement {
  private record: JobRecord | null = null;
  private saveTimeout: number | null = null;
  private unsubscribeLogger: (() => void) | null = null;
  
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  // 组件卸载时自动取消订阅
  disconnectedCallback(): void {
    if (this.unsubscribeLogger) {
      this.unsubscribeLogger();
      this.unsubscribeLogger = null;
    }
  }

  // 初始化职位并绑定数据
  initJob(jobId: string, platform: string, title: string, company: string, salary: string, description?: string, jobTags?: string[]): void {
    const globalId = `${platform}_${jobId}`;
    this.setAttribute('data-job-global-id', globalId);
    const existing = Storage.getJobRecord(globalId);
    
    if (existing) {
      this.record = existing;
      this.record.title = title || this.record.title;
      this.record.company = company || this.record.company;
      this.record.salary = salary || this.record.salary;
      if (description) {
        this.record.description = description;
      }
      if (jobTags && jobTags.length > 0) {
        this.record.jobTags = jobTags;
      }
      this.record.viewedAt = new Date().toISOString();
      Storage.saveJobRecord(this.record);
    } else {
      this.record = {
        jobGlobalId: globalId,
        platform,
        title: title || '未知职位',
        company: company || '未知公司',
        salary: salary || '暂无薪资',
        description: description || '',
        jobTags: jobTags || [],
        viewedAt: new Date().toISOString(),
        status: 'viewed',
        tags: [],
        note: ''
      };
      Storage.saveJobRecord(this.record);
    }
    
    this.render();
  }
  
  private render(): void {
    if (!this.record) return;
    
    const styles = getPanelStyles();
    const { record } = this;
    
    const isActive = (status: JobStatus) => record.status === status ? HASHED_CLASSES.activeStatus : '';
    
    const tagsHtml = record.tags.map((tag, idx) => `
      <div class="${HASHED_CLASSES.tagItem}" data-idx="${idx}">
        <span>${tag}</span>
        <span class="jp-tag-del" data-idx="${idx}">×</span>
      </div>
    `).join('');
    
    const isFixed = this.classList.contains('jp-fixed-panel');
    const closeBtnStyle = isFixed ? 'display: block;' : 'display: none;';
    
    this.shadowRoot!.innerHTML = `
      <style>${styles}</style>
      <div class="${HASHED_CLASSES.panelContainer}">
        <div class="${HASHED_CLASSES.panelHeader}">
          <div>
            <h3>Job Nest 随手记</h3>
            <div class="jp-job-info">
              ${escapeHtml(record.company)} · ${escapeHtml(record.title)} · 
              <span style="color: #f43f5e; font-weight: bold;">${escapeHtml(record.salary)}</span>
            </div>
            ${record.jobTags && record.jobTags.length > 0 ? `
              <div class="jp-job-original-tags">
                ${record.jobTags.map(t => `<span class="jp-job-original-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          <button class="jp-close-btn" style="${closeBtnStyle}">关闭</button>
        </div>
        
        <div class="${HASHED_CLASSES.panelBody}">
          <div class="jp-status-title">标记状态</div>
          <div class="jp-status-group">
            <button class="${HASHED_CLASSES.statusBtn} jp-status-viewed ${isActive('viewed')}" data-status="viewed">
              <span>已看</span>
            </button>
            <button class="${HASHED_CLASSES.statusBtn} jp-status-saved ${isActive('saved')}" data-status="saved">
              <span>意向</span>
            </button>
            <button class="${HASHED_CLASSES.statusBtn} jp-status-applied ${isActive('applied')}" data-status="applied">
              <span>投递</span>
            </button>
            <button class="${HASHED_CLASSES.statusBtn} jp-status-rejected ${isActive('rejected')}" data-status="rejected">
              <span>拒绝</span>
            </button>
          </div>
          
          <div class="jp-note-title">备忘录</div>
          <textarea class="${HASHED_CLASSES.noteTextarea}" placeholder="记录通勤距离、面试进展、核心技术要求...">${escapeHtml(record.note)}</textarea>
          
          ${record.description ? `
            <div class="jp-jd-title">
              <span>职务描述</span>
              <button class="jp-jd-toggle" type="button">点击展开</button>
            </div>
            <div class="jp-jd-content">${escapeHtml(record.description)}</div>
          ` : ''}
          
          <div class="jp-tag-title">求职标签</div>
          <div class="${HASHED_CLASSES.tagContainer}">
            ${tagsHtml}
            <input type="text" class="${HASHED_CLASSES.tagInput}" placeholder="+ 新增标签" />
          </div>
        </div>
        
        <div class="${HASHED_CLASSES.panelFooter}">
          <span class="jp-save-status">✓ 已保存</span>
          <span class="jp-version-clicker">v2.0 Config-Driven</span>
        </div>

        <!-- 调试日志控制台抽屉 -->
        <div class="${HASHED_CLASSES.logDrawer}">
          <div class="${HASHED_CLASSES.logHeader}">
            <span>系统运行调试日志</span>
            <button class="jp-log-clear">清空</button>
          </div>
          <div class="${HASHED_CLASSES.logList}"></div>
        </div>
      </div>
    `;
    
    this.setupEventListeners();
  }
  
  private showSaveTip(): void {
    const tip = this.shadowRoot!.querySelector('.jp-save-status');
    if (tip) {
      tip.classList.add('jp-show');
      setTimeout(() => tip.classList.remove('jp-show'), 1200);
    }
  }
  
  private setupEventListeners(): void {
    const root = this.shadowRoot!;
    
    // 1. 状态改变
    const statusBtns = root.querySelectorAll(`.${HASHED_CLASSES.statusBtn}`);
    statusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.record) return;
        const newStatus = btn.getAttribute('data-status') as JobStatus;
        this.record.status = newStatus;
        
        statusBtns.forEach(b => b.classList.remove(HASHED_CLASSES.activeStatus));
        btn.classList.add(HASHED_CLASSES.activeStatus);
        
        Storage.saveJobRecord(this.record);
        this.showSaveTip();
        this.triggerUpdateEvent();
      });
    });
    
    // 2. 备注输入防抖
    const textarea = root.querySelector(`.${HASHED_CLASSES.noteTextarea}`) as HTMLTextAreaElement;
    textarea.addEventListener('input', () => {
      if (!this.record) return;
      this.record.note = textarea.value;
      
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
      }
      
      this.saveTimeout = window.setTimeout(() => {
        if (this.record) {
          Storage.saveJobRecord(this.record);
          this.showSaveTip();
          this.triggerUpdateEvent();
        }
      }, 300);
    });
    
    // 3. 删除标签
    const delBtns = root.querySelectorAll('.jp-tag-del');
    delBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.record) return;
        const idx = parseInt(btn.getAttribute('data-idx') || '0', 10);
        this.record.tags.splice(idx, 1);
        
        Storage.saveJobRecord(this.record);
        this.render();
        this.showSaveTip();
        this.triggerUpdateEvent();
      });
    });
    
    // 4. 新增标签
    const tagInput = root.querySelector(`.${HASHED_CLASSES.tagInput}`) as HTMLInputElement;
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && tagInput.value.trim() && this.record) {
        const val = tagInput.value.trim();
        if (!this.record.tags.includes(val)) {
          this.record.tags.push(val);
          Storage.saveJobRecord(this.record);
          this.render();
          this.showSaveTip();
          this.triggerUpdateEvent();
        }
        tagInput.value = '';
      }
    });
    
    // 5. 关闭按钮事件
    const closeBtn = root.querySelector('.jp-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.style.display = 'none';
      });
    }

    // 6. 版本文字连续点击彩蛋（5次）
    const clicker = root.querySelector('.jp-version-clicker');
    let clickCount = 0;
    let clickTimeout: number | null = null;
    if (clicker) {
      clicker.addEventListener('click', () => {
        clickCount++;
        if (clickTimeout) window.clearTimeout(clickTimeout);
        clickTimeout = window.setTimeout(() => {
          clickCount = 0;
        }, 1500);

        if (clickCount >= 5) {
          clickCount = 0;
          if (clickTimeout) window.clearTimeout(clickTimeout);
          this.toggleLogDrawer();
        }
      });
    }

    // 7. 清空日志按钮
    const logClearBtn = root.querySelector('.jp-log-clear');
    if (logClearBtn) {
      logClearBtn.addEventListener('click', () => {
        Logger.clearLogs();
      });
    }
    
    // 8. 职务描述折叠/展开切换
    const jdToggles = root.querySelectorAll('.jp-jd-toggle');
    jdToggles.forEach(toggle => {
      toggle.addEventListener('click', () => {
        const content = toggle.parentElement?.nextElementSibling as HTMLElement | null;
        if (content && content.classList.contains('jp-jd-content')) {
          content.classList.toggle('jp-jd-open');
          const isOpen = content.classList.contains('jp-jd-open');
          toggle.textContent = isOpen ? '点击折叠' : '点击展开';
        }
      });
    });
  }

  private toggleLogDrawer(): void {
    const root = this.shadowRoot!;
    const drawer = root.querySelector(`.${HASHED_CLASSES.logDrawer}`);
    if (!drawer) return;

    drawer.classList.toggle('jp-open');
    const isOpen = drawer.classList.contains('jp-open');

    if (isOpen) {
      this.renderLogs();
      // 订阅日志库更新以重绘
      this.unsubscribeLogger = Logger.onChange(() => {
        this.renderLogs();
      });
    } else {
      // 取消订阅
      if (this.unsubscribeLogger) {
        this.unsubscribeLogger();
        this.unsubscribeLogger = null;
      }
    }
  }

  private renderLogs(): void {
    const root = this.shadowRoot!;
    const listEl = root.querySelector(`.${HASHED_CLASSES.logList}`) as HTMLElement | null;
    if (!listEl) return;

    const logs = Logger.getLogs();
    if (logs.length === 0) {
      listEl.innerHTML = `<div class="${HASHED_CLASSES.logItem} jp-log-info">暂无调试日志...</div>`;
      return;
    }

    listEl.innerHTML = logs.map(log => {
      const lvlClass = log.level === 'info' ? 'jp-log-info' : log.level === 'warn' ? 'jp-log-warn' : 'jp-log-error';
      return `<div class="${HASHED_CLASSES.logItem} ${lvlClass}">[${log.time}] [${log.level.toUpperCase()}] ${escapeHtml(log.message)}</div>`;
    }).join('');

    // 自动滚动到最新日志
    listEl.scrollTop = listEl.scrollHeight;
  }
  
  private triggerUpdateEvent(): void {
    if (this.record) {
      window.dispatchEvent(new CustomEvent('jp-record-changed', {
        detail: { ...this.record }
      }));
    }
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

customElements.define('job-nest-panel', JobNestPanel);
export const PANEL_TAG_NAME = 'job-nest-panel';
