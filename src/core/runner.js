import { newPage } from "../browser/playwright.js";
import { pickNewSlots, formatSlotsMessage } from "./diff.js";
import { notifyDiscord } from "../notify/discord.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// 실패 시 지수 백오프 + 약간의 지터
function nextDelay(baseMs, failures) {
  const cap = 5 * 60_000;
  const d = Math.min(cap, baseMs * Math.pow(2, failures));
  const jitter = Math.floor(Math.random() * 500);
  return d + jitter;
}

export async function startSiteLoop(cfg, deps) {
  const adapter = deps.adapters[cfg.siteKey];
  if (!adapter) throw new Error(`Adapter not found: ${cfg.siteKey}`);

  let failures = 0;

  while (cfg.enabled) {
      // console.log(
    // `⏱️ [POLL] ${cfg.siteKey} - ${new Date().toLocaleTimeString("ko-KR")}`
    // );
    const delay = failures ? nextDelay(cfg.pollIntervalMs, failures) : cfg.pollIntervalMs;

    try {
      // console.log(`🔎 [CHECK] ${cfg.siteKey} start`);
      const page = await newPage(deps.browser);

      if (adapter.prepare) {
        // console.log(`🧩 [PREPARE] ${cfg.siteKey}`);
        await adapter.prepare(page, cfg);
      } 
      // console.log(`🧠 [ADAPTER] ${cfg.siteKey} extractAvailableSlots() 호출`);
      const slots = await adapter.extractAvailableSlots(page, cfg);

      // console.log(`📦 [RESULT] ${cfg.siteKey} slots=${slots.length}`);

      const newOnes = pickNewSlots(slots, deps.store);

      for (const s of slots) deps.store.markSeen(s);

      if (newOnes.length > 0) {
        const msg = formatSlotsMessage(cfg.name, newOnes);
        await notifyDiscord(msg);

        for (const s of newOnes) deps.store.markNotified(s);
        deps.store.save();
        // console.log(`🚨 [NOTIFIED] ${cfg.siteKey} new=${newOnes.length}`);
      }

      await page.close();
      failures = 0;
      // console.log(`✅ [CHECK] ${cfg.siteKey} done`);
    } catch (e) {
      failures += 1;
      // console.log(`❌ [ERROR] ${cfg.siteKey} failures=${failures}`);
      // console.log(e?.message ?? e);
    }

    await sleep(delay);
  }
}
