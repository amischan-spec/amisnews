// 排程功能(cron):每 2 小時自動叫一次 /api/news,令快取保持新鮮,
// 咁就算冇人開過個網頁,每朝(以至全日)都已經備好當日最新內容。
// 時間用 UTC;"0 */2 * * *" = 每 2 小時的 0 分。香港時間 = UTC + 8。
export const config = { schedule: "0 */2 * * *" };

export default async () => {
  try {
    await fetch(`${process.env.URL}/api/news`, { headers: { "x-warm": "1" } });
  } catch (e) {
    // 即使一時失敗都唔緊要,下一次排程或下一位訪客都會重新整理。
  }
  return new Response("warmed");
};
