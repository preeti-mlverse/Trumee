import type { Invoice } from "@/lib/invoice";
import { InvoiceActions } from "./invoice-actions";

const rs = (p: number) => (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** Printable GST tax invoice (A4). "Download PDF" uses the browser's Save-as-PDF. */
export function InvoiceDocument({ inv, backHref }: { inv: Invoice; backHref?: string }) {
  const th = "border border-neutral-300 px-2 py-1.5 text-left font-semibold";
  const td = "border border-neutral-300 px-2 py-1.5 align-top";
  const num = `${td} text-right tabular-nums whitespace-nowrap`;
  return (
    <div className="min-h-dvh bg-neutral-100 print:bg-white py-6 print:py-0 font-ui text-[12px] text-neutral-900">
      <InvoiceActions backHref={backHref} />
      <article className="mx-auto max-w-[820px] bg-white p-8 print:p-0 shadow print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-900 pb-4">
          <div>
            <p className="text-[22px] font-semibold tracking-[0.3em]">TRUMEE</p>
            <p className="mt-1 font-medium">{inv.seller.name}</p>
            <p className="max-w-xs text-neutral-600">{inv.seller.address}</p>
            <p className="mt-1">
              <span className="font-medium">GSTIN:</span> {inv.seller.gstin || "—"} · State: {inv.seller.state} ({inv.seller.stateCode})
            </p>
            <p className="text-neutral-600">{inv.seller.email} · {inv.seller.phone}</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-semibold uppercase">Tax invoice</p>
            <p className="mt-2"><span className="text-neutral-500">Invoice no.</span> {inv.number}</p>
            <p><span className="text-neutral-500">Invoice date</span> {day(inv.date)}</p>
            <p><span className="text-neutral-500">Order no.</span> #{inv.orderNumber}</p>
            <p><span className="text-neutral-500">Payment</span> {inv.payment}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-4 border-b border-neutral-300">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Bill to</p>
            <p className="font-medium mt-1">{inv.buyer.name}</p>
            <p className="text-neutral-700">{inv.buyer.address}</p>
            <p className="text-neutral-700">{inv.buyer.phone} · {inv.buyer.email}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Ship to</p>
            <p className="font-medium mt-1">{inv.shipTo.name}</p>
            <p className="text-neutral-700">{inv.shipTo.address}</p>
            <p className="mt-1"><span className="text-neutral-500">Place of supply:</span> {inv.placeOfSupply}</p>
          </div>
        </section>

        <table className="w-full border-collapse mt-4">
          <thead className="bg-neutral-100">
            <tr>
              <th className={th}>#</th>
              <th className={th}>Item</th>
              <th className={th}>HSN</th>
              <th className={`${th} text-right`}>Qty</th>
              <th className={`${th} text-right`}>Rate</th>
              <th className={`${th} text-right`}>Discount</th>
              <th className={`${th} text-right`}>Taxable value</th>
              <th className={`${th} text-right`}>GST</th>
              {inv.intra ? (
                <>
                  <th className={`${th} text-right`}>CGST</th>
                  <th className={`${th} text-right`}>SGST</th>
                </>
              ) : (
                <th className={`${th} text-right`}>IGST</th>
              )}
              <th className={`${th} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className={td}>{i + 1}</td>
                <td className={td}>{l.description}</td>
                <td className={td}>{l.hsn}</td>
                <td className={num}>{l.qty}</td>
                <td className={num}>{rs(l.unitPrice)}</td>
                <td className={num}>{l.discount ? rs(l.discount) : "—"}</td>
                <td className={num}>{rs(l.taxable)}</td>
                <td className={num}>{l.rate}%</td>
                {inv.intra ? (
                  <>
                    <td className={num}>{rs(l.cgst)}</td>
                    <td className={num}>{rs(l.sgst)}</td>
                  </>
                ) : (
                  <td className={num}>{rs(l.igst)}</td>
                )}
                <td className={num}>{rs(l.total)}</td>
              </tr>
            ))}
            <tr className="font-semibold bg-neutral-50">
              <td className={td} colSpan={5}>Total</td>
              <td className={num}>{inv.totals.discount ? rs(inv.totals.discount) : "—"}</td>
              <td className={num}>{rs(inv.totals.taxable)}</td>
              <td className={td} />
              {inv.intra ? (
                <>
                  <td className={num}>{rs(inv.totals.cgst)}</td>
                  <td className={num}>{rs(inv.totals.sgst)}</td>
                </>
              ) : (
                <td className={num}>{rs(inv.totals.igst)}</td>
              )}
              <td className={num}>{rs(inv.totals.total)}</td>
            </tr>
          </tbody>
        </table>

        <section className="grid grid-cols-2 gap-6 mt-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-500">Tax summary</p>
            <table className="w-full border-collapse mt-1">
              <thead>
                <tr>
                  <th className={th}>GST rate</th>
                  <th className={`${th} text-right`}>Taxable</th>
                  <th className={`${th} text-right`}>{inv.intra ? "CGST + SGST" : "IGST"}</th>
                </tr>
              </thead>
              <tbody>
                {inv.byRate.map((r) => (
                  <tr key={r.rate}>
                    <td className={td}>{r.rate}%</td>
                    <td className={num}>{rs(r.taxable)}</td>
                    <td className={num}>{inv.intra ? `${rs(r.cgst)} + ${rs(r.sgst)}` : rs(r.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-neutral-600">Tax payable on reverse charge: No</p>
          </div>
          <div className="text-right">
            <p className="flex justify-between"><span>Taxable value</span><span className="tabular-nums">₹{rs(inv.totals.taxable)}</span></p>
            <p className="flex justify-between"><span>Total GST</span><span className="tabular-nums">₹{rs(inv.totals.cgst + inv.totals.sgst + inv.totals.igst)}</span></p>
            <p className="flex justify-between text-[15px] font-semibold border-t border-neutral-900 mt-2 pt-2"><span>Invoice total</span><span className="tabular-nums">₹{rs(inv.grandTotal)}</span></p>
            <p className="mt-2 text-left text-neutral-700">{inv.words}</p>
          </div>
        </section>

        <footer className="mt-10 flex items-end justify-between border-t border-neutral-300 pt-4 text-neutral-600">
          <p className="max-w-sm">Prices include GST. Goods once sold are returnable within 7 days of delivery as per our returns policy. This is a computer-generated invoice.</p>
          <p className="text-right">
            For {inv.seller.name}
            <br />
            <span className="inline-block mt-8 border-t border-neutral-400 pt-1">Authorised signatory</span>
          </p>
        </footer>
      </article>
    </div>
  );
}
