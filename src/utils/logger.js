// Smart logging system - only logs in development
const isDev = import.meta.env.DEV || window.location.hostname === 'localhost'

export const logger = {
  log: (...args) => isDev && console.log(...args),
  error: (...args) => console.error(...args), // Always show errors
  warn: (...args) => isDev && console.warn(...args),
  info: (...args) => isDev && console.info(...args),
  debug: (...args) => isDev && console.debug(...args)
}

export { isDev }