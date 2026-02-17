# 民主富二代補課小站 (Democracy Remedial Station)

這是一個關於台灣民主歷程與轉型正義的書籍/影音策展網站。網站將自由視為一份珍貴的家業，並將當代享受民主自由的人們稱為「民主富二代」。本站旨在透過分階的閱讀計畫，幫助使用者認識這份遺產的來歷。

This is a curated website for books and documentaries related to Taiwan's democratic history and transitional justice. The website views freedom as a precious family legacy and refers to people today who enjoy democracy and freedom as "Second Generation Democracy Heirs" (民主富二代). The site aims to help users understand the origins of this legacy through a tiered reading plan.

## 功能特色 / Features

- **分階書單 (Tiered Book Lists):**
    - **初階 (Basic):** 從聽故事開始，適合歷史小白。
    - **中階 (Intermediate):** 把零散的歷史碎片拼成大藍圖。
    - **進階 (Advanced):** 史料判讀與深度政經分析。
- **兒童與青少年專區 (Children & Youth Section):** 親子共讀、歷史啟蒙書單。
- **紀錄片專區 (Documentaries):** 影像紀錄。
- **社群共編 (Community Contribution):** 連結至 Google Form 收集推薦書單。
- **標籤與關鍵字搜尋 (Enhanced Search):** 支持書名、作者、描述與標籤搜尋。
- **響應式網格佈局 (Responsive Grid):** 針對大螢幕優化，每排顯示 6 本書籍。
- **本地圖資儲存 (Local Image Storage):** 採用本地儲存方案，同步時自動下載海報與封面圖至 `public/assets/`，徹底解決外部擋圖與 CORS 問題。
- **智能圖片代理 (Smart Image Proxy):** 對於尚未同步的外部連結，自動透過 `wsrv.nl` 進行代理與優化，確保圖片加載穩定性。
- **封面圖自動產出 (Automated Covers):** 建立博客來封面圖 sharding 邏輯，確保書籍封面精準度。

## 技術棧 / Tech Stack

- **Frontend:** React 19, TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Routing:** React Router DOM
- **Linting & Formatting:** Biome (all-in-one linter + formatter)
- **Pre-commit Hook:** Husky + lint-staged (auto-fix on commit)

## 本地開發 / Development

1.  **安裝依賴 / Install Dependencies:**
    ```bash
    npm install
    ```

2.  **啟動開發伺服器 / Start Dev Server:**
    ```bash
    npm run dev
    ```
3.  **程式碼檢查 / Lint & Format:**
    ```bash
    npm run lint        # 檢查程式碼問題
    npm run lint:fix    # 自動修正
    npm run format      # 自動排版
    ```
    每次 commit 時會自動透過 pre-commit hook 執行檢查與修正。

4.  **建置 / Build:**
    ```bash
    npm run build
    ```

## AI 輔助開發 / AI-Assisted Development

本專案使用 [`AGENTS.md`](./AGENTS.md) 作為所有 AI 編程助手的共用規範（程式碼風格、架構慣例、文件維護規則等）。

各 AI 工具各自讀取不同的設定檔，請依照你使用的工具建立 symlink，讓它指向 `AGENTS.md`：

```bash
# Claude Code
ln -s AGENTS.md CLAUDE.md

# Cursor
ln -s AGENTS.md .cursorrules

# GitHub Copilot
mkdir -p .github && ln -s ../AGENTS.md .github/copilot-instructions.md

# Windsurf
ln -s AGENTS.md .windsurfrules

# Google Antigravity
mkdir -p .gemini && ln -s ../AGENTS.md .gemini/GEMINI.md
```

> 這些 symlink 不需要 commit 進 repo，已加入 `.gitignore`。

## 部署 / Deployment

本專案使用 GitHub Actions 自動部署至 GitHub Pages。
- **自動部署：** 每當推送到 `main` 分支時，`.github/workflows/pages.yml` 會自動執行建置並部署。
- **自定義網域：** 透過 `public/CNAME` 檔案，網站建置後會自動包含網域設定，指向 [booko.g0v.tw](https://booko.g0v.tw)。

## 資料來源與排序邏輯 / Data Source & Sorting

本專案的所有書籍與影音資料皆以 **Google Sheet** 為單一真理來源 (Single Source of Truth, SSOT)，請勿直接修改 `books_data.ts`。

- **資料來源 (Source):** [Google Sheet Link](https://docs.google.com/spreadsheets/d/1Z0JUS0fw5SFaX1-oht6jEx5i8XI888vx5F9jm9BEggI/edit?gid=0#gid=0)
- **同步方式 (Sync):** 執行 `npm run sync` 可將試算表資料同步至本地專案。
    - **自動下載圖片：** 同步過程中會自動將海報與封面圖下載至 `public/assets/` 資料夾，避免相依於外部圖源。

### 排序邏輯 (Sorting Logic)

書籍排列採用 **兩級排序 (Two-Level Sorting)** 機制，以確保學習路徑的循序漸進：

1.  **第一級：難易度分組 (Primary: Level Mapping)**
    - 先依照「初中高階」欄位進行分組。
    - **順序：** 初階 (Basic) -> 中階 (Intermediate) -> 高階 (Advanced)。

2.  **第二級：自訂順序 (Secondary: Sort Order)**
    - 在同一個難易度群組內，依照試算表中的「排序」欄位 (數字) 進行升冪排列。
    - 數字越小，排序越前。

## 書籍連結工具 / Book Links Tools

為了豐富書籍資訊並提供讀者多元的購書管道，本專案提供自動化工具來收集與管理各大書店的購書連結。

### 工具概覽 (Overview)

本系統提供兩種工作流程：

1. **CLI 工具流程 (Node.js)** - 適合技術使用者，支援自動化搜尋與批次處理
2. **AppScript 工具流程 (Google Sheets)** - 適合非技術使用者，直接在試算表中操作

### 支援的書店 (Supported Bookstores)

系統支援以下 7 家台灣主要書店：

- **博客來** (Books.com.tw)
- **金石堂** (Kingstone)
- **誠品** (Eslite)
- **momo購物網** (Momo)
- **Kobo** (電子書)
- **Readmoo** (電子書)
- **讀冊生活** (Taaze)

### CLI 工具流程 (CLI Workflow)

#### 前置準備

1. **設置 Google Sheets API 憑證：**
   - 詳細步驟請參考 [scripts/README.md](scripts/README.md#2-configure-google-sheets-api-credentials)
   - 需要建立 Google Cloud 服務帳號並下載憑證檔案

2. **建立暫貼區分頁：**
   - 在試算表中新增名為 `暫貼區` 的分頁
   - 詳細設置說明請參考 [docs/staging-tab-setup.md](docs/staging-tab-setup.md)

#### 使用步驟

**方式 1：互動式審核 (推薦)**

```bash
npm run review-links
```

此命令會：
1. 從 `暫貼區` 讀取書名
2. 為每本書自動產生各書店連結
3. 在瀏覽器中開啟所有連結供人工審核
4. 詢問是否確認 (Y/N)
5. 確認後自動合併至 `成人書單` 主表

**方式 2：批次產生連結**

```bash
npm run find-links
```

此命令會：
1. 自動為所有書籍產生書店連結
2. 儲存至 `暫貼區` 供後續審核
3. 不會自動合併至主表（需人工審核後再合併）

#### 特定書籍處理

```bash
npm run review-links --title="書名"
```

僅處理指定的單一書籍。

### AppScript 工具流程 (AppScript Workflow)

#### 部署設置

1. 開啟試算表，點選 **擴充功能** → **Apps Script**
2. 複製 [appscript/approve-links.gs](appscript/approve-links.gs) 的內容
3. 貼上並儲存
4. 重新整理試算表，會出現 **Book Links** 選單

詳細部署說明請參考 [appscript/README.md](appscript/README.md)

#### 使用步驟

**單一連結審核 (Cell-Level)**

1. 在 `暫貼區` 分頁中點選要審核的書店連結儲存格
2. 點選 **Book Links** → **Approve Selected Cell**
3. 該連結會被複製到 `成人書單` 對應欄位

適用時機：只確認了某個書店的連結，其他書店還在查證中。

**整本書審核 (Row-Level)**

1. 在 `暫貼區` 分頁中選取一整列（或多列）
2. 點選 **Book Links** → **Approve Selected Row(s)**
3. 該書的所有連結會被批次複製到 `成人書單`

適用時機：已確認該書所有書店連結都正確。

### 關鍵規則與特色 (Key Features & Rules)

#### 規則 1：絕不覆寫現有連結 (Never Overwrite)

合併連結時：
- ✅ **空白欄位** → 填入新連結
- ✅ **"NOT_FOUND"** → 更新為新連結
- ❌ **已有連結** → 保持不變（不覆寫）

這確保人工編輯的連結不會被自動工具覆蓋。

#### 規則 2：書籍必須已存在主表 (Book Must Exist)

- 只能為 `成人書單` 中已存在的書籍增補連結
- 新書需先加入主表（包含完整書籍資訊：作者、分類、描述等）
- `暫貼區` 用於補充連結，不用於新增書籍

#### 特色：雙重審核機制

- **自動產生 + 人工確認**：工具自動搜尋連結，但需人工審核確認
- **分級審核**：可單一連結審核（細緻）或整本書審核（快速）
- **工作流程隔離**：暫貼區與主表分離，避免誤改主要資料

### 詳細文檔 (Detailed Documentation)

- **CLI 工具設置與使用：** [scripts/README.md](scripts/README.md)
- **AppScript 部署指南：** [appscript/README.md](appscript/README.md)
- **暫貼區分頁設置：** [docs/staging-tab-setup.md](docs/staging-tab-setup.md)
- **測試檢查清單：** [docs/plans/2026-02-17-book-links-testing.md](docs/plans/2026-02-17-book-links-testing.md)
- **系統設計文檔：** [docs/plans/2026-02-16-book-links-tool-design.md](docs/plans/2026-02-16-book-links-tool-design.md)

### 工作流程範例 (Workflow Example)

```
1. [人工] 在暫貼區填寫書名
         ↓
2. [CLI] npm run review-links
         ↓
3. [自動] 產生各書店連結並開啟瀏覽器
         ↓
4. [人工] 檢查連結是否正確，輸入 Y 或 N
         ↓
5. [自動] Y：寫入暫貼區 + 合併至主表
         ↓
6. [現有] npm run sync 同步至程式碼庫
```

或使用 AppScript 流程：

```
1. [人工] 在暫貼區手動搜尋並貼上連結
   或     執行 npm run find-links 自動產生
         ↓
2. [人工] 在試算表中檢視連結
         ↓
3. [人工] 選擇儲存格/列，點選 Book Links 選單
         ↓
4. [自動] 合併至成人書單
         ↓
5. [現有] npm run sync 同步至程式碼庫
```

### 故障排除 (Troubleshooting)

**問題：「Book not found in main tab」**
- **原因：** 書籍尚未加入 `成人書單`
- **解決：** 先在主表中新增該書完整資訊，再審核連結

**問題：CLI 工具無法存取試算表**
- **原因：** 服務帳號權限不足
- **解決：** 將試算表分享給服務帳號的 email（在 `.credentials.json` 中的 `client_email`）

**問題：AppScript 選單未出現**
- **原因：** 腳本未正確部署或未授權
- **解決：** 檢查部署步驟，執行一次 `onOpen` 函數並授權

更多問題請參考各工具的 README 文檔。

## 待辦事項 / Todo List

- [x] **推薦功能改版 (Revamp Recommendation):** 將「我要推薦」功能改成使用 Google Form: [Link](https://docs.google.com/forms/d/1HZPkLNFjrCWHlJ5qjLVhf6sM5AFGG5-w12R71jqt_PQ/edit)
- [x] **紀錄片資料維護 (Documentary Data):** 修正《牽阮的手》等紀錄片的 thumbnail 連結，改用官方海報或可靠來源。
- [x] **穩健圖資同步 (Robust Image Sync):** 實作內容校驗、增量更新與本地保護機制，確保手動修正不被覆蓋。
- [x] **搜尋功能優化 (Enhanced Search):** 增加對書名、作者、描述的關鍵字搜尋功能。
- [x] **書籍封面精準度 (Book Cover Accuracy):** 已建立 `utils/bookCover.ts` 處理博客來圖片 sharding 邏輯，同步時會自動下載至本地儲存，確保顯示穩定。
- [x] **佈局優化 (Layout Optimization):** 大螢幕每排顯示從 5 本增加至 6 本。
- [x] **多平台購書連結 (Multi-platform Purchase Links):** 資料層已同步金石堂、誠品等連結，UI 介面已實作，支持博客來、誠品、金石堂、momo、Kobo、Readmoo 等平台。
- [x] **影音資料 SSOT 同步 (Video Data SSOT Sync):** 已從 SSOT 匯入紀錄片影視片單，具有分類、說明、tag。
- [x] **紀錄片圖片修正 (Documentary Image Fix):** 已同步 SSOT 中 Column F「圖片」欄位。採用 **本地儲存 (Local Storage)** 方案，同步時自動下載圖檔至 GitHub 倉庫，徹底解決外部擋圖與 CORS 問題。
- [x] **紀錄片排序邏輯 (Documentary Sorting Logic):** 建立紀錄片影視的兩級排序：第一級以 SSOT 中「標籤」分組（「民主運動」置頂），第二級按試算表中的「排序」欄位進行升冪排列。
- [x] **SSOT 資料強化 (SSOT Data Enhancement):** 新增 kobo, readmoo 商品頁連結。
- [ ] **書籍資訊擴充 (Book Info Expansion):** 書籍欄增加出版年份資訊。
- [ ] **新增「關於本站」分頁 (About Page):** 新增關於本站的介紹與說明頁面。
- [ ] **Google Analytics:** 整合 Google Analytics 追蹤網站流量。
- [x] **細部 UI/UX 優化:**
    - 增加深色模式 (Dark Mode)。
    - 優化行動裝置體驗。
- [x] **SEO 優化:**
    - 為每個頁面添加適當的 Meta Tags。
- [x] **授權標示 (License):** 增加授權標示 CC BY 4.0 並增加圖示。
- [ ] **投稿方式擴充 (Submission Expansion):** 新增批次書單投稿方式（除了單本從 Google Form 填寫之外的方法）。
- [x] **網域指向 (Domain):** 將網域指向 [booko.g0v.tw](https://booko.g0v.tw)。
- [x] **專案轉移 (Project Transfer):** 已將 repository 轉移至 g0v organization，並更新相關 metadata。

