export const sites = [
  {
    siteKey: "rabbithole",
    name: "두껍아 두껍아 헌집줄게 새집다오",
    enabled: true,
    pollIntervalMs: 30000,

    meta: {
      baseUrl: "https://www.rabbitholeescape.co.kr/reservation",
      branch: 1,
      theme: 1,
      daysAhead: 7,          // 오늘 포함 +7일 => 총 8일 (예: 2/8~2/15)
      perDateDelayMs: 400,   // 날짜 바꿔가며 조회할 때 과도한 연타 방지용
      listWaitMs: 6000       // 해당 날짜가 아직 안 열려 리스트가 안 뜨면 타임아웃 후 스킵
    }
  },
  {
  siteKey: "filmByEddy",
  name: "Film By Eddy",
  enabled: true,
  pollIntervalMs: 30000,
    meta: {
    baseUrl: "https://www.keyescape.com/reservation1.php?zizum_num=18&theme_num=57&theme_info_num=34",
    zizumNum: "18",
    themeInfoNum: "34",
    daysAhead: 6,
    perDateDelayMs: 300,
    listWaitMs: 12000
    }
 },
   {
    siteKey: "dpsnnn",
    enabled: true,
    name: "단편선 강남",
    pollIntervalMs: 30000,
    meta: {
      baseUrl: "https://www.dpsnnn.com/reserve_g",

      // 화면상 2/8~2/14 열려있는 것으로 보였음
      daysAhead: 6,

      listWaitMs: 12_000,
      perDateDelayMs: 200,
    },
  }
];
