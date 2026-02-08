function pad2(n) {
  return String(n).padStart(2, "0");
}

// Asia/Seoul 기준 “오늘” 날짜 문자열(YYYY-MM-DD)
function getSeoulTodayYMD() {
  const seoul = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${seoul.getFullYear()}-${pad2(seoul.getMonth() + 1)}-${pad2(seoul.getDate())}`;
}

function addDaysYMD(ymd, addDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); // UTC 기준으로 계산(일자만)
  dt.setUTCDate(dt.getUTCDate() + addDays);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function buildUrl(baseUrl, branch, theme, date) {
  const u = new URL(baseUrl);
  u.searchParams.set("branch", String(branch));
  u.searchParams.set("theme", String(theme));
  u.searchParams.set("date", date);
  // 원래 링크가 #list라서 그대로 유지
  return `${u.toString()}#list`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeInnerTextByXPath(page, xpath) {
  try {
    const el = await page.$(`xpath=${xpath}`);
    if (!el) return null;
    const txt = (await el.innerText()).trim();
    return txt.length ? txt : null;
  } catch {
    return null;
  }
}

export const RabbitHoleAdapter = {
  siteKey: "rabbithole",

  async extractAvailableSlots(page, cfg) {
    const { baseUrl, branch, theme, daysAhead, perDateDelayMs, listWaitMs } = cfg.meta;

    const slots = [];
    const today = getSeoulTodayYMD();

    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
      const date = addDaysYMD(today, dayOffset);
      const url = buildUrl(baseUrl, branch, theme, date);
      // console.log(`📅 [DATE] ${date} 접속 시도`);

      try {
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // ✅ 날짜가 아직 안 열려서 리스트가 안 뜰 수 있으니 “짧게 기다리고” 없으면 스킵
        // list 컨테이너가 렌더되는지 확인 (필요하면 셀렉터 바꿔도 됨)
        await page.waitForSelector("#list", { timeout: listWaitMs });

        // 슬롯은 li[1]~li[8] (추후 자동화 가능)
        for (let i = 1; i <= 8; i++) {
          const labelXPath =
            `//*[@id="list"]/div[2]/section/div/div/ul/li[${i}]/div/button/label`;
          const timeXPath =
            `//*[@id="list"]/div[2]/section/div/div/ul/li[${i}]/div/button/span`;

          const labelText = await safeInnerTextByXPath(page, labelXPath);
          const timeText = await safeInnerTextByXPath(page, timeXPath);
          if (!timeText) continue;

          // console.log(`[${date}] ${timeText} label=`, labelText);

          // ✅ 규칙: label이 "예약불가"면 제외, 아니거나 null이면 가능으로 판단
          if (labelText !== "예약불가") {
            // console.log(`✅ AVAILABLE -> ${date} ${timeText}`);
            slots.push({
              siteKey: cfg.siteKey,
              date,
              time: timeText,
              theme: `theme=${theme}`,
              bookUrl: url,
              meta: { labelText }
            });
          }
        }
      } catch {
        // ✅ 예: 2/15는 23시에 열려서 아직 페이지 구조가 다르거나 리스트가 없을 수 있음
        // 그런 경우는 “그 날짜는 그냥 무시(스킵)”하고 다음 날짜로 진행
          // console.log(`⚠️ [SKIP] ${date} (아직 오픈 전이거나 구조 없음)`);
      }

      if (perDateDelayMs) await sleep(perDateDelayMs);
    }

    return slots;
  }
};
