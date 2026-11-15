/**
 * CLI utility to pre-slice an exam MP3 per Listening question/group using ffmpeg
 * (removing opening Directions headers and extracting Part 3/4 question cue offsets)
 * and extract real per-page & per-question/per-group JPEG images from exam PDFs using PyMuPDF + OCR.
 *
 * Usage:
 *   node scripts/slice-exam-media.mjs --exam ets-2023-test-04 --audio path/to/Test04.mp3 --lc-pdf path/to/Test04.pdf [--ocr path/to/ocr.json]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectPartDirectionsEndOffset, parseFfmpegSilenceLog } from '../src/client/exam-audio-core.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--') && i + 1 < argv.length) {
      out[a.slice(2)] = argv[++i];
    }
  }
  return out;
}

function probeDurationSec(audioPath) {
  const out = execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audioPath
  ], { encoding: 'utf8' });
  return Number(out.trim()) || 0;
}

function detectSilenceWithFfmpeg(audioPath, noiseDb = '-35dB', minSec = '1.5', windowArgs = []) {
  const res = spawnSync('ffmpeg', [
    ...windowArgs,
    '-i', audioPath,
    '-af', `silencedetect=noise=${noiseDb}:d=${minSec}`,
    '-f', 'null',
    '-'
  ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return `${res.stderr || ''}\n${res.stdout || ''}`;
}

function buildWindowsOcrForPages(pagesDir, outJsonPath) {
  const psScript = path.join(root, 'scripts', 'ocr-windows.ps1');
  const res = spawnSync('powershell', [
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', psScript,
    '-Directory', pagesDir,
    '-Pattern', 'page-*.jpg',
    '-Json',
    '-OutJson', outJsonPath
  ], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Windows OCR failed: ${res.stderr || res.stdout}`);
  }
}

const PY_RENDER_SCRIPT = `
import fitz, json, os, re, sys

cfg = json.loads(sys.stdin.read())
doc = fitz.open(cfg["pdfPath"])
pages_dir = cfg["pagesDir"]
images_dir = cfg["imagesDir"]
start_page = max(1, int(cfg.get("startPage", 1)))
end_page = min(len(doc), int(cfg.get("endPage", len(doc))))

os.makedirs(pages_dir, exist_ok=True)
os.makedirs(images_dir, exist_ok=True)

rendered_pages = []
for p in range(start_page, end_page + 1):
    page = doc[p - 1]
    rect = page.rect
    clip = fitz.Rect(0, 0, rect.width, rect.height * 0.94)
    pix = page.get_pixmap(dpi=135, clip=clip)
    fn = f"page-{p:03d}.jpg"
    pix.save(os.path.join(pages_dir, fn), jpg_quality=84)
    rendered_pages.append(p)

ocr_raw = cfg.get("ocrData")
if not ocr_raw and cfg.get("ocrJsonPath") and os.path.exists(cfg["ocrJsonPath"]):
    with open(cfg["ocrJsonPath"], "r", encoding="utf-8-sig") as f:
        ocr_raw = json.load(f)

ocr_by_page = {}
if isinstance(ocr_raw, list):
    for idx, entry in enumerate(ocr_raw):
        fn = entry.get("file", "")
        m = re.search(r"(\\d+)", fn)
        pno = int(m.group(1)) if m else (start_page + idx)
        if pno < 1 or pno > len(doc):
            continue
        W = max(1, int(entry.get("width", 1)))
        H = max(1, int(entry.get("height", 1)))
        pr = doc[pno - 1].rect
        # Detect whether OCR ran on already-cropped (0.94 height) page-*.jpg or full PDF page
        y_scale = 0.94 if ((H / W) / (pr.height / pr.width) < 0.97) else 1.0
        words = []
        for w in entry.get("words", []):
            words.append({
                "t": w.get("t", ""),
                "x0": w.get("x", 0) / W,
                "y0": (w.get("y", 0) / H) * y_scale,
                "x1": (w.get("x", 0) + w.get("w", 0)) / W,
                "y1": ((w.get("y", 0) + w.get("h", 0)) / H) * y_scale,
            })
        ocr_by_page[pno] = words

gray_cache = {}
def get_gray(pno, dpi=160):
    if pno not in gray_cache:
        pix = doc[pno - 1].get_pixmap(dpi=dpi, colorspace=fitz.csGRAY)
        gray_cache[pno] = (pix.width, pix.height, pix.samples, doc[pno - 1].rect)
    return gray_cache[pno]

def row_dark_counts(samples, W, H, x0_px, x1_px, y0_px, y1_px, thresh=185):
    x0_px = max(0, min(W - 1, x0_px))
    x1_px = max(x0_px + 1, min(W, x1_px))
    y0_px = max(0, min(H - 1, y0_px))
    y1_px = max(y0_px + 1, min(H, y1_px))
    counts = []
    for y in range(y0_px, y1_px):
        row = samples[y * W + x0_px : y * W + x1_px]
        counts.append(sum(1 for b in row if b < thresh))
    return counts

def col_dark_counts(samples, W, H, x0_px, x1_px, y0_px, y1_px, thresh=185):
    x0_px = max(0, min(W - 1, x0_px))
    x1_px = max(x0_px + 1, min(W, x1_px))
    y0_px = max(0, min(H - 1, y0_px))
    y1_px = max(y0_px + 1, min(H, y1_px))
    counts = [0] * (x1_px - x0_px)
    for y in range(y0_px, y1_px):
        base = y * W + x0_px
        row = samples[base : base + (x1_px - x0_px)]
        for i, b in enumerate(row):
            if b < thresh:
                counts[i] += 1
    return counts

def expand_x_around_words(samples, W, H, y0f, y1f, words_in_box, limit_x0f, limit_x1f, thresh=185):
    y0_px = max(0, int(y0f * H))
    y1_px = min(H, int(y1f * H))
    lx0 = max(0, int(limit_x0f * W))
    lx1 = min(W, int(limit_x1f * W))
    cc = col_dark_counts(samples, W, H, lx0, lx1, y0_px, y1_px, thresh)
    if not words_in_box:
        nz = [i for i, c in enumerate(cc) if c >= 2]
        if not nz:
            return limit_x0f, limit_x1f
        return max(limit_x0f, (lx0 + nz[0]) / W - 0.01), min(limit_x1f, (lx0 + nz[-1] + 1) / W + 0.01)

    w_min_px = int(min(w["x0"] for w in words_in_box) * W) - lx0
    w_max_px = int(max(w["x1"] for w in words_in_box) * W) - lx0
    seed_l = max(0, min(len(cc) - 1, w_min_px))
    seed_r = max(seed_l, min(len(cc) - 1, w_max_px))
    # Bridge small horizontal gutters (up to 3.2% width) to include borders/tables,
    # while stopping before separated outer rotated TEST margin tabs (> 3.2% white gap).
    max_gap = max(12, int(0.032 * W))
    left = seed_l
    gap = 0
    for i in range(seed_l, -1, -1):
        if cc[i] >= 2:
            left = i
            gap = 0
        else:
            gap += 1
            if gap > max_gap:
                break
    right = seed_r
    gap = 0
    for i in range(seed_r, len(cc)):
        if cc[i] >= 2:
            right = i
            gap = 0
        else:
            gap += 1
            if gap > max_gap:
                break
    # Also ensure every OCR word inside box is covered
    left = min(left, seed_l)
    right = max(right, seed_r)
    pad = max(10, int(0.012 * W))
    return max(limit_x0f, (lx0 + left - pad) / W), min(limit_x1f, (lx0 + right + pad) / W)

def trim_y_ink(samples, W, H, x0f, x1f, y0f, y1f, words_in_box=None, thresh=185, pad_top=0.008, pad_bot=0.010):
    y0_px = max(0, int(y0f * H))
    y1_px = min(H, int(y1f * H))
    x0_px = max(0, int(x0f * W))
    x1_px = min(W, int(x1f * W))
    rc = row_dark_counts(samples, W, H, x0_px, x1_px, y0_px, y1_px, thresh)
    nz = [i for i, c in enumerate(rc) if c >= 2]
    t = (y0_px + nz[0]) / H if nz else y0f
    b = (y0_px + nz[-1] + 1) / H if nz else y1f
    if words_in_box:
        t = min(t, min(w["y0"] for w in words_in_box))
        b = max(b, max(w["y1"] for w in words_in_box))
    return max(y0f, t - pad_top), min(y1f, b + pad_bot)

def find_directions_bottom(pno, samples, W, H, words):
    dir_hits = [w for w in words if w["y0"] < 0.36 and "Directions" in w["t"]]
    if not dir_hits:
        return None
    dir_top = min(w["y0"] for w in dir_hits)
    # Locate the first real question anchor or "Questions X-Y" header below Directions
    q_headers = [w["y0"] for w in words if w["y0"] > dir_top + 0.02 and w["t"].lower().startswith("questions")]
    q_nums = [
        w["y0"] for w in words
        if w["y0"] > dir_top + 0.03
        and (w["x0"] < 0.16 or 0.44 <= w["x0"] <= 0.60)
        and re.match(r"^(\\d{1,3})[.,:;)]?$", w["t"].strip())
        and 32 <= int(re.match(r"^(\\d+)", w["t"]).group(1)) <= 200
    ]
    next_content_candidates = q_headers + q_nums
    # Never let Part 6 blank numbers far inside a passage set max_search_y beyond 0.44
    max_search_y = min(dir_top + 0.16, (min(next_content_candidates) - 0.008) if next_content_candidates else (dir_top + 0.16))
    y_scan0 = max(0, int((dir_top + 0.03) * H))
    y_scan1 = min(H, int(max_search_y * H))
    if y_scan1 > y_scan0:
        rc = row_dark_counts(samples, W, H, int(0.10 * W), int(0.90 * W), y_scan0, y_scan1, 185)
        wide_rows = [i for i, c in enumerate(rc) if c >= 0.48 * W]
        if wide_rows:
            return (y_scan0 + wide_rows[-1]) / H + 0.011
    return max_search_y - 0.002

def find_question_anchor(words, qnum, min_y=0.02, max_y=0.92):
    hits = []
    for w in words:
        if w["y0"] < min_y or w["y0"] > max_y:
            continue
        if not (w["x0"] < 0.16 or 0.44 <= w["x0"] <= 0.60):
            continue
        tx = w["t"].strip()
        if re.match(rf"^{qnum}[.,:;)]?$", tx):
            score = 0 if tx.endswith(".") else 1
            hits.append((score, w["y0"], w))
    if not hits:
        return None
    hits.sort(key=lambda item: (item[0], item[1]))
    return hits[0][2]

def find_questions_header(words, sq):
    for i, w in enumerate(words):
        if w["t"].lower().startswith("question") and i + 1 < len(words):
            nxt = words[i + 1]["t"]
            if re.search(rf"\\b{sq}\\b", nxt):
                return w
    return None

def compute_col_split(pno, words, samples, W, H, min_y, max_y):
    # Right column question numbers or graphic words define right col lower bound
    rc_anchors = [w["x0"] for w in words if w["y0"] >= min_y and w["y0"] <= max_y and 0.44 <= w["x0"] <= 0.60 and re.match(r"^(\\d{1,3})[.,:;)]?$", w["t"].strip())]
    rc_min_x = min(rc_anchors) if rc_anchors else 0.50
    lc_words_right = [w["x1"] for w in words if w["y0"] >= min_y and w["y0"] <= max_y and w["x1"] < rc_min_x - 0.005]
    lc_max_x = max(lc_words_right) if lc_words_right else 0.45
    search_x0 = max(int(0.41 * W), int(lc_max_x * W) + 2)
    search_x1 = min(int(0.56 * W), int(rc_min_x * W) - 2)
    if search_x1 <= search_x0:
        return (lc_max_x + rc_min_x) / 2
    cc = col_dark_counts(samples, W, H, search_x0, search_x1, int(min_y * H), int(max_y * H), 180)
    min_c = min(cc)
    best_indices = [i for i, c in enumerate(cc) if c == min_c]
    mid_idx = best_indices[len(best_indices) // 2]
    return (search_x0 + mid_idx) / W

def detect_horizontal_dividers(samples, W, H, x0f, x1f, y0f, y1f, words=None):
    x0_px = int((x0f + 0.02 * (x1f - x0f)) * W)
    x1_px = int((x1f - 0.02 * (x1f - x0f)) * W)
    y0_px = max(0, int(y0f * H))
    y1_px = min(H, int(y1f * H))
    span_w = max(1, x1_px - x0_px)
    rc = row_dark_counts(samples, W, H, x0_px, x1_px, y0_px, y1_px, 180)
    lines = []
    i = 0
    while i < len(rc):
        # Solid rule lines span >= 62% of the column width without tall text rows
        if rc[i] >= 0.62 * span_w:
            j = i
            while j < len(rc) and rc[j] >= 0.35 * span_w:
                j += 1
            if (j - i) <= 6:
                yf = (y0_px + (i + j) / 2) / H
                has_word = False
                if words:
                    has_word = any(x0f <= w["x0"] and w["x1"] <= x1f and w["y0"] - 0.002 <= yf <= w["y1"] + 0.002 for w in words)
                if not has_word:
                    lines.append(yf)
            i = j
        else:
            i += 1
    return lines

group_images = {}
all_groups = cfg.get("groups", [])

# Index groups by page for column layout Parts (3, 4, 5)
by_page_col_groups = {}
for grp in all_groups:
    part = int(grp["part"])
    pages = [int(x) for x in (grp.get("pages") or ([grp.get("sourcePage")] if grp.get("sourcePage") else [])) if x and 1 <= int(x) <= len(doc)]
    grp["_pages"] = pages

    if part == 1 and grp.get("pdfCrop") in ("top", "bottom") and pages:
        pno = pages[0]
        r = doc[pno - 1].rect
        if grp["pdfCrop"] == "top":
            clip = fitz.Rect(r.width * 0.10, r.height * 0.042, r.width * 0.87, r.height * 0.505)
        else:
            clip = fitz.Rect(r.width * 0.10, r.height * 0.515, r.width * 0.87, r.height * 0.925)
        pix = doc[pno - 1].get_pixmap(dpi=160, clip=clip)
        fn = f"{grp['id']}.jpg"
        pix.save(os.path.join(images_dir, fn), jpg_quality=86)
        group_images[grp["id"]] = {"file": fn, "cropped": True, "caption": grp.get("caption") or f"Part 1 · Câu {grp.get('startQ')}"}
    elif part in (3, 4, 5) and pages:
        by_page_col_groups.setdefault(pages[0], []).append(grp)

# Crop 2-column Part 3, 4, 5 pages per item cleanly
for pno, p_groups in sorted(by_page_col_groups.items()):
    words = ocr_by_page.get(pno, [])
    W, H, samples, rect = get_gray(pno, dpi=160)
    dir_bot = find_directions_bottom(pno, samples, W, H, words)
    min_y = dir_bot if dir_bot else 0.038
    max_y = 0.922
    # Exclude "This is the end of the Listening test" footer on Part 4 last page
    end_listen = [w["y0"] for w in words if w["y0"] > 0.72 and w["t"] == "Listening"]
    if end_listen and any(w["t"] == "end" for w in words if abs(w["y0"] - end_listen[0]) < 0.02):
        max_y = min(max_y, end_listen[0] - 0.012)

    p_groups.sort(key=lambda g: int(g["startQ"]))
    # Locate every group's startQ anchor
    anchors = {}
    for g in p_groups:
        anc = find_question_anchor(words, int(g["startQ"]), min_y=min_y - 0.03, max_y=max_y)
        if anc:
            anchors[g["id"]] = anc

    # Split into col 0 and col 1
    split_x = compute_col_split(pno, words, samples, W, H, min_y, max_y)
    # Infer column for any missing anchor (e.g., Part 5 Q114) by monotonicity against neighbors
    cols = {0: [], 1: []}
    last_col = 0
    for idx, g in enumerate(p_groups):
        anc = anchors.get(g["id"])
        if anc:
            c = 0 if anc["x0"] < split_x else 1
            last_col = c
        else:
            # Look ahead to see if next known anchor is already top of col 1; if so stay in col 0 if room
            c = last_col
        cols[c].append(g)

    # Resolve any missing anchor vertically within its column
    for c in (0, 1):
        c_list = cols[c]
        if not c_list:
            continue
        col_x0 = 0.03 if c == 0 else split_x + 0.003
        col_x1 = split_x - 0.003 if c == 0 else 0.96
        for idx, g in enumerate(c_list):
            if g["id"] in anchors:
                continue
            prev_anc = anchors.get(c_list[idx - 1]["id"]) if idx > 0 else None
            next_anc = anchors.get(c_list[idx + 1]["id"]) if idx + 1 < len(c_list) else None
            top_search = (prev_anc["y0"] + 0.025) if prev_anc else min_y
            bot_search = (next_anc["y0"] - 0.01) if next_anc else max_y
            # Look for "(D)" option of previous question inside [top_search, bot_search]
            d_hits = [w for w in words if col_x0 <= w["x0"] <= col_x1 and top_search <= w["y0"] <= bot_search and w["t"].strip() == "(D)"]
            if d_hits:
                d_bot = d_hits[0]["y1"]
                after_d = [w for w in words if col_x0 <= w["x0"] <= col_x1 and d_bot + 0.01 <= w["y0"] <= bot_search]
                if after_d:
                    y_est = min(w["y0"] for w in after_d)
                    anchors[g["id"]] = {"x0": col_x0 + 0.04, "y0": y_est, "x1": col_x0 + 0.08, "y1": y_est + 0.015}

    # Compute exact crop rect for each group in each column
    for c in (0, 1):
        c_list = cols[c]
        if not c_list:
            continue
        col_x0 = 0.03 if c == 0 else split_x + 0.002
        col_x1 = split_x - 0.002 if c == 0 else 0.965
        c_list.sort(key=lambda g: anchors[g["id"]]["y0"] if g["id"] in anchors else 0.5)
        dividers = detect_horizontal_dividers(samples, W, H, col_x0, col_x1, min_y, max_y, words)

        for idx, g in enumerate(c_list):
            anc = anchors.get(g["id"])
            if not anc:
                continue
            part = int(g["part"])
            end_anc = find_question_anchor(words, int(g["endQ"]), min_y=anc["y0"], max_y=max_y) or anc
            # Upper bound of this group: right after previous group or Directions box
            if idx == 0:
                upper_lim = min_y
                # If no graphic sits above first question in Part 3/4, don't scan unnecessary blank top
                if part in (3, 4):
                    qheader = find_questions_header(words, int(g["startQ"]))
                    has_above_ink = any(c >= 3 for c in row_dark_counts(samples, W, H, int(col_x0*W), int(min(col_x1, 0.90)*W), int(upper_lim*H), max(int(upper_lim*H)+1, int((anc["y0"]-0.025)*H)), 180))
                    if not has_above_ink:
                        upper_lim = max(min_y, (qheader["y0"] if qheader else anc["y0"]) - 0.014)
                elif part == 5:
                    upper_lim = max(min_y, anc["y0"] - 0.010)
            else:
                prev_g = c_list[idx - 1]
                prev_anc = anchors.get(prev_g["id"])
                prev_end_anc = find_question_anchor(words, int(prev_g["endQ"]), min_y=prev_anc["y0"], max_y=anc["y0"]) or prev_anc
                sep_divs = [d for d in dividers if prev_end_anc["y1"] + 0.02 < d < anc["y0"]]
                if sep_divs:
                    upper_lim = sep_divs[-1] + 0.005
                elif part in (3, 4):
                    qheader = find_questions_header(words, int(g["startQ"]))
                    upper_lim = (qheader["y0"] if qheader else anc["y0"]) - 0.014
                else:
                    upper_lim = max(prev_end_anc["y1"] + 0.035, anc["y0"] - 0.010)

            # Lower bound of this group: strictly AFTER end_anc, before next item or column bottom
            if idx + 1 < len(c_list):
                next_anc = anchors[c_list[idx + 1]["id"]]
                sep_divs = [d for d in dividers if end_anc["y1"] + 0.02 < d < next_anc["y0"]]
                if sep_divs:
                    lower_lim = sep_divs[0] - 0.005
                else:
                    lower_lim = next_anc["y0"] - 0.009
            else:
                bot_divs = [d for d in dividers if d > end_anc["y1"] + 0.05]
                lower_lim = min(max_y, bot_divs[0] - 0.004) if bot_divs else max_y

            if lower_lim <= upper_lim + 0.02:
                continue

            box_words = [w for w in words if col_x0 <= w["x0"] and w["x1"] <= col_x1 and upper_lim <= w["y0"] and w["y1"] <= lower_lim]
            # Exclude far edge TEST N vertical tab during horizontal expansion for col 0/1 edges
            lim_x0 = max(col_x0, 0.082 if c == 0 and any(w["x0"] >= 0.082 for w in box_words) else col_x0)
            lim_x1 = min(col_x1, 0.898 if c == 1 and any(w["x1"] <= 0.898 for w in box_words) else col_x1)
            y0f, y1f = trim_y_ink(samples, W, H, lim_x0, lim_x1, upper_lim, lower_lim, box_words, thresh=185, pad_top=0.008, pad_bot=0.010)
            x0f, x1f = expand_x_around_words(samples, W, H, y0f, y1f, box_words, col_x0, col_x1, thresh=185)

            clip = fitz.Rect(rect.width * x0f, rect.height * y0f, rect.width * x1f, rect.height * y1f)
            dpi = 175 if part == 5 else 155
            pix = doc[pno - 1].get_pixmap(dpi=dpi, clip=clip)
            fn = f"{g['id']}.jpg"
            pix.save(os.path.join(images_dir, fn), jpg_quality=86)
            group_images[g["id"]] = {
                "file": fn,
                "cropped": True,
                "caption": g.get("caption") or f"Part {part} · Câu {g['startQ']}" + (f"–{g['endQ']}" if g["endQ"] != g["startQ"] else "")
            }

# Crop Part 6 & Part 7 (single & multi-page tightly trimmed)
def get_tight_passage_clip(pno, is_last_part7_page=False):
    words = ocr_by_page.get(pno, [])
    W, H, samples, rect = get_gray(pno, dpi=145)
    dir_bot = find_directions_bottom(pno, samples, W, H, words)
    min_y = dir_bot if dir_bot else 0.038
    max_y = 0.918
    # Exclude "GO ON TO THE NEXT PAGE" if higher than 0.918
    go_on = [w["y0"] for w in words if w["y0"] > 0.85 and w["t"] in ("NEXT", "ON") and any(w2["t"] == "PAGE" and abs(w2["y0"] - w["y0"]) < 0.015 for w2 in words)]
    if go_on:
        max_y = min(max_y, min(go_on) - 0.012)
    if is_last_part7_page:
        stop_w = [w["y0"] for w in words if w["y0"] > 0.72 and w["t"].startswith("Stop")]
        if stop_w:
            max_y = min(max_y, min(stop_w) - 0.015)

    box_words = [w for w in words if min_y <= w["y0"] and w["y1"] <= max_y and 0.03 <= w["x0"] and w["x1"] <= 0.94]
    if box_words:
        lim_x0 = max(0.03, min(w["x0"] for w in box_words) - 0.025)
        lim_x1 = min(0.95, max(w["x1"] for w in box_words) + 0.030)
    else:
        lim_x0, lim_x1 = 0.05, 0.90
    y0f, y1f = trim_y_ink(samples, W, H, lim_x0, lim_x1, min_y, max_y, box_words, thresh=185, pad_top=0.010, pad_bot=0.014)
    x0f, x1f = expand_x_around_words(samples, W, H, y0f, y1f, box_words, 0.025, 0.955, thresh=185)
    return fitz.Rect(rect.width * x0f, rect.height * y0f, rect.width * x1f, rect.height * y1f)

for grp in all_groups:
    part = int(grp["part"])
    pages = grp.get("_pages", [])
    if part not in (6, 7) or not pages:
        continue
    is_final = (part == 7 and int(grp["endQ"]) == 200)
    if len(pages) == 1:
        pno = pages[0]
        clip = get_tight_passage_clip(pno, is_last_part7_page=is_final)
        pix = doc[pno - 1].get_pixmap(dpi=150, clip=clip)
        fn = f"{grp['id']}.jpg"
        pix.save(os.path.join(images_dir, fn), jpg_quality=85)
        group_images[grp["id"]] = {
            "file": fn,
            "cropped": True,
            "caption": grp.get("caption") or f"Part {part} · Câu {grp['startQ']}–{grp['endQ']}"
        }
    else:
        gap = 10
        clips = []
        total_h = 0
        max_w = 0
        for idx, pno in enumerate(pages):
            clip = get_tight_passage_clip(pno, is_last_part7_page=(is_final and idx == len(pages) - 1))
            clips.append((pno, clip))
            total_h += clip.height
            if clip.width > max_w:
                max_w = clip.width
        total_h += gap * (len(clips) - 1)
        out_doc = fitz.open()
        out_page = out_doc.new_page(width=max_w, height=total_h)
        y_off = 0
        for idx, (pno, clip) in enumerate(clips):
            if idx > 0:
                out_page.draw_line(fitz.Point(0, y_off - gap / 2), fitz.Point(max_w, y_off - gap / 2), color=(0.82, 0.85, 0.89), width=1.5)
            x_center = (max_w - clip.width) / 2
            dest = fitz.Rect(x_center, y_off, x_center + clip.width, y_off + clip.height)
            out_page.show_pdf_page(dest, doc, pno - 1, clip=clip)
            y_off += clip.height + gap
        pix = out_page.get_pixmap(dpi=135)
        fn = f"{grp['id']}.jpg"
        pix.save(os.path.join(images_dir, fn), jpg_quality=85)
        out_doc.close()
        group_images[grp["id"]] = {
            "file": fn,
            "cropped": True,
            "caption": grp.get("caption") or f"Part {part} · Câu {grp['startQ']}–{grp['endQ']} (Trang {pages[0]}–{pages[-1]})"
        }

print(json.dumps({"renderedPages": rendered_pages, "groupImages": group_images}))
`;

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const examId = args.exam;
  if (!examId) {
    console.error('Usage: node scripts/slice-exam-media.mjs --exam <examId> [--audio <mp3>] [--lc-pdf <pdf>] [--rc-pdf <pdf>] [--ocr <ocr.json>]');
    process.exit(1);
  }

  const bank = JSON.parse(await readFile(path.join(root, 'data', 'exam-bank.json'), 'utf8'));
  const exam = bank.exams.find((e) => e.id === examId);
  const content = bank.contents[examId];
  if (!exam || !content) {
    console.error(`Exam not found: ${examId}`);
    process.exit(1);
  }

  const outDir = path.join(root, 'data', 'exam-media', examId);
  const audioOutDir = path.join(outDir, 'audio');
  const pagesOutDir = path.join(outDir, 'pages');
  const imagesOutDir = path.join(outDir, 'images');
  await mkdir(audioOutDir, { recursive: true });
  await mkdir(pagesOutDir, { recursive: true });
  await mkdir(imagesOutDir, { recursive: true });

  const manifestPath = path.join(outDir, 'manifest.json');
  let manifest = {
    schema: 1,
    examId,
    generatedAt: new Date().toISOString(),
    audio: {},
    pages: {},
    images: {}
  };
  try {
    const prev = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (prev && prev.examId === examId) {
      manifest = { ...manifest, ...prev, generatedAt: new Date().toISOString() };
    }
  } catch {
    // fresh manifest
  }

  if (args.audio) {
    const audioPath = path.resolve(args.audio);
    const durationSec = probeDurationSec(audioPath);
    const stderr = detectSilenceWithFfmpeg(audioPath, '-35dB', '1.5');
    const parsed = parseFfmpegSilenceLog(stderr, durationSec, content.groups);
    manifest.audioFile = path.basename(audioPath);
    manifest.totalDurationSec = durationSec;
    manifest.clipOffset = parsed.clipOffset;
    manifest.audioStrategy = parsed.strategy;
    manifest.audio = {};

    for (const seg of parsed.segments) {
      if (seg.rawStartSec !== undefined && (seg.part === 3 || seg.part === 4)) {
        const subLog = detectSilenceWithFfmpeg(audioPath, '-32dB', '0.6', ['-ss', String(seg.rawStartSec), '-t', '42']);
        const refinedOffset = detectPartDirectionsEndOffset(subLog, seg.part);
        if (refinedOffset !== null) {
          const newStart = Number(Math.min(seg.endSec - 15, seg.rawStartSec + refinedOffset).toFixed(2));
          seg.startSec = newStart;
          seg.durationSec = Number(Math.max(0.5, seg.endSec - newStart).toFixed(2));
          if (Array.isArray(seg.questionCues)) {
            seg.questionCues = seg.questionCues.map((c) => ({
              q: c.q,
              offsetSec: Number(Math.max(0, (c.absStartSec ?? (seg.rawStartSec + c.offsetSec)) - newStart - 0.15).toFixed(2))
            }));
          }
        }
      }
      const fileName = `${seg.groupId}.mp3`;
      const target = path.join(audioOutDir, fileName);
      execFileSync('ffmpeg', [
        '-y',
        '-ss', String(seg.startSec),
        '-to', String(seg.endSec),
        '-i', audioPath,
        '-vn',
        '-c:a', 'libmp3lame',
        '-ac', '1',
        '-ar', '22050',
        '-b:a', '64k',
        target
      ], { stdio: 'ignore' });
      const entry = {
        startSec: seg.startSec,
        endSec: seg.endSec,
        durationSec: seg.durationSec,
        url: `/exam-media/${encodeURIComponent(examId)}/audio/${encodeURIComponent(fileName)}`
      };
      if (Array.isArray(seg.questionCues)) {
        entry.questionCues = seg.questionCues.map((c) => ({ q: c.q, offsetSec: c.offsetSec }));
      }
      manifest.audio[seg.groupId] = entry;
    }
  }

  const runPythonRender = async (pdfPath, sourceId, startPage, endPage, matchingGroups, ocrJsonPath) => {
    const subDir = path.join(pagesOutDir, sourceId);
    let resolvedOcrPath = ocrJsonPath ? path.resolve(ocrJsonPath) : null;

    if (!resolvedOcrPath) {
      // First pass ensures page-*.jpg exist, then run built-in Windows OCR to build ocr.json automatically
      await mkdir(subDir, { recursive: true });
      const firstPass = JSON.stringify({
        pdfPath: path.resolve(pdfPath),
        pagesDir: subDir,
        imagesDir: imagesOutDir,
        sourceId,
        startPage,
        endPage,
        groups: []
      });
      spawnSync('python', ['-u', '-c', PY_RENDER_SCRIPT], { input: firstPass, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
      resolvedOcrPath = path.join(outDir, `ocr-${sourceId}.json`);
      buildWindowsOcrForPages(subDir, resolvedOcrPath);
    }

    const payload = JSON.stringify({
      pdfPath: path.resolve(pdfPath),
      pagesDir: subDir,
      imagesDir: imagesOutDir,
      sourceId,
      startPage,
      endPage,
      ocrJsonPath: resolvedOcrPath,
      groups: matchingGroups
    });
    const res = spawnSync('python', ['-u', '-c', PY_RENDER_SCRIPT], {
      input: payload,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024
    });
    if (res.status !== 0) {
      throw new Error(`Python PDF render failed: ${res.stderr || res.stdout}`);
    }
    const parsed = JSON.parse(String(res.stdout || '{}').trim());
    manifest.pages[sourceId] = {};
    for (const p of parsed.renderedPages || []) {
      const fn = `page-${String(p).padStart(3, '0')}.jpg`;
      manifest.pages[sourceId][String(p)] = `/exam-media/${encodeURIComponent(examId)}/pages/${encodeURIComponent(sourceId)}/${fn}`;
    }
    const validIds = new Set(content.groups.map((g) => g.id));
    for (const [gid, imgInfo] of Object.entries(parsed.groupImages || {})) {
      manifest.images[gid] = {
        url: `/exam-media/${encodeURIComponent(examId)}/images/${encodeURIComponent(imgInfo.file)}`,
        cropped: Boolean(imgInfo.cropped),
        caption: imgInfo.caption
      };
    }
    // Remove stale full-page/legacy group keys (e.g., g-p5-01..03) and fallback missing crops
    for (const gid of Object.keys(manifest.images)) {
      if (!validIds.has(gid)) delete manifest.images[gid];
    }
    const existingFiles = await readdir(imagesOutDir).catch(() => []);
    for (const f of existingFiles) {
      const gid = f.replace(/\.jpg$/i, '');
      if (f.endsWith('.jpg') && !validIds.has(gid)) {
        await rm(path.join(imagesOutDir, f), { force: true });
      }
    }
    for (const grp of matchingGroups) {
      if (grp.part >= 3) {
        const p = grp.pages?.[0] || grp.sourcePage;
        const pageUrl = manifest.pages[sourceId]?.[String(p)];
        if (pageUrl && !manifest.images[grp.id]) {
          manifest.images[grp.id] = {
            url: pageUrl,
            cropped: false,
            caption: grp.title || `Part ${grp.part} · Trang ${p} PDF gốc`
          };
        }
      }
    }
  };

  const lcId = exam.sources?.lcPdf?.id || null;
  const rcId = exam.sources?.rcPdf?.id || null;

  if (args['lc-pdf'] && lcId) {
    const unified = !args['rc-pdf'] || lcId === rcId;
    const matchingGroups = content.groups
      .filter((g) => unified || g.sourceId === lcId || g.part <= 4)
      .map((g) => ({
        id: g.id,
        part: g.part,
        startQ: g.startQ,
        endQ: g.endQ,
        sourcePage: g.sourcePage,
        pages: g.pages,
        pdfCrop: g.pdfCrop,
        caption: g.visual?.title || g.title || null
      }));
    await runPythonRender(args['lc-pdf'], lcId, 1, 100, matchingGroups, args.ocr);
  }

  if (args['rc-pdf'] && rcId && (!args['lc-pdf'] || rcId !== lcId)) {
    const startP = exam.sources.rcPdf.startPage || 1;
    const endP = exam.sources.rcPdf.endPage || 60;
    const matchingGroups = content.groups
      .filter((g) => g.sourceId === rcId || g.part >= 5)
      .map((g) => ({
        id: g.id,
        part: g.part,
        startQ: g.startQ,
        endQ: g.endQ,
        sourcePage: g.sourcePage,
        pages: g.pages,
        caption: g.title || null
      }));
    await runPythonRender(args['rc-pdf'], rcId, startP, endP, matchingGroups, args['rc-ocr'] || args.ocr);
  }

  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({
    ok: true,
    examId,
    audioSegments: Object.keys(manifest.audio).length,
    audioStrategy: manifest.audioStrategy || null,
    pdfSources: Object.keys(manifest.pages).length,
    groupImages: Object.keys(manifest.images).length,
    croppedImages: Object.values(manifest.images).filter((x) => x.cropped).length,
    manifestPath
  }));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
