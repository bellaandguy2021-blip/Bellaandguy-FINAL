import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";

// Confirms a checkout result actually came from Razorpay (and wasn't just a
// browser-side success callback someone could fake) by recomputing the HMAC
// Razorpay signs order_id|payment_id with, using the secret key that never
// leaves the server.
export async function POST(req: NextRequest) {
  try {
    if (!KEY_SECRET) {
      return NextResponse.json({ verified: false, error: "Online payment is not configured yet." }, { status: 503 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ verified: false, error: "Missing payment details." }, { status: 400 });
    }

    const expected = crypto
      .createHmac("sha256", KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const verified = expected === razorpay_signature;
    return NextResponse.json({ verified });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ verified: false, error: msg }, { status: 500 });
  }
}
