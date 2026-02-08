import pg from "pg";

const { Pool } = pg;

export class StateStore {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is missing");

    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }, // Render 내부망이어도 ssl 요구되는 케이스 대비
    });
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS seen_slots (
        site_key TEXT NOT NULL,
        slot_key TEXT NOT NULL,
        first_seen_at BIGINT NOT NULL,
        last_notified_at BIGINT,
        PRIMARY KEY (site_key, slot_key)
      );
    `);
  }

  slotKey(slot) {
    return `${slot.siteKey}|${slot.theme || ""}|${slot.date}|${slot.time}`;
  }

  async wasSeen(slot) {
    const siteKey = slot.siteKey;
    const slotKey = this.slotKey(slot);

    const res = await this.pool.query(
      `SELECT 1 FROM seen_slots WHERE site_key=$1 AND slot_key=$2 LIMIT 1`,
      [siteKey, slotKey]
    );
    return res.rowCount > 0;
  }

  async markSeen(slot) {
    const siteKey = slot.siteKey;
    const slotKey = this.slotKey(slot);
    const now = Date.now();

    // 이미 있으면 유지, 없으면 insert
    await this.pool.query(
      `
      INSERT INTO seen_slots (site_key, slot_key, first_seen_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (site_key, slot_key) DO NOTHING
      `,
      [siteKey, slotKey, now]
    );
  }

  async markNotified(slot) {
    const siteKey = slot.siteKey;
    const slotKey = this.slotKey(slot);
    const now = Date.now();

    // 없으면 생성 + last_notified_at 세팅
    await this.pool.query(
      `
      INSERT INTO seen_slots (site_key, slot_key, first_seen_at, last_notified_at)
      VALUES ($1, $2, $3, $3)
      ON CONFLICT (site_key, slot_key)
      DO UPDATE SET last_notified_at = EXCLUDED.last_notified_at
      `,
      [siteKey, slotKey, now]
    );
  }
}
