import { newPage } from "../browser/playwright.js";
import { pickNewSlots, formatSlotsMessage } from "./diff.js";
import { notifyDiscord } from "../notify/discord.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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
    const delay = failures ? nextDelay(cfg.pollIntervalMs, failures) : cfg.pollIntervalMs;

    try {
      const page = await newPage(deps.browser);

      if (adapter.prepare) {
        await adapter.prepare(page, cfg);
      }

      const slots = await adapter.extractAvailableSlots(page, cfg);

      const newOnes = await pickNewSlots(slots, deps.store);

      for (const s of slots) await deps.store.markSeen(s);

      if (newOnes.length > 0) {
        const msg = formatSlotsMessage(cfg.name, newOnes);
        await notifyDiscord(msg);

        for (const s of newOnes) await deps.store.markNotified(s);
      }

      await page.close();
      failures = 0;
    } catch (e) {
      failures += 1;
    }

    await sleep(delay);
  }
}
