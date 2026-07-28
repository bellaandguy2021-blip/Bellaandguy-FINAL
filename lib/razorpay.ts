// Loads Razorpay's Checkout.js once and reuses it on repeat calls, since it
// isn't an npm package — it's a script the browser fetches directly from
// Razorpay and attaches to `window`.
let loadPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window !== "undefined" && (window as any).Razorpay) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => { loadPromise = null; resolve(false); };
    document.body.appendChild(script);
  });
  return loadPromise;
}

export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface OpenRazorpayCheckoutArgs {
  keyId: string;
  orderId: string;
  amountPaise: number;
  name: string;
  description: string;
  prefill: { name: string; contact: string; email?: string };
  onSuccess: (result: RazorpayPaymentResult) => void;
  onDismiss: () => void;
}

/** Opens the Razorpay Checkout modal. Assumes loadRazorpayScript() already resolved true. */
export function openRazorpayCheckout(args: OpenRazorpayCheckoutArgs) {
  const RazorpayCtor = (window as any).Razorpay;
  const rzp = new RazorpayCtor({
    key: args.keyId,
    amount: args.amountPaise,
    currency: "INR",
    name: args.name,
    description: args.description,
    order_id: args.orderId,
    prefill: args.prefill,
    theme: { color: "#C9A84C" },
    handler: (response: RazorpayPaymentResult) => args.onSuccess(response),
    modal: { ondismiss: args.onDismiss },
  });
  rzp.open();
}
