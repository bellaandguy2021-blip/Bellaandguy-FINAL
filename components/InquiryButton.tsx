"use client";
import { MessageCircleQuestion } from "lucide-react";
import { useInquiry, InquiryPrefill } from "./InquiryProvider";
import { useCart } from "./CartProvider";

interface InquiryButtonProps extends InquiryPrefill {
  variant?: "outline" | "text" | "floating";
  label?: string;
  className?: string;
}

export default function InquiryButton({
  service, gender, type = "service", variant = "outline", label, className,
}: InquiryButtonProps) {
  const { openInquiry } = useInquiry();
  // The mobile cart bar sits fixed at the very bottom of the screen once the
  // cart has items — nudge this floating button up so it doesn't overlap.
  const { count } = useCart();
  const defaultLabel = type === "franchise" ? "Franchise Enquiry" : "Ask About This Service";

  return (
    <button
      className={`iqb-${variant} ${variant === "floating" && count > 0 ? "iqb-cart-open" : ""} ${className ?? ""}`}
      onClick={() => openInquiry({ service, gender, type })}
    >
      <MessageCircleQuestion size={variant === "text" ? 13 : 15} />
      {variant === "floating"
        ? <span className="iqb-floating-label">{label ?? defaultLabel}</span>
        : (label ?? defaultLabel)}
    </button>
  );
}
