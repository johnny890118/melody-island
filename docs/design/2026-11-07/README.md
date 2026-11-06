# Melody Island · 宇宙共聽改版提案

本次只交付設計決策用原型，未替換首頁、真實房間或同步協定。06 Moon Pass 是內部藝術方向；公開品牌一律為 Melody Island。

## 同步驗收先行

- 最新真實 YouTube 單曲完整量測：634.9 秒、314 個樣本，load 1、play 1、seek 0、倒退超過 0.75 秒 0 次、無非結尾停滯。起播有一筆約 3 秒向前觀測差，並未省略。
- Mac Chrome + 實體 iPhone Safari：超過十分鐘無人工控制的播放窗口、兩次自然接歌、隨後暫停／恢復、手動切至最後一首並自然停止，無再次手機啟用。這是定期實機觀察，不是音訊延遲量測或逐幀 seek 計數。
- 單元測試 121 通過；現有 runtime 6f1bdb1 兩組完整 CI 通過。原始資料與方法見 [驗收記錄](../../verification/pause-resume.md)。實機斷網按要求跳過，仍為尚未驗證。

## Critique 方法與判斷

兩個經使用者授權的獨立代理：A 先做設計評估，完成前沒有看到 B 檢測結果；B 做確定性掃描與瀏覽器證據，父代理最後綜合。首次內建瀏覽器開啟失敗，因此使用既有、隔離的本機 Playwright 測試流程，不操作使用者的 Mac Safari。實際渲染1440×1000、390×844與短螢幕390×600；所有房間自動化資料僅在 demo-melody-island emulator。

首頁24/32、房間22/40，屬可用性啟發式分數，不是原創性或得獎分數。[完整評估](critique.md)。原始碼檢測0項，手機渲染檢測找到10px場景提示過小；斜體 Cormorant 標題為既定品牌的有意選擇。搜尋空結果與503為受控顯示測試，不是供應商可用性通過。

問題不是缺少裝飾：

1. **空間還停在模型展示。** 島嶼、月面、標題沒有共同的抵達動線。應利用實際相機與光線改變尺度關係，而非疊加軌道虛線或光暈。
2. **播放真相分散。** 房間狀態、本機聲音、重試、重新同步分散；應把共用意圖和本機狀態相鄰呈現。
3. **手機加歌太晚。** 標題與重複說明推低歌單。應有明確的現播／接下來層次，以及可達的搜尋入口。
4. **陪伴與管理混合。** 已加入成員可以可見；權限、移除、交接另放管理層。沒有心跳資訊就不能宣稱在線或正在收聽。
5. **「接下來」應有明確意義。** 現播在播放器與固定控制列；待播區只顯示之後的曲目。正式實作仍須保留所有歌單項目的可達性與穩定ID，不在本次改變伺服器語意。

## 三套方案

| | A 月影抵岸 | B 月背劇場 | C 共聽座標 |
| --- | --- | --- | --- |
| 首頁主導構圖 | 近島／遠月，左側安靜入口 | 單一場景居中，低月面建立尺度，文字與入口在下緣 | 居中長景與較小品牌署名，沿下緣分配入口 |
| 真實3D相機 | 斜前近景，建築與鳳凰建立前景 | 由另一側接近，較低視角，保留完整島形 | 較遠、較高視角，留出四周深空 |
| 桌面房間 | 播放器與待播佇列並排，最適合常態共聽 | 中央觀賞，待播歌單向下延展 | 歌單在左、內容在右，偏向共同選歌 |
| 手機房間 | 現播與本機聲音在前，露出下一首 | 聆聽焦點＋單首先看，按需展開全部歌單 | 待播歌單優先，現播與控制保持固定可達 |
| 主要優點 | 操作成熟、最連貫、移轉風險較低 | 最集中於沉浸觀賞，空間與構圖更有戲劇性 | 對手機反覆加歌最直接，社交共編更明顯 |
| 取捨 | 首頁屬連貫演進，原創突破較溫和 | 桌面較需捲動看完整歌單，不適合頻繁編排 | 影片不是手機首屏主角，氛圍較安靜 |

**推薦 A。** 它把首頁的「抵達」與房間的「一起聽」連成同一種產品，且播放器與歌單能同時操作。若更重視手機選歌，C是有意義的替代；B適合把觀賞與空間戲劇性放在第一位。三套保留同一品牌與字體語言，差別在構圖、相機、資訊架構，不是三個配色。

## 預覽與真實功能的邊界

提案入口 `/design-review` 可切換 A/B/C 和首頁／房間；URL可帶 `?concept=b&surface=room`。入口操作只切換示意頁，歌單／搜尋／成員採明確標示的示意資料，不送出 Firebase 或共用播放指令。首頁使用真正 GLB 和可旋轉 WebGL，保留 reduced-motion／分頁隱藏停止與 bounded DPR。

房間播放器區域使用真實歌曲的 YouTube 縮圖作**版面示意**，不是覆蓋 iframe；沒有原生播放器被遮罩封鎖。初次嘗試直接 embed 時出現供應商不可播放畫面，故沒有將它包裝成可播放原型，也不把這些圖當真實同步驗收。正式播放器仍沿用已驗證的官方 IFrame API 和自己的下方控制列，保留必需連結、品牌與廣告。

桌面與手機 PNG 見同目錄 `previews/`；畫面標註提案、非正式版。這些是程式實際渲染截圖，不是AI生成的假裝產品截圖。預覽尚不是正式無障礙／效能驗收，選定後仍需細化 20人成員、100首歌、無權限、失敗、空狀態及長文案。

## 研究與轉譯

- [Spotify Jam 官方說明](https://support.spotify.com/us/article/jam/)：共同歌單與主持人設定有清楚入口。借用任務分組，不複製其畫面，也不推測其同步內部實作。
- [Discord Lofi 官方說明](https://support-apps.discord.com/hc/en-us/articles/26502210208663-Lofi-FAQ)：共同音樂活動可成為朋友在同一個空間的理由。Melody Island只保留已有成員資訊，不新增聊天、假在線、表情或活動功能。
- [Apple Playing Audio](https://developer.apple.com/design/human-interface-guidelines/playing-audio)：保持播放控制意義一致，音量應符合使用者裝置預期。這是web UX轉譯，不是宣稱網頁具備原生背景音訊權限。
- [Lusion 作品與方法](https://lusion.co/)、[設計總監的一手案例](https://www.thenerodesign.com/project/lusion)：品牌、3D、動作形成一個完整敘事。只借用空間整體性，不抄其模型或互動。
- [Immersive Garden · OMEGA ClearSpace](https://immersive-g.com/projects/omega-clearspace/)：團隊案例記載以motion與3D呈現太空任務。用尺度與空間關係建立宇宙感，不新增與共聽無關的資料儀表。

Awwwards直接案例頁在此工具出現timeout／不可取得，故得獎／方法只引用作者一手案例可驗證的內容。當前Lusion網站已更新，不把今天網站當成2023版本的逐頁重現研究。

## 待選定後的實作順序

先確定選案；接著定稿首頁場景與手機構圖，再完成房間現播／待播／本機聲音骨架，最後補搜尋、成員權限與各種失敗狀態。維持local shadcn/ui + Lucide。實作期間同步協定保持隔離，完成後跑既有回歸與實機驗收。

本次到提案即停，不更新 DESIGN.md 為任何未核准新方向，不合併 main，不改正式 Firebase，不部署正式網站。

## Decision-gallery review scope

Independent follow-up: three findings resolved, fixed transport clearance partially resolved. All mobile proposals expose their intended initial task priorities. This is decision-gallery acceptance only, not shipping acceptance. See [review](proposal-review.md). Twelve main captures and six search captures were rendered at1440x1000 and390x844; checks.json retains document widths with no horizontal overflow. Fixed controls in a full-page capture retain their original viewport position. Their appearance over later offscreen content is not proof of final responsive clearance. Full interactions and text scaling remain required after selection.

Room images are explicitly labeled YouTube thumbnail composition mocks, without an iframe or click-blocking mask. Search uses local shadcn/Dialog and Lucide; capture waits for the opening animation. Typecheck, lint and proposal detector passed (0 findings). Prototype interaction state is illustrative and does not mutate real rooms or certify media playback.
