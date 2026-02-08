export function pickNewSlots(slots, store) {
  return slots.filter((s) => !store.wasSeen(s));
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
