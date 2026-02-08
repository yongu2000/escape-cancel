import express from "express";
import { createBrowser } from "./browser/playwright.js";
import { sites } from "./config/sites.js";
import { StateStore } from "./store/stateStore.js";
import { startSiteLoop } from "./core/runner.js";
import { notifyDiscord } from "./notify/discord.js";
import { RabbitHoleAdapter } from "./adapters/rabbithole.adapter.js";
import { FilmByEddyAdapter } from "./adapters/filmbyeddy.adapter.js";
import { DpsnnnAdapter } from "./adapters/dpns_g.adapter.js";

async function startWebServer() {
  const app = express();

  app.get("/health", (req, res) => res.status(200).send("ok"));

  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => {
    console.log(`web server listening on :${port}`);
  });
}

async function startWatcher() {
  const store = new StateStore();
  await store.init();

  const enabledSites = sites.filter((s) => s.enabled);
  if (enabledSites.length === 0) return;

  const adapters = {
    [RabbitHoleAdapter.siteKey]: RabbitHoleAdapter,
    [FilmByEddyAdapter.siteKey]: FilmByEddyAdapter,
    [DpsnnnAdapter.siteKey]: DpsnnnAdapter,
  };

  const browser = await createBrowser();

  await notifyDiscord("escape-watcher 폴링 서버가 시작되었습니다.");

  await Promise.all(
    enabledSites.map((cfg) => startSiteLoop(cfg, { browser, store, adapters }))
  );
}

async function main() {
  await startWebServer();   // Render Web Service용
  await startWatcher();     // 폴링 루프(종료되지 않음)
}

main().catch(async (err) => {
  try { await notifyDiscord("escape-watcher 서버에 에러가 발생했습니다."); } catch (_) {}
  console.error("❌ main crashed:", err);
  process.exitCode = 1;
});
