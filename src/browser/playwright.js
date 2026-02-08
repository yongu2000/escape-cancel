import { chromium } from "playwright";

export async function createBrowser() {
  return chromium.launch({ headless: true });
}

export async function newPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  return page;
}