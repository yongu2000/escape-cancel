function pad2(n) { return String(n).padStart(2, "0"); }

function getSeoulTodayYMD() {
  const seoul = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${seoul.getFullYear()}-${pad2(seoul.getMonth() + 1)}-${pad2(seoul.getDate())}`;
}

function addDaysYMD(ymd, addDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + addDays);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function extractHHMM(text) {
  const m = (text || "").match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : null;
}

export const FilmByEddyAdapter = {
  siteKey: "filmByEddy",

  async extractAvailableSlots(page, cfg) {
    const { baseUrl, daysAhead, perDateDelayMs, listWaitMs } = cfg.meta;
    const today = getSeoulTodayYMD();
    const slots = [];

    // ✅ devtools-detector 스크립트 차단 (가장 중요)
    await page.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.includes("devtools-detector")) return route.abort();
      return route.continue();
    });

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // 혹시 남아있는 블랙스크린(이미 주입됐을 때)을 대비해 제거 시도
    await page.evaluate(() => {
      const blockers = Array.from(document.querySelectorAll("div"))
        .filter(el => (el.textContent || "").includes("개발자 도구 사용이 금지"));
      for (const b of blockers) b.remove();
    });

    // ✅ 이 페이지는 URL 파라미터로 이미 지점/테마 선택된 상태라
    //    굳이 #zizum/#theme 기다릴 필요 없음 (있어도 상관 없지만, 없어도 됨)

    // 달력 붙을 때까지
    await page.waitForSelector(".reservationPick .selDate", {
      timeout: listWaitMs,
      state: "attached",
    });

    for (let i = 0; i <= daysAhead; i++) {
      const date = addDaysYMD(today, i);

      try {
        // console.log(`📅 [DATE] ${date}`);

        // timepicker 화면이면 back 눌러서 datepicker로 복귀
        const hasSelDate = await page.$(".reservationPick .selDate");
        if (!hasSelDate) {
          const backBtn = await page.$("#back_btn");
          if (backBtn) {
            await backBtn.click();
            await page.waitForSelector(".reservationPick .selDate", { timeout: listWaitMs, state: "attached" });
          }
        }

        // available 날짜만 클릭
        const clicked = await page.evaluate((d) => {
          const el = document.querySelector(`.reservationPick .selDate.available[data-date="${d}"]`);
          if (!el) return false;
          el.click();
          return true;
        }, date);

        if (!clicked) {
          // console.log(`⚠️ [SKIP] ${date} (available 아님)`);
          continue;
        }

        // timeList 붙을 때까지
        await page.waitForSelector(".reservationPick ul.timeList li", {
          timeout: listWaitMs,
          state: "attached",
        });

        // 예약가능 시간: disabled 없는 input
        const timesRaw = await page.evaluate(() => {
          return Array.from(
            document.querySelectorAll('.reservationPick ul.timeList li input.selThemeTimeNum:not([disabled]) + span')
          ).map(el => (el.textContent || "").trim());
        });

        const times = Array.from(
          new Set(timesRaw.map(extractHHMM).filter(Boolean))
        );

        // console.log(`  ⏰ [TIMES] ${date} available=${times.length}`, times);

        for (const time of times) {
          slots.push({
            siteKey: cfg.siteKey,
            date,
            time,
            bookUrl: baseUrl,
            meta: { source: "keyescape" },
          });
        }

        // 다음 날짜 위해 달력으로 복귀
        const backBtn = await page.$("#back_btn");
        if (backBtn) {
          await backBtn.click();
          await page.waitForSelector(".reservationPick .selDate", { timeout: listWaitMs, state: "attached" });
        }

        if (perDateDelayMs) await sleep(perDateDelayMs);
      } catch (e) {
        // console.log(`⚠️ [SKIP] ${date} (오류)`, e?.message ?? e);
      }
    }

    return slots;
  },
};
