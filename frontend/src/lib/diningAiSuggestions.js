import { isRainyWmoCode } from "./openMeteoWeather";

/**
 * @typedef {{ id: string, labelVi: string, description: string, priceVnd: number, category?: string }} PairingOption
 * @typedef {{ id: string, name: string, pairingOptions?: PairingOption[] }} MenuDish
 */

function normTags(tags) {
  return (tags || []).map((t) => String(t).toLowerCase().trim()).filter(Boolean);
}

function hasTag(tagsLower, ...needles) {
  const arr = [...tagsLower];
  for (const n of needles) {
    for (const t of arr) {
      if (t === n || t.includes(n)) return true;
    }
  }
  return false;
}

function folioCategories(folioLines) {
  const cats = new Set();
  for (const row of folioLines || []) {
    if (row?.category) cats.add(String(row.category).toLowerCase());
  }
  return cats;
}

/**
 * Chọn món “neo” để gợi ý add-on (rule đơn giản, có giải thích).
 */
export function pickAnchorDishId(menu, { hour, weather } = {}) {
  const h = typeof hour === "number" ? hour : new Date().getHours();
  const code = weather?.weatherCode;
  const rainy = weather && (isRainyWmoCode(code) || (weather.precipitationMm ?? 0) > 0.5);
  if (rainy && menu.some((d) => d.id === "pho")) return "pho";
  if ((h >= 22 || h < 6) && menu.some((d) => d.id === "pho")) return "pho";
  return menu[0]?.id || "burger";
}

/**
 * Chọn add-on trong danh sách pairing của món + quy tắc toàn cục.
 */
function pickPairingOption(dish, ctx) {
  const opts = dish?.pairingOptions || [];
  if (!opts.length) return null;

  const { tagsLower, tempC, isRainy, folioCats } = ctx;

  const score = (opt) => {
    let s = 0;
    const id = opt.id || "";

    if (id === "fries" && hasTag(tagsLower, "family", "kid")) s += 4;
    if (id === "kids_juice" && hasTag(tagsLower, "family", "kid")) s += 5;
    if (id === "sparkling_split" && hasTag(tagsLower, "anniversary", "honeymoon", "romance")) s += 6;
    if (id === "iced_lemongrass" && tempC >= 30) s += 5;
    if (id === "iced_lemongrass" && tempC >= 28) s += 2;
    if ((id === "extra_broth" || id === "soft_egg") && isRainy) s += 3;
    if (id === "affogato" && hasTag(tagsLower, "anniversary", "honeymoon")) s += 2;
    if (id === "fries" && dish.id === "burger") s += 2;
    if (folioCats.has("dining") && id !== "fries") s += 1;
    return s;
  };

  let best = opts[0];
  let bestScore = score(best);
  for (const opt of opts.slice(1)) {
    const sc = score(opt);
    if (sc > bestScore) {
      best = opt;
      bestScore = sc;
    }
  }
  return best;
}

/**
 * @param {MenuDish[]} menu
 * @param {string} anchorDishId
 * @param {{ tags?: string[], weather?: object|null, folioLines?: object[] }} ctx
 */
export function buildDiningAiSuggestion(menu, anchorDishId, ctx = {}) {
  const dish = menu.find((d) => d.id === anchorDishId) || menu[0];
  const tagsLower = normTags(ctx.tags);
  const hour = ctx.hour ?? new Date().getHours();
  const w = ctx.weather;
  const tempC = w?.temperatureC ?? 28;
  const code = w?.weatherCode;
  const isRainy = !!(w && (isRainyWmoCode(code) || (w.precipitationMm ?? 0) > 0.5));
  const folioCats = folioCategories(ctx.folioLines);

  const pairing = pickPairingOption(dish, { tagsLower, tempC, isRainy, folioCats });

  const reasons = [];
  if (isRainy) reasons.push("trời mưa / ẩm");
  if (tempC >= 30) reasons.push("nhiệt độ cao");
  if (hour >= 22 || hour < 6) reasons.push("khung giờ đêm");
  if (hasTag(tagsLower, "family", "kid")) reasons.push("hồ sơ gia đình");
  if (hasTag(tagsLower, "anniversary", "honeymoon", "romance")) reasons.push("dịp kỷ niệm");
  if (folioCats.has("spa")) reasons.push("bạn đã dùng spa gần đây");
  if (folioCats.has("dining")) reasons.push("đã có món in-room trước đó");

  let headline = "";
  if (pairing) {
    headline = `Với «${dish.name}», gợi ý thêm «${pairing.labelVi}» (${pairing.description}).`;
  } else {
    headline = `Khám phá thêm món kèm phù hợp với «${dish.name}».`;
  }

  if (reasons.length) {
    headline += ` Gợi ý dựa trên: ${reasons.slice(0, 3).join(", ")}.`;
  } else {
    headline += " Gợi ý dựa trên lựa chọn phổ biến của khách tại khách sạn.";
  }

  return {
    dishId: dish.id,
    dishName: dish.name,
    headline,
    contextPills: reasons.slice(0, 4),
    addOn: pairing
      ? {
          id: pairing.id,
          labelVi: pairing.labelVi,
          description: pairing.description,
          priceVnd: pairing.priceVnd,
          category: pairing.category || "dining",
        }
      : null,
  };
}
