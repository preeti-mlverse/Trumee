import "server-only";

/**
 * Transactional email via Resend's HTTP API. Without RESEND_API_KEY the email is
 * printed to the server console so every flow still works locally.
 */
export async function sendEmail(msg: { to: string; subject: string; html: string; replyTo?: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Trumee <orders@trumee.in>";
  if (!key) {
    console.log(`\n✉️  [email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)}\n`);
    return { ok: true, dev: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, reply_to: msg.replyTo }),
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
    return { ok: res.ok };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false };
  }
}

const wrap = (title: string, body: string) => `
<div style="background:#f4ede3;padding:32px 12px;font-family:Helvetica,Arial,sans-serif;color:#1f1b16">
  <div style="max-width:560px;margin:0 auto;background:#fbf8f3;padding:32px">
    <p style="font-family:Georgia,serif;font-style:italic;font-size:30px;margin:0 0 24px">trumee</p>
    <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="font-size:12px;color:#72685d;margin-top:32px;border-top:1px solid #e3d8c8;padding-top:16px">
      Questions? Just reply to this email or WhatsApp us. — Team Trumee
    </p>
  </div>
</div>`;

export const templates = {
  orderConfirmation(o: {
    number: number;
    name: string;
    items: { title: string; variantTitle: string | null; quantity: number; price: number }[];
    total: number;
    paymentMethod: string;
    url: string;
  }) {
    const rows = o.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0;font-size:14px">${i.title}<br><span style="color:#72685d;font-size:12px">${i.variantTitle ?? ""} × ${i.quantity}</span></td><td style="text-align:right;font-size:14px">₹${((i.price * i.quantity) / 100).toLocaleString("en-IN")}</td></tr>`,
      )
      .join("");
    return {
      subject: `Order #${o.number} confirmed`,
      html: wrap(
        `Thank you, ${o.name.split(" ")[0]}!`,
        `<p style="font-size:14px;line-height:1.6">We’ve received your order <b>#${o.number}</b> and are getting it ready. We’ll email you tracking details as soon as it ships.</p>
         <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}
         <tr><td style="padding-top:12px;border-top:1px solid #e3d8c8;font-weight:bold">Total ${o.paymentMethod === "cod" ? "(pay on delivery)" : "paid"}</td><td style="padding-top:12px;border-top:1px solid #e3d8c8;text-align:right;font-weight:bold">₹${(o.total / 100).toLocaleString("en-IN")}</td></tr></table>
         <a href="${o.url}" style="display:inline-block;background:#1f1b16;color:#fbf8f3;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase">View your order</a>`,
      ),
    };
  },
  shipped(o: { number: number; name: string; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }) {
    return {
      subject: `Order #${o.number} is on its way`,
      html: wrap(
        "Your order has shipped",
        `<p style="font-size:14px;line-height:1.6">Hi ${o.name.split(" ")[0]}, good news — order <b>#${o.number}</b> is on its way${o.carrier ? ` with ${o.carrier}` : ""}.</p>
         ${o.trackingNumber ? `<p style="font-size:14px">Tracking number: <b>${o.trackingNumber}</b></p>` : ""}
         ${o.trackingUrl ? `<a href="${o.trackingUrl}" style="display:inline-block;background:#1f1b16;color:#fbf8f3;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase">Track package</a>` : ""}`,
      ),
    };
  },
  abandonedCart(o: { url: string; items: { title: string }[]; code?: string }) {
    return {
      subject: "You left something beautiful behind",
      html: wrap(
        "Still thinking it over?",
        `<p style="font-size:14px;line-height:1.6">Your bag is saved: ${o.items.map((i) => i.title).join(", ")}.</p>
         ${o.code ? `<p style="font-size:14px">Use code <b>${o.code}</b> for a little something off.</p>` : ""}
         <a href="${o.url}" style="display:inline-block;background:#1f1b16;color:#fbf8f3;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase">Return to your bag</a>`,
      ),
    };
  },
  passwordReset(o: { url: string }) {
    return {
      subject: "Reset your Trumee password",
      html: wrap(
        "Reset your password",
        `<p style="font-size:14px;line-height:1.6">Tap the button below to choose a new password. This link expires in 1 hour.</p>
         <a href="${o.url}" style="display:inline-block;background:#1f1b16;color:#fbf8f3;padding:12px 22px;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase">Reset password</a>`,
      ),
    };
  },
  reviewRequest(o: { name: string; number: number; items: { title: string; url: string }[] }) {
    return {
      subject: "How are you loving your Trumee pieces?",
      html: wrap(
        `Hi ${o.name.split(" ")[0]}, how’s the fit?`,
        `<p style="font-size:14px;line-height:1.6">Your order #${o.number} arrived a few days ago. A quick review helps other women find their size and style — it takes under a minute.</p>
         ${o.items.map((i) => `<p style="margin:10px 0"><a href="${i.url}#reviews" style="color:#6b2a5a">Review “${i.title}” →</a></p>`).join("")}`,
      ),
    };
  },
  refund(o: { number: number; amount: number }) {
    return {
      subject: `Refund processed for order #${o.number}`,
      html: wrap(
        "Your refund is on its way",
        `<p style="font-size:14px;line-height:1.6">We’ve refunded <b>₹${(o.amount / 100).toLocaleString("en-IN")}</b> for order #${o.number}. It usually reaches your account in 5–7 business days.</p>`,
      ),
    };
  },
};
