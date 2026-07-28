import { NextRequest, NextResponse } from "next/server";

// Razorpay's Orders API is a plain REST endpoint (Basic Auth with
// key_id:key_secret) — calling it directly avoids adding the `razorpay` npm
// SDK as a dependency for what's otherwise a single POST request.
const KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

export async function POST(req: NextRequest) {
  try {
    if (!KEY_ID || !KEY_SECRET) {
      return NextResponse.json({ error: "Online payment is not configured yet." }, { status: 503 });
    }

    const { amount } = await req.json();
    if (typeof amount !== "number" || !(amount > 0)) {
      return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64"),
      },
      // Razorpay takes the amount in paise, not rupees.
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: `bg_${Date.now()}` }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.description ?? "Could not create payment order." }, { status: 502 });
    }

    return NextResponse.json({ orderId: data.id, amount: data.amount, currency: data.currency, keyId: KEY_ID });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
