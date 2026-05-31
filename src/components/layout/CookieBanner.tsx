import React, { useState, useEffect } from "react";
import { useT } from "../../contexts/LanguageContext";
import { useUI } from "../../contexts/UIContext";
import { X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function CookieBanner() {
  const { t } = useT();
  const { isDarkMode } = useUI();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given or declined
    try {
      const consent = localStorage.getItem("decycles-cookie-consent");
      if (!consent) {
        // Show banner after a slight delay for smoother entry
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // If localStorage fails (e.g., incognito / iframe restrictions), show banner
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("decycles-cookie-consent", "accepted");
    } catch (e) {}

    // Update Google Analytics consent to granted
    const gtag = (window as any).gtag;
    if (gtag) {
      gtag("consent", "update", {
        analytics_storage: "granted",
      });
    }
    setIsVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("decycles-cookie-consent", "declined");
    } catch (e) {}

    // Ensure it remains denied
    const gtag = (window as any).gtag;
    if (gtag) {
      gtag("consent", "update", {
        analytics_storage: "denied",
      });
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-[9999] p-5 border-2 brutalist-shadow ${
            isDarkMode 
              ? "bg-zinc-950 text-white border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]" 
              : "bg-white text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-1.5 border-2 shrink-0 ${isDarkMode ? "border-white bg-zinc-900" : "border-black bg-gray-100"}`}>
              <ShieldCheck className="w-5 h-5 text-[var(--color-rad-neon)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-display tracking-wider text-lg mb-1.5">
                {t("cookies.title") || "COOKIES CONSENT"}
              </h4>
              <p className={`text-xs font-medium leading-relaxed mb-4 ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>
                {t("cookies.body") || "We use cookies to analyze web traffic and customize your experience. Do you accept their use?"}
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={handleAccept}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border-2 brutalist-shadow transition-colors ${
                    isDarkMode
                      ? "bg-[var(--color-rad-neon)] text-black border-white hover:bg-lime-400"
                      : "bg-[var(--color-rad-neon)] text-black border-black hover:bg-lime-400"
                  }`}
                >
                  {t("cookies.accept") || "ACCEPT"}
                </button>
                <button
                  onClick={handleDecline}
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest border-2 brutalist-shadow transition-colors ${
                    isDarkMode
                      ? "bg-black text-white border-white hover:bg-zinc-900"
                      : "bg-white text-black border-black hover:bg-gray-100"
                  }`}
                >
                  {t("cookies.decline") || "DECLINE"}
                </button>
              </div>
            </div>
            <button
              onClick={handleDecline}
              title="Close and decline"
              className={`p-1 border-2 transition-colors ${
                isDarkMode ? "border-transparent hover:border-white text-gray-400 hover:text-white" : "border-transparent hover:border-black text-gray-500 hover:text-black"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
