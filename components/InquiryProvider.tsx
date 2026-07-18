"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import InquiryModal from "./InquiryModal";

export interface InquiryPrefill {
  service?: string;
  gender?: "female" | "male";
  type?: "service" | "franchise";
}

interface InquiryContextValue {
  openInquiry: (prefill?: InquiryPrefill) => void;
}

const InquiryContext = createContext<InquiryContextValue | null>(null);

export function useInquiry(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error("useInquiry must be used within InquiryProvider");
  return ctx;
}

export default function InquiryProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState<InquiryPrefill>({});

  function openInquiry(p?: InquiryPrefill) {
    setPrefill(p ?? {});
    setOpen(true);
  }

  return (
    <InquiryContext.Provider value={{ openInquiry }}>
      {children}
      {open && <InquiryModal prefill={prefill} onClose={() => setOpen(false)} />}
    </InquiryContext.Provider>
  );
}
