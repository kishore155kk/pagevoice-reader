# Job Radar — Java Backend + Cybersecurity

A mobile-friendly static job dashboard designed for GitHub Pages and Safari. A scheduled GitHub Actions workflow fetches current listings from Adzuna, scores them against the configured profile, removes duplicates, and commits `data/jobs.json`. The website reads that published JSON feed.

## What it searches for

- Java backend engineering and REST services
- Rate limiting, Redis, Lua, Caffeine, distributed systems
- Cybersecurity product engineering, WAF, SIEM and malware scanning
- Application security and selected AI application-security roles

The score is a heuristic keyword match, not a guarantee of suitability. Review each job, location, seniority, salary and application page yourself.

## Setup

### 1. Create a GitHub repository
1. Download and unzip this project.
2. Create a new repository on GitHub, for example `daily-job-radar`.
3. Upload all project files and folders, keeping their structure.

### 2. Configure Adzuna API access
1. Create an API account at https://developer.adzuna.com/.
2. In your GitHub repository, open **Settings → Secrets and variables → Actions**.
3. Add repository secrets:
   - `ADZUNA_APP_ID`
   - `ADZUNA_APP_KEY`
4. Do not put API keys in `config.json`, `app.js`, or any public file.

### 3. Enable automated runs
1. Open **Settings → Actions → General** and allow workflows to have read/write repository permissions if your organization settings require it.
2. Open **Actions → Daily job search → Run workflow** to run the first search.
3. Confirm the workflow succeeds and updates `data/jobs.json`.
4. Scheduled runs are set to 08:00 India Standard Time daily. GitHub may delay scheduled workflows during high load.

### 4. Enable GitHub Pages
1. Open **Settings → Pages**.
2. Under build and deployment, choose **Deploy from a branch**.
3. Choose branch `main` (or your default branch) and folder `/ (root)`.
4. Save. After publishing, open the shown `https://YOUR-USERNAME.github.io/YOUR-REPO/` link in Safari.

## Customize your searches
Edit `config.json` to update keywords, query phrases, locations and match threshold. Edit the query list in `scripts/fetch_jobs.py` only if you want to change which Adzuna searches are run. The current API search is for India (`ADZUNA_COUNTRY=in`). You can change this to a supported Adzuna country code after checking their API docs and plan availability.

## Important notes
- This is a starter app; it does not apply to jobs automatically.
- Job coverage depends on the provider, API account limits, country support and query results.
- The feed is public when hosted on GitHub Pages. Do not put private resume files, phone numbers, email addresses or secrets in this repository.
- Saved jobs are stored locally in the browser on the device, not synced across devices.
- GitHub Actions is a scheduled workflow, not a guaranteed exact-time scheduler.
- If a run fails, check **Actions → Daily job search → latest run → logs**.
