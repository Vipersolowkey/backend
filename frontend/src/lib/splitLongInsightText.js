/**
 * Turn long model summaries into list / paragraphs / labeled sections for readable UI.
 * Handles newlines, " - " / " – " clause separators, "Tiêu đề:" section markers, and sentence chunking.
 */

/** Split before known report-style headings (VN + EN). */
const SECTION_SPLIT_RE =
  /\s+(?=(?:Chất lượng dịch vụ|Điểm yếu của đối thủ|Cơ hội thị trường|Giá cả|Chất lượng|Điểm yếu|Cơ hội|Tóm tắt|Khuyến nghị|Kết luận|Ưu điểm|Nhược điểm|Thị trường|Phân tích|Đánh giá|Dịch vụ|Đối thủ|Xu hướng|Tiềm năng|Rủi ro|Cảnh báo|Nhận định|Service quality|Price|Weakness|Opportunity|Market|Summary|Recommendation)[^:\n]{0,58}:\s*)/i;

function parseSectionChunk(chunk) {
  const trimmed = chunk.trim();
  const m = trimmed.match(/^([^:\n]{2,62}):\s+([\s\S]+)$/);
  if (m) {
    return { title: m[1].trim(), body: m[2].trim() };
  }
  return { title: null, body: trimmed };
}

/**
 * @returns {{ title: string | null, body: string }[] | null}
 */
function tryLabeledSections(singleLine) {
  if (!singleLine || singleLine.length < 100) return null;
  const chunks = singleLine.split(SECTION_SPLIT_RE).map((s) => s.trim()).filter(Boolean);
  if (chunks.length < 2) return null;
  const items = chunks.map(parseSectionChunk);
  const titled = items.filter((s) => s.title).length;
  if (titled < 2) return null;
  return items;
}

function dashBulletCandidates(singleLine) {
  return singleLine.split(/\s[-–]\s/).map((s) => s.trim()).filter(Boolean);
}

export function splitLongInsightText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return { kind: "empty", items: [] };

  if (/\r?\n/.test(raw)) {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const bulletPrefix = /^[-•*]\s+/;
    const bulletLike = lines.filter((l) => bulletPrefix.test(l)).length;
    if (lines.length >= 2 && bulletLike >= lines.length * 0.6) {
      return {
        kind: "bullets",
        items: lines.map((l) => l.replace(bulletPrefix, "").trim()).filter(Boolean),
      };
    }
    return { kind: "paragraphs", items: lines };
  }

  const singleLine = raw.replace(/\s+/g, " ").trim();

  const labeled = tryLabeledSections(singleLine);
  if (labeled) {
    return { kind: "sections", items: labeled };
  }

  const dashParts = dashBulletCandidates(singleLine);
  const dashOkStrict =
    dashParts.length >= 3 &&
    dashParts.length <= 16 &&
    dashParts.every((p) => p.length >= 12 && p.length <= 420);
  const dashOkLoose =
    singleLine.length > 220 &&
    dashParts.length >= 3 &&
    dashParts.length <= 20 &&
    dashParts.every((p) => p.length >= 8 && p.length <= 520);
  if (dashOkStrict || dashOkLoose) {
    return { kind: "bullets", items: dashParts };
  }

  const semiParts = singleLine.split(/\s*;\s+/).map((s) => s.trim()).filter(Boolean);
  const semiOk =
    semiParts.length >= 3 &&
    semiParts.length <= 18 &&
    semiParts.every((p) => p.length >= 14 && p.length <= 450);
  if (semiOk) {
    return { kind: "bullets", items: semiParts };
  }

  const sentences = singleLine.split(/(?<=[.!?…])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length >= 5) {
    const chunkSize = sentences.length > 14 ? 2 : 3;
    const chunks = [];
    for (let i = 0; i < sentences.length; i += chunkSize) {
      chunks.push(sentences.slice(i, i + chunkSize).join(" "));
    }
    return { kind: "paragraphs", items: chunks };
  }

  if (sentences.length >= 2) {
    return { kind: "paragraphs", items: sentences };
  }

  return { kind: "plain", items: [singleLine] };
}
