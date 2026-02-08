/**
 * SiteAdapter contract
 * @typedef {Object} SiteAdapter
 * @property {string} siteKey
 * @property {(page, cfg) => Promise<void>=} prepare   // optional
 * @property {(page, cfg) => Promise<Array<Object>>} extractAvailableSlots
 */

/**
 * Slot shape (standardized)
 * @typedef {Object} Slot
 * @property {string} siteKey
 * @property {string=} theme
 * @property {string} date   // "YYYY-MM-DD"
 * @property {string} time   // "HH:mm"
 * @property {string=} bookUrl
 * @property {Object=} meta
 */
export {};