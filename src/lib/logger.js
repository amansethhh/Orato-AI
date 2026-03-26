/**
 * Orato AI — Structured Logger
 * Use this instead of console.log throughout the app.
 *
 * In production: only warn + error are logged.
 * In development: all levels are logged.
 */

const IS_DEV = import.meta.env.DEV;
const APP_NAME = "Orato";

function formatMsg(level, msg) {
  return `[${APP_NAME}] [${level.toUpperCase()}] ${msg}`;
}

const logger = {
  debug(msg, ...data) {
    if (IS_DEV) console.debug(formatMsg("debug", msg), ...data);
  },

  info(msg, ...data) {
    if (IS_DEV) console.log(formatMsg("info", msg), ...data);
  },

  warn(msg, ...data) {
    console.warn(formatMsg("warn", msg), ...data);
  },

  error(msg, ...data) {
    console.error(formatMsg("error", msg), ...data);
  },
};

export default logger;
