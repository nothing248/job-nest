export interface LogItem {
  time: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

const MAX_LOGS = 120;
const logStore: LogItem[] = [];
const listeners: Array<() => void> = [];

export const Logger = {
  info(msg: string, ...args: unknown[]): void {
    this.addLog('info', msg, args);
  },

  warn(msg: string, ...args: unknown[]): void {
    this.addLog('warn', msg, args);
  },

  error(msg: string, ...args: unknown[]): void {
    this.addLog('error', msg, args);
  },

  getLogs(): LogItem[] {
    return [...logStore];
  },

  onChange(listener: () => void): () => void {
    listeners.push(listener);
    // 返回一个卸载函数
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) {
        listeners.splice(idx, 1);
      }
    };
  },

  clearLogs(): void {
    logStore.length = 0;
    for (const listener of listeners) {
      try {
        listener();
      } catch (err) {
        // ignore
      }
    }
  },

  addLog(level: 'info' | 'warn' | 'error', msg: string, args: unknown[]): void {
    const formattedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return arg.message + (arg.stack ? '\n' + arg.stack : '');
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return '[Unserializable Object]';
        }
      }
      return String(arg);
    }).join(' ');

    const fullMsg = formattedArgs ? `${msg} ${formattedArgs}` : msg;
    const time = new Date().toLocaleTimeString();

    logStore.push({ time, level, message: fullMsg });

    if (logStore.length > MAX_LOGS) {
      logStore.shift();
    }

    // 维持原生控制台日志，方便一般调试
    const logPrefix = `[JobNest]`;
    if (level === 'info') {
      console.log(logPrefix, fullMsg);
    } else if (level === 'warn') {
      console.warn(logPrefix, fullMsg);
    } else {
      console.error(logPrefix, fullMsg);
    }

    // 触发订阅回调以渲染 UI
    for (const listener of listeners) {
      try {
        listener();
      } catch (err) {
        // 避开死循环
      }
    }
  }
};
