import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN    ?? "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const OWNER_PHONE     = process.env.OWNER_WHATSAPP_PHONE     ?? "919999601212";
const API_VERSION     = "v20.0";

function fmt12h(t: string) {
  if (!t) return t;
  const [hStr, mStr] = t.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 || 12}:${mStr ?? "00"} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDate(d: string) {
  if (!d) return d;
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function buildMessage(b: {
  id?: number | string;
  full_name: string;
  phone: string;
  service: string;
  booking_date: string;
  booking_time: string;
  is_home_service: boolean;
  address?: string | null;
  notes?: string | null;
}) {
  const id   = b.id ? `BG-${String(b.id).padStart(5, "0")}` : "—";
  const type = b.is_home_service ? "🏠 Home Service" : "🏛 At Salon";

  const lines = [
    "🔔 *New Booking Received*",
    "━━━━━━━━━━━━━━━━━━━━",
    `📋 *Booking ID:* ${id}`,
    `👤 *Customer Name:* ${b.full_name}`,
    `📱 *Phone Number:* +91${b.phone}`,
    `✂️ *Service:* ${b.service}`,
    `📍 *Booking Type:* ${type}`,
    `📅 *Date:* ${fmtDate(b.booking_date)}`,
    `⏰ *Time:* ${fmt12h(b.booking_time)}`,
  ];

  if (b.is_home_service && b.address) {
    lines.push(`🗺️ *Address:* ${b.address}`);
  }

  if (b.notes) {
    lines.push(`📝 *Special Note:* ${b.notes}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━");

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { booking } = await req.json();
    if (!booking) {
      return NextResponse.json({ ok: false, error: "No booking data" }, { status: 400 });
    }

    if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
      console.warn("[whatsapp] WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not set");
      return NextResponse.json({ ok: false, error: "WhatsApp not configured" });
    }

    const message = buildMessage(booking);

    // Strip leading + if present — Meta expects digits only
    const to = OWNER_PHONE.replace(/^\+/, "");

    console.log(`[whatsapp] Sending to ${to} via WhatsApp Cloud API`);

    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = await res.json().catch(() => ({}));
    console.log("[whatsapp] Meta response:", res.status, JSON.stringify(data));

    if (!res.ok) {
      const errMsg = data?.error?.message ?? JSON.stringify(data);
      return NextResponse.json({ ok: false, error: errMsg }, { status: 502 });
    }

    return NextResponse.json({ ok: true, msgId: data?.messages?.[0]?.id });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] ERROR:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
