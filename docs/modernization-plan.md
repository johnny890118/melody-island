# Melody Island 改版與可靠性計畫

日期：2026-11-03。主要情境：朋友私人共聽房，每房 2–20 人（使用者已確認）。
原始盤點日期為 2026-11-03；下方原始發現保留作為基線。

## 實作進度（2026-11-04）

已實作第一版暖白／深海綠視覺與真實 3D 首頁、房間頁、表單與錯誤回饋；目標為 Awwwards 級完成度，但尚未宣稱達到或獲得獎項。Impeccable 已安裝；獨立視覺檢查列出的五項修正已有桌面、手機與短螢幕焦點證據。

新版房間採 server-only 密碼雜湊、ID token、UID 名冊授權、版本與命令去重、身分穩定的刪歌、主持租約、重連與單一播放器 adapter。加入分享連結、隨機播放、權限設定、移出成員、交接島主與離開房間。20 人重複測試發現 lease/counter 的交易鎖競爭，已改以 updateTime compare-and-set；名冊收斂到有上限的房間文件。

已加入單元／元件測試、Rules Emulator 測試、Playwright 與 CI。最終執行結果見 docs/verification.md；不以單次測試通過代替穩定性證據。正式依賴掃描已消除 critical/high，仍有 moderate，詳見驗證紀錄。

未部署、未修改正式 Firebase、未遷移舊房、未完成真實 YouTube 音訊偏差及 Safari 驗收。即時 presence、投票跳歌與 AI 排歌仍在後續清單，不偽造成已完成。

---

## 1. 已完成的檢查與限制

- 檢視首頁、3D 元件、Firebase 初始化與設定代理、登入、Redux、房間同步、播放與佇列操作。
- `npm run lint` 通過；`next lint` 已提示棄用，後續改用 ESLint CLI。
- `npm run build` 失敗：本機 Next 安裝缺少 `../segment-config/pages/pages-segment-config`。先以乾淨環境 `npm ci` 重現，不能先斷定是應用程式錯誤。
- `npm audit --json` 回報 24 個受影響套件項目：4 critical、13 high、7 moderate。這不是 24 個已證實可利用的產品漏洞；需區分執行環境、使用方式與修復版本。
- 沒有找到測試檔、測試 script、Firebase rules、emulator 設定或 CI。未查閱正式 Firebase 權限、API key 限制、部署 headers 或線上流量。
- 沒有執行真實雙客戶端同步、瀏覽器視覺驗證、效能量測或滲透測試。下列同步缺陷是程式推導，需用回歸測試重現。
- `.env` 與 certificates 沒出現在目前 `git ls-files` 結果；未讀取其內容，也未完成歷史秘密掃描。

## 2. 問題與優先級

| 優先級 | 證據位置 | 問題與影響 | 修正方向 |
|---|---|---|---|
| P0 | `app/page.js` handleCreateIsland / handleJoinIsland | 明文 password 與房間資料同文件；前端讀整份文件後比對密碼。可讀文件的人已取得密碼，前端比對無法建立存取邊界 | 由受信任後端驗證密碼與發放 membership；密碼雜湊放不可供客戶端讀取的獨立文件 |
| P0 | 房間頁 DEFAULT_PERMISSIONS、isOwner；repo 無 rules | 控制權判斷只見於前端，預設訪客全開；`'' === ''` 還可能誤判未載入身分為島主。不能據此聲稱正式資料庫允許任意寫入 | 使用 auth UID、membership、明確角色；rules 拒絕越權、變更 owner、偽造時間與非法欄位。Admin SDK 路徑另做相同授權 |
| P1 | 房間頁 239–280 | transaction 重新讀取清單，卻沿用點擊當下 index。A 刪前一首後 B 可能刪到另一首 | 傳入穩定 queueItemId，於 transaction 內重新定位；先用 videoId 修補亦可，但未來允許重複點歌需 item ID |
| P1 | 房間頁 40–42、Navbar 登入 effect | 房間 ID 來自 Redux 而非 route params；重新整理會失去 ID；登入尚未初始化時即導回首頁 | URL 為房間識別來源；authReady / loading / anonymous 分離，membership 從後端重建 |
| P1 | 房間頁 76–82、120–154、301–314 | 切歌與播放以舊 snapshot 計算再 updateDoc；切歌、刪目前歌曲、暫停可互相覆蓋 | transaction / version 檢查、明確 play/pause 命令、commandId 去重 |
| P1 | 房間頁 147–154 | 只有 owner 的播放器 ended 會自動切歌；島主離線可能停住，多分頁島主也沒有唯一 leader | leader lease + generation/epoch；ended 帶目前曲目與版本做條件更新 |
| P1 | 房間頁 85–107、Player videoId prop | 新曲一律 loadVideoById，可能令暫停房間開始播放；React prop 與 imperative API 同時載入曲目 | 單一 player adapter 管理載入；暫停使用 cue；載入完成後套用最新狀態 |
| P1 | 房間頁 20–37、同步 effects | server timestamp 搭配本機 Date.now，沒有時鐘偏差估計；5 秒校正只在播放時運行 | 加入時間偏差估計、重連/回前景同步；區分 metadata-only / pending 與已提交 snapshot |
| P1 | 房間頁 snapshot / player effects | 空清單不清除已載入影片；文件不存在沒有明確終止狀態；播放器失敗可能一直 loading | 明確 stop、not-found、denied、error、retry、timeout 與清理流程 |
| P1 | 搜尋與首頁 query effect | 搜尋無取消/序號檢查，較慢舊結果可覆蓋新結果；登出後舊查詢仍可寫回 Redux | AbortController + request sequence；effect cancellation；finally 釋放 loading |
| P1 | 搜尋 NEXT_PUBLIC_YOUTUBE_API_KEY | key 在瀏覽器可見，需確認 API/referrer 限制；沒有看到搜尋速率與配額保護 | 搜尋代理驗證 token、限流與快取，key 置 server-only；確認 Google Console 限制 |
| P2 | optimisticSongs pending 刪除 | 移除 pending 項只隱藏本機狀態，既有 transaction 仍可能成功，歌曲會重新出現 | pending 狀態禁止刪除或以命令狀態實作可追蹤取消 |
| P2 | isShuffle / handleChangeSong | shuffle 只切換圖示，切歌始終依序 | 實作共享播放模式，否則移除假功能 |
| P2 | CustomDialog、PlayerControls、PlaylistItem | 缺表單 label、icon button 名稱、提交中狀態與錯誤回饋；可連點送出 | 語意表單、欄位驗證、disabled、可重試錯誤、鍵盤與讀屏支援 |

## 3. UI 改版 brief

### 不變條件

首頁互動 3D 島嶼是主要元素，保留現有 GLB 與拖曳概念。一般裝置必須呈現真實 3D；只有不支援 WebGL、載入失敗或使用者主動省電時提供靜態替代與重試。不要把「效能改善」變成預設刪除 3D。

### 建議方向（尚未視覺定稿）

「朋友的海上聆聽空間」：保留島嶼的個性，以海霧、墨色、暖白與單一重點色建立層級；減少目前重複玻璃、光暈、極光與巢狀卡片。首頁屬 Experience，房間頁屬 Operate。

- 桌面首頁：3D 約占主視野 60–70%；標題與建立／加入入口使用獨立側欄，不以大玻璃卡遮島。保留清楚的登入與「我的島嶼」。
- 手機首頁：3D 為首屏焦點，主要入口緊接其後；短螢幕容許捲動，避免固定高度與彈窗互相遮擋。
- 房間：現正播放／可互動 YouTube 畫面、佇列、搜尋、成員與權限；桌面雙欄，手機單欄，底部控制列照顧 safe-area。
- 同步狀態：連線中、已同步、正在重新同步、離線、需要點擊啟用音訊。不要顯示無證據的「完美同步」。
- 設計完整狀態：空房、無歌曲、搜尋空結果、加入失敗、無權限、被移出、播放器失效、影片不可播放。
- 繁體中文優先，`html lang` 改 `zh-Hant`；文字、focus、對比、觸控尺寸、鍵盤操作納入驗收。

### Impeccable 流程

已讀取官方 `.agents/skills/impeccable/SKILL.md` 與 shape playbook；本機未安裝 skill launcher，context 未執行。這是依原始碼完成的初步 brief，尚未執行完整視覺方向 workshop 或宣稱完成 impeccable audit。

實作階段先固定版本並安裝專案範圍 skill，記錄 PRODUCT.md（使用者與產品限制），再確認視覺方向並寫 DESIGN.md。依序 shape → 新視覺方向 → 實作 → audit / adapt / optimize → polish；每階段看實際瀏覽器，不僅看 JSX。

## 4. 多人同步建議架構

2–20 人先保留 Firebase，不急著重寫 WebSocket 服務。Firestore 是房間狀態來源，YouTube player 是本機投影，Redux 不承擔授權或持久身分。

建議資料：

- `islands/{id}`：name、ownerUid、permissions、schemaVersion；不含密碼或成員 email。
- 私有 secret 文件：passwordHash，僅受信任後端可讀。
- `members/{uid}`：role、joinedAt、membership 狀態；訪客可用 Firebase anonymous auth 建立 UID。
- `queue/{itemId}`：videoId、title、thumbnail、addedByUid、排序欄位。
- `playback/current`：currentItemId、positionMs、isPlaying、updatedAt、version、leaderUid、leaderEpoch、leaseExpiresAt。

小房 MVP 可先保留有長度上限的 array，修好 identity 與 transaction；若採子集合，必須同時處理刪目前歌曲、排序與 playback 的原子一致性，不能只拆檔。

所有 mutation 經單一命令層：驗證 ID token → membership / 角色 → payload schema → transaction → 新 version。對預期曲目/version 不符的舊命令拒絕或明確重試；commandId 避免重送造成重複操作。client 禁止直接寫 canonical playback，避免與後端命令形成兩個寫入入口。

播放以伺服器提交時間為基準，客戶端估計 clock offset；小誤差不 seek，大誤差與回前景才校正。不要每幀寫 Firestore。leader lease 需受信任時鐘與 transaction 管理，且舊 epoch 不能再推進歌曲。新 leader 接手時重建狀態，不依賴已離線島主收到 ended。

Presence 可用 RTDB onDisconnect + heartbeat；若僅用 Firestore，顯示有 TTL 的「最近在線」，不要當成即時離線真相。離線播放命令不累積重放；重連先讀最新版本。

舊房間需 schema migration：email owner 對應 UID 必須由可信身分核對；不能讓前端自行宣稱 owner。遷移期間雙讀、單寫，先備份，再小批遷移與驗證，最後移除明文密碼及舊寫入權限。

## 5. 效能與可觀測性

- 先建立 production build 基線，再量測 LCP / INP / CLS、首屏 JS、模型下載、GPU frame time 與每房讀寫成本。
- 模型目前約 island 352 KB、bird 1.6 MB、plane 1.4 MB；先 profile 再決定 meshopt / Draco / texture 壓縮，保留模型授權與 attribution。
- 3D 獨立 lazy chunk；島嶼優先，鳥與飛機可延後。限制 DPR，依裝置降特效；靜態島嶼與動畫分離後才能考慮 demand rendering。
- 頁面隱藏時暫停非必要動畫；reduced-motion 同時涵蓋 CSS 與 Three 動畫。Bird 位移與 Island 阻尼改以 delta time 計算，避免不同螢幕更新率改變速度。
- pointer capture / pointercancel，鍵盤事件限定聚焦 3D 區域，避免輸入文字時轉島。
- 拆分巨型房間 page 為 session、queue、search、player adapter；修正目前整份 islandData 依賴讓無關佇列更新也觸發 seek 判斷的問題。
- 記錄匿名化的 drift、重同步、命令衝突、transaction 重試、player error、搜尋配額；不記錄密碼、token 或完整 email。

提議驗收目標：LCP ≤2.5 秒、INP ≤200ms、CLS ≤0.1（需指明裝置與網路）；正常前景、無廣告/緩衝且可播放的 20 人測試中，同步後偏差 p95 ≤1 秒。這些是目標而非已量得的數字。YouTube 廣告、地區限制與 autoplay 阻擋無法承諾樣本級同步。

## 6. 單元、整合與 E2E

使用 Vitest + React Testing Library；Playwright 做 E2E；Firebase Emulator 做權限與 transaction 整合測試。全部使用隔離資料與 emulator，CI 不接正式房。

| 層級 | 必測案例 |
|---|---|
| 單元 | timestamp/clock offset、暫停/播放預期位置、非法數值；角色矩陣；按 itemId 刪除；下一首/空佇列；version 與 command 去重；shuffle |
| 元件 | 加入/建立驗證、重複提交、錯誤重試；權限 disabled；搜尋舊結果不覆蓋；pending 加歌失敗回滾；無障礙名稱 |
| Rules / backend | 非成員不能讀房/寫命令；成員不能改 owner/permission；不能讀 secret；偽造 UID、時間與未知欄位被拒；Admin endpoint 也驗權 |
| 並行整合 | 同首同時新增只出現一次；刪不同歌曲不誤刪；刪目前歌曲與 skip 衝突；兩次 ended 只推進一次；過期 leader 無法寫入 |
| 雙瀏覽器 E2E | 建房→邀請→加入；直接 URL / refresh / auth restore；A 播放 B 收斂；暫停房新加入不自動播放；島主離線接手；斷網/回前景；權限變更 |
| 視覺/裝置 | 首頁真實 WebGL 與拖曳；WebGL 失敗替代；360/390/768/1440 寬度與短螢幕；鍵盤、減少動態、長歌名、超長佇列 |

大多數 E2E 注入可控制的 player adapter，穩定測試事件順序與時鐘；另保留少量真實 YouTube / WebGL smoke tests。mock 通過不代表真實播放器相容。20 個獨立 client 做獨立負載與收斂測試，不以雙分頁取代容量驗證。

CI gate：乾淨 npm ci → ESLint → 單元/整合與 rules → production build → Playwright。提供 test、test:rules、test:e2e scripts、失敗 trace 與可重現 seed。優先讓上述回歸案例失敗再修，不追求無意義的總覆蓋率。

## 7. 建議新增功能

1. 優先：可分享完整邀請連結/QR、成員在線與主持權轉移、同步狀態與「重新同步」、播放失敗與手動啟用音訊。先補齊共同聆聽的基本信任。
2. 第二階段：投票跳歌、每人點歌上限、防洗版、儲存歌單、最近房間。投票需唯一 UID、有效成員分母與重複事件去重。
3. 品牌體驗：自選島嶼日夜與天氣、省電模式、輕量表情互動；不讓裝飾妨礙播放與 3D 效能。
4. AI 排歌僅列實驗：先有明確需求再導入，需配額、費用上限與隱私界線，不把外部 API 增加到第一階段。

## 8. AI 專案規範

建議根目錄加入精簡 AGENTS.md：真實可跑指令、3D 不可移除、UID/membership 授權邊界、時間/版本/去重規則、必跑回歸與禁止接正式資料庫測試。只放專案特有且持久的約束；格式與 lint 交給工具。

文件建議：PRODUCT.md（產品事實）、DESIGN.md（確認後的視覺與元件規則）、本計畫（執行與驗收）、docs/architecture/sync.md（狀態機與協定）、少量 ADR（重大取捨）。有多小時實作需求再加入 PLANS.md 模板，不建立大量重複 AI markdown。

尚未寫入正式 AGENTS.md，避免把本次建議或尚不存在的測試指令當成已確認規範。

官方 OpenAI 指引主張以小而有範圍的規則描述重要不變條件，並將機械檢查交由 CI；AGENTS.md 是可選但可被辨識的專案指引，其他計畫文件是依需要採用的工作慣例。

## 9. 執行順序與交付

| 階段 | 工作 | 完成條件 |
|---|---|---|
| A 基線 | 乾淨安裝重現 build；盤點 audit 可達性；取得正式 rules 對照；建立 emulator 與回歸測試 | build 可重現；已知缺陷有失敗測試；不碰正式資料 |
| B 安全與一致性 | membership / server join / secret 分離；UID；URL 還原；刪錯歌、命令競態、loader 修復 | 越權拒絕；refresh 成功；並行回歸通過 |
| C 同步 | 單一 player adapter；version / 去重；leader 接手；重連與時間校正 | 雙 client 及 20 client 情境達標；真實 YouTube smoke 有紀錄 |
| D UI | 確認 impeccable brief；設計 tokens；3D 首頁與房間重做；手機與無障礙 | 3D 仍為主角；視覺、鍵盤、短螢幕與完整狀態驗收 |
| E 上線準備 | 壓縮/降載；CI；監控；既有房間 migration、備份與回復演練 | 安全/效能/測試 gate 通過；遷移與回復可重現 |

先修回歸風險與安全邊界，再進行依賴安全範圍的增量升級；避免同時升 Next 主版、換狀態庫、換後端與改 UI。每階段獨立可 review，第一階段不加入公開房與大型推薦系統。

## 參考

- Impeccable：https://github.com/pbakaus/impeccable
- OpenAI repository review rules：https://developers.openai.com/blog/custom-code-review-rules-for-codex
- OpenAI workflow conventions：https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
- Firestore rules：https://firebase.google.com/docs/firestore/security/rules-conditions
- Firestore contention：https://firebase.google.com/docs/firestore/transaction-data-contention
- YouTube player API：https://developers.google.com/youtube/iframe_api_reference
