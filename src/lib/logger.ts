import pino from 'pino';

const isServer = typeof window === 'undefined';

// Temporary replacement to debug build issues with pino
export const logger = {
  info: (msg: any, ...args: any[]) => console.log(msg, ...args),
  error: (msg: any, ...args: any[]) => console.error(msg, ...args),
  warn: (msg: any, ...args: any[]) => console.warn(msg, ...args),
  debug: (msg: any, ...args: any[]) => console.debug(msg, ...args),
  child: () => logger, // Mock child logger
};

export default logger;
