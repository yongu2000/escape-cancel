import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ✅ 현재 파일 기준 디렉토리 (__dirname 대체)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ 프로젝트 루트/data/state.json
const STATE_PATH = path.join(__dirname, "..", "..", "data", "state.json");

export class StateStore {
  constructor() {
    this.state = { seen: {} };
  }

  load() {
    if (fs.existsSync(STATE_PATH)) {
      this.state = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    }
  }

  save() {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(
      STATE_PATH,
      JSON.stringify(this.state, null, 2),
      "utf-8"
    );
  }

  slotKey(slot) {
    return `${slot.siteKey}|${slot.theme || ""}|${slot.date}|${slot.time}`;
  }

  wasSeen(slot) {
    const k = this.slotKey(slot);
    return Boolean(
      this.state.seen &&
      this.state.seen[slot.siteKey] &&
      this.state.seen[slot.siteKey][k]
    );
  }

  markSeen(slot) {
    const k = this.slotKey(slot);

    if (!this.state.seen[slot.siteKey]) {
      this.state.seen[slot.siteKey] = {};
    }

    if (!this.state.seen[slot.siteKey][k]) {
      this.state.seen[slot.siteKey][k] = {
        firstSeenAt: Date.now(),
      };
    }
  }

  markNotified(slot) {
    const k = this.slotKey(slot);

    if (!this.state.seen[slot.siteKey]) {
      this.state.seen[slot.siteKey] = {};
    }

    if (!this.state.seen[slot.siteKey][k]) {
      this.state.seen[slot.siteKey][k] = {
        firstSeenAt: Date.now(),
      };
    }

    this.state.seen[slot.siteKey][k].lastNotifiedAt = Date.now();
  }
}
