export async function pickNewSlots(slots, store) {
  const results = [];
  for (const s of slots) {
    if (!(await store.wasSeen(s))) results.push(s);
  }
  return results;
}

export function formatSlotsMessage(siteName, newOnes) {
  const lines = newOnes.map((s) => {
    const theme = s?.meta?.theme ? `${s.meta.theme} / ` : "";
    return `${s.date}: ${theme}${s.time}`;
  });

  const url = newOnes[0]?.bookUrl || "";

  return [
    `🎟️ ${siteName} 예약가능`,
    "",
    ...lines,
    url ? `👉 ${url}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
