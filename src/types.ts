export interface DetailParsers {
  jobId: {
    fromUrl?: string;
    fromDom?: string[];
  };
  title: string[];
  company: string[];
  salary: {
    selectors: string[];
    regexFallback?: string;
  };
  description?: string[];
  jobTags?: string[];
  address?: string[];
}

export interface SiteConfig {
  platformKey: string;
  displayName: string;
  domains: string[];
  pages: {
    detail?: {
      urlPattern: string;
      injection: {
        targetSelector: string[];
        position: 'append' | 'prepend' | 'before' | 'after' | 'fixed';
      };
      parsers: DetailParsers;
    };
    list?: {
      urlPattern: string;
      cardSelector: string;
      cardIdExtractor: {
        attrName: string;
        regex?: string;
      };
      detailPreview?: {
        triggerSelector: string;
        injection: {
          targetSelector: string[];
          position: 'append' | 'prepend' | 'before' | 'after' | 'fixed';
        };
        parsers?: DetailParsers;
      };
    };
  };
}

export type JobStatus = 'viewed' | 'saved' | 'applied' | 'rejected';

export interface JobRecord {
  jobGlobalId: string; // 格式: 平台标识_职位原始ID，例: boss_123456
  platform: string; // 源招聘平台标识, 如 'boss'
  title: string;
  company: string;
  salary: string;
  description?: string;
  jobTags?: string[];
  viewedAt: string; // ISO DateTime string
  status: JobStatus;
  tags: string[];
  note: string;
  address?: string;
}
