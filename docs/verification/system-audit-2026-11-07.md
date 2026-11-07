# Melody Island 系統健檢 · 2026-11-07

審查基準是開發分支 `5236b04`。瀏覽器與資料測試使用本機 demo 模擬器，效能測量使用同版的本機 production build。這份報告記錄檢查結果與修正順序。

| 項目 | 判定 | 驗證結果與缺口 |
| --- | --- | --- |
| RWD | 核心流程通過 | Chromium／WebKit 有 320 CSS px 的首頁及房間面板溢出檢查、390px 手機與桌面流程。Chromium 合成觸控驗證 3D 水平旋轉和垂直捲動。最新版本的平板橫向、實體 iPhone 和完整瀏覽器縮放流程仍需補驗。 |
| 程式碼整理 | 未達成 | 搜尋整個版本庫後，`react-youtube`、`@types/youtube-player`、`sass` 找不到直接使用點。房間 UI 改版後，`app/globals.css` 仍留有無對應標記的 `.members-line` 和 `.room-management`。另有未被版本庫內程式引用的 `public/models/plane.glb`、`public/google.png`，移除前可確認舊外部連結。 |
| 無障礙 | 核心流程通過，AA 待驗 | axe、鍵盤開關與焦點回復、減少動態及窄幅檢查有自動化覆蓋。首頁「拖曳旋轉」實測 10px，對閱讀不利，字級本身不構成 WCAG 違規判定。VoiceOver 實機操作與完整縮放仍需人工驗證。 |
| SEO | 基礎 | 有標題、描述、圖示及 `zh-Hant`。公開首頁缺 canonical、社群分享 metadata、sitemap 設定。設計提案已有 `noindex`，房間路徑未明確標示 `noindex`。索引控制與 Firestore 的房間資料授權分開處理。 |
| GEO／AEO | 基礎不足 | 公開首頁的 HTML 有品牌和標語，缺少可直接讀取的產品說明，例如如何加入私人島嶼、如何同步聆聽。本輪沒有 Search Console 或答案引擎引用資料。Google AI 搜尋沿用基本搜尋最佳實務，沒有專屬必要 schema。 |
| 資安 | 基線已建立，正式環境待驗 | API 驗證身分、房間權限及速率，Firestore 規則封鎖直接寫入與機密集合，密碼使用分離雜湊。npm 生產依賴有 7 筆中度條目、0 高度或嚴重，主要來自 glob／minimatch 的傳遞相依。CSP 目前有 `base-uri`、`object-src` 和 `frame-ancestors`，缺少限制腳本來源的政策。正式 App Check、邊緣限流與正式 Firebase 規則仍需環境驗收。 |
| 效能 | 本機首頁已量測 | Production build 首頁 248 kB、房間 265 kB First Load JS。Mac Chrome 本機、減少動態、1440／390px 單次量測的首頁 LCP 為 444／296ms，完整 3D 場景約 1.69／1.70 秒，傳輸約 2.31 MB，窄幅最長主執行緒工作 110ms。尚缺實際訪客的 LCP／INP／CLS 分位數及低階手機長時間測量。 |
| 競態 | 已證實一項缺陷 | 播放版本、指令去重、20 人併發、重連、過期事件的自動測試有覆蓋。島主的訪客權限命令以整組快照覆寫，且不檢查舊版本。同一帳號在兩個分頁修改不同權限時，第二次修改可把第一項設回原值。 |
| i18n | 未實作英文 | 根節點固定 `lang="zh-Hant"`。繁中散在畫面、表單、無障礙名稱和 API 錯誤內，沒有英文辭典、語言切換、偏好保存或可獨立索引的英文公開頁。 |

Impeccable 的人工評估為 **13/20**。無障礙 3、效能 2、主題一致性 2、RWD 3、實作品質 3。源碼掃描有 71 項設計系統建議，含 57 個字級、9 個色彩和 5 個圓角。這些是設計規格差異。390px 首頁渲染另提示「拖曳旋轉」的 10px 字級，以及品牌斜體襯線標題。後者符合既定品牌方向。

## 修正順序

1. **P1　競態**。訪客權限改成傳送單一欄位，由 Firestore 交易合併最新設定，並新增同一島主雙分頁的回歸案例。已重現先關閉切歌、再用舊快照關閉歌單編輯，結果切歌權限被重新開啟。參考 [健檢時的權限寫入](https://github.com/johnny890118/melody-island/blob/5236b04/lib/session.ts#L215) 和 [健檢時的權限表單](https://github.com/johnny890118/melody-island/blob/5236b04/app/island/%5BislandId%5D/page.tsx#L692)。
2. **P1　正式環境驗收**。驗證 App Check、邊緣限流、實際 Firestore 規則及 CSP。Staging 目前的 YouTube iframe 封鎖會攔下播放器所有直接輸入，屬於與 YouTube 標準播放互動政策的相容性風險。參考 [播放器實作](../../components/YouTubeFrame.tsx#L116) 和 [YouTube 開發者政策](https://developers.google.com/youtube/terms/developer-policies-guide)。
3. **P2　雙語與公開搜尋**。集中管理介面及無障礙文案、為 API 錯誤提供可翻譯的代碼、建立語言切換，然後補公開雙語頁的 canonical、`hreflang`、sitemap 與可讀的產品說明。私人房間另加 `noindex`。參考 [多語言網站](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)、[索引標記](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag) 和 [Google AI 搜尋指引](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)。
4. **P2　整理與實機補驗**。移除確認無用的相依和樣式，清點資產引用。用實體 iPhone、VoiceOver、平板橫向與低速連線複查。對 3D 載入和主執行緒工作建立預算，再採集實際訪客 Core Web Vitals。參考 [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 和 [Web Vitals](https://web.dev/articles/vitals)。

同版的 [GitHub CI](https://github.com/johnny890118/melody-island/actions/runs/42350056591) 已通過 lint、型別、單元、規則、遷移演練、production build、Chromium、WebKit 和同頁登入回歸。這些測試使用模擬器，真實 YouTube、實體 iPhone 及正式 Firebase 的驗收各自需要對應證據。
