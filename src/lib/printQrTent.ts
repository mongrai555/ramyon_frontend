/**
 * The tent card that stands on the table. This is the only thing the shop
 * prints, so it carries the brand on paper: the awning stripe top and bottom,
 * the Korean name above the Thai one, the code big enough to scan from a
 * seated arm's length, and the table number large enough to read across the
 * room when staff are matching cards back to tables.
 */
export function printQrTent(qrDataUrl: string, tableNumber: string) {
  const win = window.open("", "_blank");
  if (!win) return false;

  win.document.write(`<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <title>โต๊ะ ${tableNumber} — รามยอนออนนี่</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f7f1e8;
        font-family: "IBM Plex Sans Thai", system-ui, sans-serif;
        color: #2b1a15;
      }
      .tent {
        width: 320px;
        background: #fff;
        border: 1px solid #e6dbd0;
        overflow: hidden;
      }
      .awning {
        height: 7px;
        background: repeating-linear-gradient(
          114deg,
          #e53935 0 13px,
          #fff6ec 13px 26px
        );
      }
      .body { padding: 26px 24px 22px; text-align: center; }
      .korean {
        font-size: 12px;
        font-weight: 600;
        color: #e53935;
        margin: 0;
      }
      .shop {
        font-family: "Bai Jamjuree", system-ui, sans-serif;
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.01em;
        margin: 4px 0 0;
      }
      .code {
        margin: 20px auto 0;
        width: 232px;
        height: 232px;
        border: 1px solid #e6dbd0;
        border-radius: 8px;
        padding: 10px;
        background: #fff;
      }
      .code img { width: 100%; height: 100%; display: block; }
      .how {
        margin: 16px 0 0;
        font-size: 13px;
        line-height: 1.6;
        color: #6d574d;
      }
      .table {
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #e6dbd0;
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 8px;
      }
      .table span { font-size: 13px; color: #9a877c; }
      .table strong {
        font-family: "Bai Jamjuree", system-ui, sans-serif;
        font-size: 40px;
        font-weight: 700;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
      @media print {
        body { background: #fff; }
        .tent { border: none; }
      }
    </style>
  </head>
  <body>
    <div class="tent">
      <div class="awning"></div>
      <div class="body">
        <p class="korean">라면 언니</p>
        <p class="shop">รามยอนออนนี่</p>
        <div class="code"><img src="${qrDataUrl}" alt="" /></div>
        <p class="how">เปิดกล้องมือถือส่องที่โค้ดนี้<br />เมนูของโต๊ะคุณจะเปิดขึ้นมาเอง</p>
        <p class="table"><span>โต๊ะ</span><strong>${tableNumber}</strong></p>
      </div>
      <div class="awning"></div>
    </div>
    <script>
      window.onload = function () {
        window.print();
        setTimeout(function () { window.close(); }, 500);
      };
    </script>
  </body>
</html>`);
  win.document.close();
  return true;
}

export default printQrTent;
