/**
 * services/petHealthPlan.js
 *
 * 健康模块「静态知识库 + 状态派生」——纯常量 + 纯函数，无 Supabase 依赖。
 *  - 疫苗方案：每种宠物的核心疫苗清单 + 进度分母（总针数）
 *  - 地区虫害：城市 → 高发虫害映射
 *  - 状态派生：根据日期算「已完成 / 即将到期 / 待补」
 *
 * 注意：疫苗/驱虫的真实记录存在 Supabase（pet_vaccine_records / pet_deworm_records），
 * 本文件只放「不进数据库」的方案常量与计算逻辑。
 */

/* ── 宠物大类（只分狗 / 猫） ───────────────────────────── */
export function petKind(petType) {
  return petType === "cat" ? "cat" : "dog";
}

/* ── 疫苗方案 ─────────────────────────────────────────── */
export const VACCINE_PLANS = {
  dog: {
    core: {
      title: "犬核心疫苗",
      sectionTitle: "犬核心疫苗",
      sectionNote: "建议接种",
      subText: "犬瘟 / 细小 / 腺病毒",
      shortName: "犬核心",
      totalDoses: 4, // 进度分母（设计图 2/4）
      vaccines: [
        { code: "CDV", name: "犬瘟（CDV）" },
        { code: "CPV", name: "犬细小（CPV）" },
        { code: "CAV", name: "犬腺病毒（CAV）" },
      ],
    },
    rabies: {
      sectionTitle: "狂犬疫苗",
      sectionNote: "法定要求",
      code: "RABIES",
      name: "狂犬疫苗",
      hint: "",
    },
  },
  cat: {
    core: {
      title: "猫核心疫苗",
      sectionTitle: "猫三联",
      sectionNote: "核心疫苗",
      subText: "猫瘟 / 猫鼻支 / 猫杯状",
      shortName: "猫三联",
      totalDoses: 3, // 进度分母（设计图 2/3）
      vaccines: [
        { code: "FPV", name: "猫瘟（FPV）" },
        { code: "FHV", name: "猫鼻支（FHV-1）" },
        { code: "FCV", name: "猫杯状（FCV）" },
      ],
    },
    rabies: {
      sectionTitle: "狂犬疫苗",
      sectionNote: "建议接种",
      code: "RABIES",
      name: "狂犬疫苗",
      hint: "建议满3月龄后接种",
    },
  },
};

export function vaccinePlan(petType) {
  return VACCINE_PLANS[petKind(petType)];
}

/* ── 地区虫害知识库 ───────────────────────────────────── */
export const REGION_PESTS = {
  default: { dog: ["蜱虫", "跳蚤", "心丝虫"], cat: ["跳蚤", "耳螨", "真菌高发"] },
  // 后续可按城市扩展，例如：
  // "上海": { dog: [...], cat: [...] },
};

export function regionRisk(city, petType) {
  const kind = petKind(petType);
  const area = city || "上海·浦东";
  const map = REGION_PESTS[city] || REGION_PESTS.default;
  return { area, risks: map[kind] || REGION_PESTS.default[kind] };
}

/* ── 状态派生 ─────────────────────────────────────────── */
export const VAX_STATUS = {
  done:     { key: "done",     label: "已完成",   tone: "green"  },
  due_soon: { key: "due_soon", label: "即将到期", tone: "orange" },
  pending:  { key: "pending",  label: "待补",     tone: "orange" },
};

const DAY = 86400000;

/** 距今天的天数（正数=未来，负数=已过）；无日期返回 null */
export function daysFromToday(dateStr) {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00");
  if (isNaN(d)) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / DAY);
}

/**
 * 单个疫苗 code 的状态——传该 code 的全部接种记录数组。
 *  - 无记录              → 待补
 *  - 有记录但无下次安排  → 已完成
 *  - 下次日期已过        → 待补（逾期）
 *  - 下次日期 30 天内    → 即将到期
 *  - 其余                → 已完成
 */
export function vaccineStatus(recs) {
  if (!recs || recs.length === 0) return VAX_STATUS.pending;
  const nexts = recs.map((r) => r.next_due_date).filter(Boolean).sort();
  const lastNext = nexts[nexts.length - 1];
  if (!lastNext) return VAX_STATUS.done;
  const d = daysFromToday(lastNext);
  if (d == null) return VAX_STATUS.done;
  if (d < 0)  return VAX_STATUS.pending;
  if (d <= 30) return VAX_STATUS.due_soon;
  return VAX_STATUS.done;
}

/** 驱虫单条记录的状态（按 next_due_date 判定） */
export function dewormStatus(rec) {
  if (!rec) return VAX_STATUS.pending;
  const d = daysFromToday(rec.next_due_date);
  if (d == null) return VAX_STATUS.done;
  if (d < 0)  return VAX_STATUS.pending;
  if (d <= 14) return VAX_STATUS.due_soon;
  return VAX_STATUS.done;
}
