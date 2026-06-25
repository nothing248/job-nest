import { JobRecord } from '../types';
import { HASHED_CLASSES } from './hashes';

// 更新职位卡片的 Badge 状态与内容
export function updateCardBadge(cardEl: HTMLElement, record?: JobRecord): void {
  // 查找是否已经有 Badge (使用固定属性标识定位)
  let badgeEl = cardEl.querySelector('[data-jp-badge="true"]') as HTMLElement | null;

  // 灰度逻辑：对于 viewed 和 rejected 状态，启用 data-jp-gray 属性，且移除/不展示 Badge (以防遮挡)
  if (record && (record.status === 'viewed' || record.status === 'rejected')) {
    cardEl.setAttribute('data-jp-gray', 'true');
    if (badgeEl) {
      badgeEl.remove();
    }
    return;
  }

  // 移除灰度状态属性
  cardEl.removeAttribute('data-jp-gray');

  // 判断是否需要展示 Badge (当有备注或者 status 为 saved/applied 时展示)
  const hasNote = record && record.note && record.note.trim().length > 0;
  const isSavedOrApplied = record && (record.status === 'saved' || record.status === 'applied');

  if (!record || (!hasNote && !isSavedOrApplied)) {
    // 不需要 Badge，若有则移除
    if (badgeEl) {
      badgeEl.remove();
    }
    return;
  }

  // 确定 Badge 显示的内容
  let badgeText = '';
  let badgeTitle = ''; // Hover 时显示的详细提示

  if (record.status === 'applied') {
    badgeText = '✓ 已投递';
    badgeTitle = '您已投递该职位';
  } else if (record.status === 'saved') {
    badgeText = '⭐ 意向岗位';
    badgeTitle = '已收藏此岗位';
  }

  if (hasNote) {
    const notePreview = record.note.length > 8 ? record.note.slice(0, 8) + '...' : record.note;
    badgeText = `${badgeText ? badgeText + ' | ' : ''}📝 ${notePreview}`;
    badgeTitle = `${badgeTitle ? badgeTitle + '\n' : ''}备注: ${record.note}`;
  }

  if (record.tags && record.tags.length > 0) {
    badgeTitle += `\n标签: ${record.tags.join(', ')}`;
  }

  // 如果没有 Badge，则新建
  if (!badgeEl) {
    badgeEl = document.createElement('div');
    badgeEl.className = HASHED_CLASSES.badge;
    badgeEl.setAttribute('data-jp-badge', 'true'); // 打上固定标识以供跨周期定位

    // 确保卡片父级有相对定位类名，以便 Badge 绝对定位生效
    cardEl.classList.add('jp-relative-card');
    cardEl.appendChild(badgeEl);
  }

  badgeEl.textContent = badgeText;
  badgeEl.title = badgeTitle;
}

// 移除 Badge 与灰度
export function removeCardBadge(cardEl: HTMLElement): void {
  cardEl.removeAttribute('data-jp-gray');
  const badgeEl = cardEl.querySelector('[data-jp-badge="true"]');
  if (badgeEl) {
    badgeEl.remove();
  }
}
