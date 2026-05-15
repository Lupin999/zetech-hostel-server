const levels = { error: 0, warn: 1, info: 2, debug: 3 };
const currentLevel = process.env.LOG_LEVEL || 'info';

function shouldLog(level) {
    return levels[level] <= levels[currentLevel];
}

function formatMessage(level, msg, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${msg}${metaStr}`;
}

const logger = {
    error: (msg, meta) => shouldLog('error') && console.error(formatMessage('error', msg, meta)),
    warn: (msg, meta) => shouldLog('warn') && console.warn(formatMessage('warn', msg, meta)),
    info: (msg, meta) => shouldLog('info') && console.log(formatMessage('info', msg, meta)),
    debug: (msg, meta) => shouldLog('debug') && console.log(formatMessage('debug', msg, meta)),
};

module.exports = logger;
