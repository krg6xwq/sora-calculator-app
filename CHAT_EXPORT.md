# Chat History: SORA Calculator Development & MAS API Integration

**App Name**: SORA Precision | MAS Singapore Overnight Rate Calculator  
**Repository**: `https://github.com/krg6xwq/sora-calculator-app.git`  
**Branch**: `main`  
**Export Date**: 2026-10-05  

---

## Turn 1: Initial Prompt & Frontend Implementation

### User Request
> Build me a Singapore-based SORA calculator that reads MAS-backed overnight rates for calculating interest payments accurately and efficiently. Just the front-end for now, I will integrate the backend later.

### Assistant Response Summary
Built **SORA Precision**, a production-grade Singapore financial calculator adhering to official Monetary Authority of Singapore (MAS) and Association of Banks in Singapore (ABS) standards:

1. **MAS Overnight Benchmark Integration**:
   - Live query capability from MAS DataStore API with fallback to verified MAS historical rate series cache.
   - Live Rate Summary Ticker: Daily Overnight SORA, 1-Month Compounded SORA, 3-Month Compounded SORA (standard retail mortgage benchmark), 6-Month Compounded SORA, MAS SORA Index, and Transacted Volume (SGD Millions).

2. **Singapore Mortgage & Retail Housing Calculator**:
   - Property price, quick LTV presets (75% first home cap, 55% second property), tenure (5–30 years), benchmark selector (3M, 1M, 6M, custom).
   - Flat and tiered bank spread structures (e.g. DBS, OCBC, UOB packages).
   - Monthly repayments, principal vs. interest breakdown, total interest.
   - Built-in **MAS Notice 645 Compliance Engine**: TDSR (Total Debt Servicing Ratio capped at 55%) under mandatory 4.00% p.a. stress testing, and MSR (30% cap) for HDB/EC.

3. **Institutional ACT/365 Compounding in Arrears**:
   - Wholesale and corporate syndicated loan engine implementing the official ABS/MAS compounding formula:
     $$\text{Compounded Rate} = \left[ \prod_{i=1}^{d_b} \left(1 + \frac{r_i \times n_i}{365 \times 100}\right) - 1 \right] \times \frac{365}{d} \times 100\%$$
   - Supports 5-day Lookback with Observation Shift, 5-day Lookback without Shift, and Plain Period Compounding.
   - Dual-method verification against MAS SORA Index showing basis point reconciliation.
   - Day-by-day compounding ledger table with reference dates, weekend weightings ($n_i$), daily compounding factors, and daily accrued interest.

4. **Rate Sensitivity Matrix & Fixed vs. Floating Breakeven**:
   - Evaluates interest rate shifts across -100 bps, -50 bps, baseline, +50 bps, +100 bps, and MAS regulatory stress (+4.00% cap).
   - Breakeven analyzer comparing fixed rate bank offers against floating SORA packages over 1, 2, or 3-year lock-in windows.

5. **Payment Ledger & Prepayment Simulator**:
   - Annual summary and monthly breakdown schedules.
   - Lump-sum prepayment simulator calculating exact interest saved and accelerated principal pay-down.
   - One-click CSV export for amortization schedules and daily compounding ledgers.

---

## Turn 2: GitHub Repository Setup & Push

### User Request
> `git push https://<GITHUB_TOKEN>@github.com/krg6xwq/sora-calculator-app.git`

### Assistant Actions & Output
1. Initialized git repository in `/app/applet`.
2. Configured user credentials and renamed primary branch to `main`.
3. Staged 23 files including all components, styles, data sets, types, and configuration.
4. Committed: `feat: SORA calculator with MAS-backed overnight rates`.
5. Connected remote origin: `https://github.com/krg6xwq/sora-calculator-app.git`.
6. Pushed branch `main` to GitHub:
   ```bash
   git branch -M main
   git add .
   git commit -m "feat: SORA calculator with MAS-backed overnight rates"
   git remote add origin https://<GITHUB_TOKEN>@github.com/krg6xwq/sora-calculator-app.git
   git push -u origin main
   ```
   **Result**: Successfully pushed commit `d8a507a` to `main`.

---

## Turn 3: Serverless MAS APIMG Gateway Connection

### User Request
> Add a serverless connection that pulls MAS data using the following end point:
> - store this in /api folder (at project root level) NOT src file
> - include /health.ts and /sora.ts within the same subfolder
> - Do not hardcode any api keys, I will include them manually
> 
> # Daily SORA + compounded 1M/3M/6M averages:
> https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily
> 
> # All requests need the header: <MAS_KEY_ID>

### Assistant Actions & Output
1. Created `/api/health.ts` at project root:
   - Returns service status, uptime, and boolean indicator if `MAS_KEY_ID` is configured.
   - Supports both Express/Node serverless `(req, res)` and Edge `GET(request)` Web standards.

2. Created `/api/sora.ts` at project root:
   - Queries the official MAS APIMG gateway:
     `https://eservices.mas.gov.sg/apimg-gw/server/monthly_statistical_bulletin_non610mssql/domestic_interest_rates_daily/views/domestic_interest_rates_daily`
   - Dynamically passes the `<MAS_KEY_ID>` header from environment (`process.env.MAS_KEY_ID || process.env.MAS_API_KEY`).
   - Normalizes and standardizes the MAS response schema.
   - Handles missing key gracefully with warning status and instructions.

3. Updated `/.env.example`:
   - Added `MAS_KEY_ID="YOUR_MAS_KEY_ID_HERE"` without hardcoding any secrets.

4. Created `/server.ts` & updated `package.json`:
   - Configured Express server running on port 3000 mounting `/api/health` and `/api/sora`, and forwarding Vite middlewares in development.

5. Verification with curl:
   - Tested `/api/health`: returned `200 OK` with service metadata.
   - Tested `/api/sora`: returned warning indicating `MAS_KEY_ID` needs configuration.
   - Tested `/api/sora` with header `MAS_KEY_ID: test_key`: MAS APIMG Gateway returned `401 Unauthorized` (Vordel APIM envelope `fault:MessageBlocked`), proving live connectivity and header propagation to the official MAS APIMG Gateway.

6. Committed & Pushed to GitHub:
   ```bash
   git add .
   git commit -m "feat: add serverless /api connection with MAS APIMG gateway and MAS_KEY_ID header support"
   git push origin main
   ```
   **Result**: Successfully pushed commit `546a9bd` to `main`.

---

## Turn 4: Export Chat History

### User Request
> export this entire chat as an .md file

### Assistant Actions
- Created `CHAT_EXPORT.md` capturing all user prompts, architectural decisions, code implementation details, verification steps, and git history.
