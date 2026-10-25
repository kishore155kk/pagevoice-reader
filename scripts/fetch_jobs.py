import json, os, re, hashlib
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
DATA_PATH = ROOT / "data" / "jobs.json"

APP_ID = os.getenv("ADZUNA_APP_ID", "").strip()
APP_KEY = os.getenv("ADZUNA_APP_KEY", "").strip()
COUNTRY = os.getenv("ADZUNA_COUNTRY", CONFIG.get("country", "in"))
if not APP_ID or not APP_KEY:
    raise SystemExit("Missing ADZUNA_APP_ID / ADZUNA_APP_KEY repository secrets.")

KEYWORDS = [x.lower() for x in CONFIG["keywords"]]
EXCLUDE = [x.lower() for x in CONFIG.get("exclude_keywords", [])]
MIN_SCORE = int(CONFIG.get("min_match_score", 25))
MAX_JOBS = int(CONFIG.get("max_jobs", 150))

def clean_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", s).strip()

def score_job(title, description, company, location, query):
    text = " ".join([title, description, company, location, query]).lower()
    if any(word in text for word in EXCLUDE):
        # Don't automatically reject roles just because the description mentions
        # a seniority term; only reject if title itself is clearly unsuitable.
        if any(word in title.lower() for word in EXCLUDE):
            return 0, []
    matched = []
    score = 0
    title_l = title.lower()
    for kw in KEYWORDS:
        if kw in text:
            matched.append(kw)
            score += 12 if kw in title_l else 4
    if "java" in title_l: score += 15
    if any(x in title_l for x in ["security", "siem", "waf", "application protection"]): score += 12
    if any(x in title_l for x in ["intern", "trainee", "principal", "director"]): score -= 50
    return min(99, score), matched[:8]

def fetch_query(query, category):
    url = f"https://api.adzuna.com/v1/api/jobs/{COUNTRY}/search/1"
    params = {
        "app_id": APP_ID, "app_key": APP_KEY, "what": query,
        "results_per_page": 50, "content-type": "application/json",
        "sort_by": "date", "max_days_old": 30
    }
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    body = response.json()
    out = []
    for item in body.get("results", []):
        title = clean_html(item.get("title", ""))
        company = clean_html((item.get("company") or {}).get("display_name", ""))
        location = clean_html((item.get("location") or {}).get("display_name", ""))
        desc = clean_html(item.get("description", ""))
        link = item.get("redirect_url", "")
        score, matched = score_job(title, desc, company, location, query)
        if score < MIN_SCORE or not link:
            continue
        ident = hashlib.sha1((link or (title+company+location)).encode()).hexdigest()[:14]
        out.append({
            "id": ident, "title": title, "company": company or "Company not listed",
            "location": location or "Location not listed", "description": desc[:650],
            "url": link, "posted_at": item.get("created"), "category": category,
            "skills": matched, "match_score": score, "source": "Adzuna",
            "work_mode": "Remote" if "remote" in (title+" "+desc+" "+location).lower() else "",
            "is_new": False
        })
    return out

def main():
    all_items = {}
    for entry in CONFIG["queries"]:
        try:
            for job in fetch_query(entry["query"], entry["category"]):
                key = job["url"].split("?")[0].rstrip("/")
                if key not in all_items or job["match_score"] > all_items[key]["match_score"]:
                    all_items[key] = job
        except Exception as exc:
            print(f"Query failed ({entry['query']}): {exc}")
    if not all_items:
        raise SystemExit("No results retrieved. Check API credentials, quota, and network; preserving previous feed.")
    jobs = sorted(all_items.values(), key=lambda j: (j["match_score"], j.get("posted_at") or ""), reverse=True)[:MAX_JOBS]
    previous = {}
    if DATA_PATH.exists():
        try:
            old = json.loads(DATA_PATH.read_text(encoding="utf-8"))
            previous = {j.get("url","").split("?")[0].rstrip("/") for j in old.get("jobs", [])}
        except Exception:
            pass
    for j in jobs:
        j["is_new"] = j["url"].split("?")[0].rstrip("/") not in previous
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "note": "Automatically collected from Adzuna. Relevance scores are heuristic estimates; verify each listing and employer details before applying.",
        "jobs": jobs
    }
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(jobs)} jobs to {DATA_PATH}")

if __name__ == "__main__":
    main()
