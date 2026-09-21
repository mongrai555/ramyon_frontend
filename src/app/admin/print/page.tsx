"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { readPrintJob, ackPrintJob, PrintJob } from "@/lib/printQrTent";

/**
 * The tent card that stands on the table, on a page of its own.
 *
 * It used to be written into a blank window with document.write. That window
 * stayed script-connected to the dashboard, which means the browser ran both
 * on one thread — so the print dialog froze the dashboard behind it, and the
 * floor stopped updating until the card tab was closed. Opening a real URL
 * with `noopener` hands the card its own process, and the dashboard keeps
 * polling while someone stands at the printer.
 *
 * The card's data arrives through localStorage rather than the URL: a QR image
 * is far too big for a query string, and this page needs no login of its own.
 */
function Card() {
  const params = useSearchParams();
  const key = params.get("k");

  const [job, setJob] = useState<PrintJob | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!key) {
      setMissing(true);
      return;
    }
    ackPrintJob(key); // tells the dashboard the tab really opened
    const found = readPrintJob(key);
    if (found) setJob(found);
    else setMissing(true);
  }, [key]);

  if (missing) {
    return (
      <div className="sheet">
        <p className="note">
          ไม่พบการ์ดที่จะพิมพ์ — กลับไปกดพิมพ์การ์ดโค้ดจากหน้าโต๊ะอีกครั้ง
        </p>
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="sheet">
      <div className="tent">
        <div className="awning" />
        <div className="body">
          <p className="korean">라면 언니</p>
          <p className="shop">รามยอนออนนี่</p>
          <div className="code">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={job.qr}
              alt=""
              // Print only once the code has actually rendered, or the sheet
              // comes out of the printer with an empty white square.
              onLoad={() => window.print()}
            />
          </div>
          <p className="how">
            เปิดกล้องมือถือส่องที่โค้ดนี้
            <br />
            เมนูของโต๊ะคุณจะเปิดขึ้นมาเอง
          </p>
          <p className="table">
            <span>โต๊ะ</span>
            <strong>{job.tableNumber}</strong>
          </p>
        </div>
        <div className="awning" />
      </div>

      <button type="button" className="again" onClick={() => window.print()}>
        พิมพ์อีกครั้ง
      </button>

      <style dangerouslySetInnerHTML={{ __html: CSS }} />
    </div>
  );
}

export default function PrintTentPage() {
  return (
    <Suspense fallback={null}>
      <Card />
    </Suspense>
  );
}

const CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: #f7f1e8;
    font-family: "IBM Plex Sans Thai", system-ui, sans-serif;
    color: #2b1a15;
  }
  .sheet {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 18px;
    padding: 24px;
  }
  .note { font-size: 14px; color: #6d574d; text-align: center; }
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
  .korean { font-size: 12px; font-weight: 600; color: #e53935; margin: 0; }
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
  .how { margin: 16px 0 0; font-size: 13px; line-height: 1.6; color: #6d574d; }
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
  .again {
    border: 1px solid #e6dbd0;
    background: #fff;
    border-radius: 8px;
    padding: 9px 18px;
    font: inherit;
    font-size: 13px;
    cursor: pointer;
  }
  @media print {
    body { background: #fff; }
    .sheet { min-height: 0; padding: 0; gap: 0; }
    .tent { border: none; }
    .again { display: none; }
  }
`;
