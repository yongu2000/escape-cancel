// src/adapters/dpsnnn.adapter.js
function pad2(n) {
  return String(n).padStart(2, "0");
}

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

async function resolveWidgetContext(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  const widgetSel = "#bookingWidget";
  const calendarSel = 'td.rdp-day[data-day] button.rdp-day_button';

  while (Date.now() < deadline) {
    // 후보 컨텍스트: page + 모든 frames
    const contexts = [page, ...page.frames()];

    for (const ctx of contexts) {
      try {
        // 1) bookingWidget 존재 확인
        const wCnt = await ctx.locator(widgetSel).count();
        if (!wCnt) continue;

        // 2) bookingWidget 내부에 달력 버튼이 있는지 확인
        const calCnt = await ctx
          .locator(`${widgetSel} ${calendarSel}`)
          .count();

        if (calCnt > 0) return ctx;
      } catch (_) {
        // ignore
      }
    }

    await page.waitForTimeout(250);
  }

  return null;
}

export const DpsnnnAdapter = {
  siteKey: "dpsnnn",

  async extractAvailableSlots(page, cfg) {
    const { baseUrl, daysAhead, listWaitMs, perDateDelayMs } = cfg.meta;

    const slots = [];
    const today = getSeoulTodayYMD();

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForLoadState("networkidle").catch(() => {});

    const ctx = await resolveWidgetContext(page, listWaitMs);
    if (!ctx) throw new Error("calendar context not found (#bookingWidget td.rdp-day[data-day])");

    // 달력 버튼이 진짜 붙을 때까지 확실히 대기
    await ctx
      .locator('#bookingWidget td.rdp-day[data-day] button.rdp-day_button')
      .first()
      .waitFor({ timeout: listWaitMs });

    for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset++) {
      const date = addDaysYMD(today, dayOffset);
      // console.log(`📅 [DATE] ${date}`);

      try {
        // ✅ 날짜 클릭: bookingWidget 내부 td[data-day="YYYY-MM-DD"]의 버튼
        const dayBtn = ctx.locator(
          `#bookingWidget td.rdp-day[data-day="${date}"] button.rdp-day_button`
        );

        if ((await dayBtn.count()) === 0) {
          // console.log(`⚠️ [SKIP] ${date} (no-button)`);
          continue;
        }

        if (await dayBtn.first().isDisabled()) {
          // console.log(`⚠️ [SKIP] ${date} (disabled)`);
          continue;
        }

        await dayBtn.first().click({ timeout: listWaitMs });

        // 선택된 날짜 표기(예: 2026.02.08)가 바뀌는 영역이 있어요 → 그 텍스트가 현재 date로 바뀔 때까지 조금 대기
        const y = date.slice(0, 4);
        const m = date.slice(5, 7);
        const d = date.slice(8, 10);
        const dotted = `${y}.${m}.${d}`;

        const selectedDateText = ctx.locator(
          `#bookingWidget p:has-text("${dotted}")`
        );
        await selectedDateText.first().waitFor({ timeout: listWaitMs }).catch(() => {});

        // 리스트 렌더 안정화
        await page.waitForTimeout(200);
        const itemAnchorSel = '#bookingWidget [class*="reservationItem_itemNameAnchor"]';
        const badgeSel = '[class*="reservationBadge_badge"]';
        const titleSel = 'p[class*="common_labelLarge"]';
        const btnSel = 'button';

        await ctx
        .locator(itemAnchorSel)
        .first()
        .waitFor({ timeout: listWaitMs, state: "attached" }); // ✅ visible 말고 attached

        // ✅ 2) 아이템 전체를 "카드(anchor)" 단위로 전부 순회
        const anchors = ctx.locator(itemAnchorSel);
        const anchorCount = await anchors.count();

        // console.log(`  📦 [LIST] anchors=${anchorCount}`);

        for (let idx = 0; idx < anchorCount; idx++) {
        const anchor = anchors.nth(idx);

        // 같은 카드(아이템) 범위에서 badge/title/button 찾기
        // anchor가 카드 루트(div)라서 내부에서 찾으면 됨
        const badge = anchor.locator(badgeSel).first();
        const title = anchor.locator(titleSel).first();
        const btn = anchor.locator(btnSel).first();

        const titleText = ((await title.textContent().catch(() => "")) || "").trim();
        if (!titleText) continue;

        const badgeText = ((await badge.textContent().catch(() => "")) || "").trim();

        // "상자 / 10:00", "행복 / 22:20"
        const m2 = titleText.match(/^(.+?)\s*\/\s*(\d{1,2}:\d{2})\s*$/);
        if (!m2) continue;

        const theme = m2[1].trim();
        const time = m2[2];

        let enabled = false;
        try {
            enabled = (await btn.count()) > 0 ? await btn.isEnabled() : false;
        } catch (_) {
            enabled = false;
        }

        // ✅ 예약가능 판정: (1) 뱃지에 "예약가능" 포함 OR (2) 버튼 enabled
        const availableByBadge = badgeText.includes("예약가능");
        const isAvailable = availableByBadge || enabled;

        // console.log(
        //     `  🎫 [ITEM] ${date} ${theme} ${time} / badge=${badgeText || "(empty)"} / btn=${
        //     enabled ? "EN" : "DIS"
        //     }`
        // );

        if (isAvailable) {
            slots.push({
            siteKey: cfg.siteKey,
            date,
            time,
            bookUrl: baseUrl,
            meta: { theme, title: titleText, badge: badgeText, buttonEnabled: enabled },
            });
        }
        }

        if (perDateDelayMs) await page.waitForTimeout(perDateDelayMs);
      } catch (e) {
        // console.log(`⚠️ [SKIP] ${date} (오류)`, e?.message ?? e);
      }
    }

    return slots;
  },
};
