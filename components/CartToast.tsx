"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";

export default function CartToast({ message }: { message: string | null }) {
  return (
    <>
      <style>{`
        .ct-wrap {
          position: fixed; top: 20px; left: 50%; z-index: 10001;
          transform: translateX(-50%);
        }
        .ct-toast {
          display: flex; align-items: center; gap: 8px;
          background: #080808; color: #fff; border: 1px solid rgba(201,168,76,0.35);
          border-radius: 30px; padding: 10px 18px 10px 14px;
          font-family: 'Inter', sans-serif; font-size: 12.5px; font-weight: 600;
          box-shadow: 0 12px 32px rgba(0,0,0,0.28);
          white-space: nowrap;
        }
        .ct-check {
          width: 20px; height: 20px; border-radius: 50%; background: rgba(45,143,94,0.2);
          color: #4ade80; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        @media (max-width: 600px) {
          .ct-toast { font-size: 11.5px; padding: 9px 14px 9px 12px; white-space: normal; max-width: 84vw; }
        }
      `}</style>
      <div className="ct-wrap">
        <AnimatePresence>
          {message && (
            <motion.div
              className="ct-toast"
              initial={{ opacity: 0, y: -16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="ct-check"><Check size={12} /></span>
              ✓ {message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
