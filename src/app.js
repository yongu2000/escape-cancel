import dotenv from "dotenv";
import { createBrowser } from "./browser/playwright.js";
import { sites } from "./config/sites.js";
import { StateStore } from "./store/stateStore.js";
import { startSiteLoop } from "./core/runner.js";
import { notifyDiscord } from "./notify/discord.js";
import { RabbitHoleAdapter } from "./adapters/rabbithole.adapter.js";
import { FilmByEddyAdapter } from "./adapters/filmbyeddy.adapter.js";
import { DpsnnnAdapter } from "./adapters/dpns_g.adapter.js";

dotenv.config();
async function main() {
  const store = new StateStore();
  store.load();

  const enabledSites = sites.filter((s) => s.enabled);
  // console.log("enabledSites =", enabledSites.map((s) => s.siteKey));
  if (enabledSites.length === 0) {
    // console.log("⚠️ enabled 사이트가 없습니다. sites.js의 enabled 확인");
    return;
  }

  const adapters = {
    [RabbitHoleAdapter.siteKey]: RabbitHoleAdapter,
    [FilmByEddyAdapter.siteKey]: FilmByEddyAdapter,
    [DpsnnnAdapter.siteKey]: DpsnnnAdapter,
  };

  const browser = await createBrowser();

  await notifyDiscord("escape-watcher 폴링 서버가 시작되었습니다.");

  // 각 사이트별로 영구 루프 시작 (Promise가 resolve 되지 않음)
  await Promise.all(
    enabledSites.map((cfg) => {
      // console.log(`▶ start loop: ${cfg.siteKey} every ${cfg.pollIntervalMs}ms`);
      return startSiteLoop(cfg, { browser, store, adapters });
    })
  );
}

main().catch((err) => {
  notifyDiscord("escape-watcher 서버에 에러가 발생했습니다.");
  console.error("❌ main crashed:", err);
  process.exitCode = 1;
});
