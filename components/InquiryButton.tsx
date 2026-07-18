"use client";
import { MessageCircleQuestion } from "lucide-react";
import { useInquiry, InquiryPrefill } from "./InquiryProvider";

interface InquiryButtonProps extends InquiryPrefill {
  variant?: "outline" | "text" | "floating";
  label?: string;
  className?: string;
}

export default function InquiryButton({
  service, gender, type = "service", variant = "outline", label, className,
}: InquiryButtonProps) {
  const { openInquiry } = useInquiry();
  const defaultLabel = type === "franchise" ? "Franchise Enquiry" : "Ask About This Service";

  return (
    <button
      className={`iqb-${variant} ${className ?? ""}`}
      onClick={() => openInquiry({ service, gender, type })}
    >
      <MessageCircleQuestion size={variant === "text" ? 13 : 15} />
      {variant === "floating"
        ? <span className="iqb-floating-label">{label ?? defaultLabel}</span>
        : (label ?? defaultLabel)}
    </button>
  );
}
