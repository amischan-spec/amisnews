# 香港晨讀 · Morning Dispatch(Netlify 免費寄存版)

一個香港每日新聞網站。抓取 RSS 的工作在**伺服器端**完成(部署在 Netlify),
網頁只呼叫自己的後台 `/api/news`,因此不經第三方公開中繼、不受防爬蟲影響、自動跟轉址,穩定可靠。
排程功能(cron)每 2 小時自動更新一次快取,所以每天早上打開即是當日最新。

**費用:HK$0**(全在 Netlify 免費額度內)。唯一可選開支是自訂域名。

---

## 檔案結構
```
hk-news/
├─ netlify.toml              設定(發佈目錄、函式、/api/news 轉址)
├─ package.json              專案資料(無外部套件)
├─ public/
│  └─ index.html             網頁本身
└─ netlify/
   ├─ lib/aggregate.mjs      抓取 + 解析所有 RSS(要加減傳媒,改這裡)
   └─ functions/
      ├─ news.mjs            /api/news:即時回傳新聞 JSON
      └─ refresh.mjs         排程(每 2 小時自動更新快取)
```

---

## 部署步驟(全程用瀏覽器,毋須安裝任何程式)

### 一、放上 GitHub
1. 沒有 GitHub 帳戶就先註冊(免費):https://github.com/signup
2. 開新 repository:https://github.com/new
   - Repository name 填 `hk-news`(隨意)
   - 選 **Public**,其餘留空,按 **Create repository**
3. 在新 repo 頁面,按 **uploading an existing file**(或 Add file → Upload files)。
   把本資料夾 `hk-news` 裡的**所有檔案與資料夾**(連同 `netlify/`、`public/` 子資料夾)
   一併拖入,然後按 **Commit changes**。
   ※ 用瀏覽器拖整個資料夾即可保留子資料夾結構。

### 二、連接 Netlify 部署
4. 註冊 Netlify(免費),建議用 GitHub 帳戶登入:https://app.netlify.com/signup
5. 進入後按 **Add new site → Import an existing project**
6. 選 **Deploy with GitHub**,授權後揀剛才的 `hk-news` repo
7. 部署設定(通常會自動填好,確認一下):
   - **Build command**:留空
   - **Publish directory**:`public`
   - Functions 會自動偵測到 `netlify/functions`
8. 按 **Deploy site**。等一兩分鐘,完成後會給你一個網址,例如
   `https://隨機名.netlify.app` —— 開啟即見新聞。

### 三、(可選)改個好記的網址
- Site configuration → Site details → **Change site name**,
  可改成例如 `your-name-hk-news.netlify.app`。

### 四、(可選)用自己的域名
- Domain management → **Add a domain**,跟指示把域名指向 Netlify 即可。
- 域名約 HK$90–120/年(.com)或 HK$250/年(.hk),向任何註冊商購買皆可。

---

## 確認排程有效
部署後到 Netlify 後台 **Functions** 或 **Logs**,會見到 `refresh` 這個 scheduled function。
它每 2 小時(UTC)自動執行一次,讓快取保持新鮮。時間用 UTC;香港時間 = UTC + 8。
即使排程未跑,網頁每次打開時 `/api/news` 也會即時抓取,所以一定有當日新聞。

---

## 想加入更多傳媒 / 頻道
只需編輯 `netlify/lib/aggregate.mjs` 最上方的 `FEEDS` 陣列,加一行:
```js
{ outlet: "傳媒名稱", cat: "分類名", url: "https://該傳媒的RSS.xml" }
```
存檔後在 GitHub 重新 commit,Netlify 會自動重新部署。
目前已內建:RTHK(本地/財經/大中華/國際/體育)、明報(即時港聞/經濟/國際)。

---

## 常見問題
- **某一欄顯示「暫時無法載入」**:該傳媒的 feed 一時無回應,其餘照常顯示;稍後或按「重新整理」即可。
- **想更新更頻密**:把 `netlify/functions/refresh.mjs` 內的 `"0 */2 * * *"` 改成例如 `"0 * * * *"`(每小時)。
- **新聞來源版權**:本站只顯示各傳媒公開 RSS 提供的標題與摘要,並連回原文,屬 RSS 的正常用途。
