import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { trackEvent } from "../../lib/analytics";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, isDarkMode }) => {
  if (!isOpen) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`fixed inset-y-0 right-0 z-[101] w-full sm:w-[400px] shadow-2xl flex flex-col ${
          isDarkMode ? "bg-black" : "bg-white"
        }`}
      >
        <div className={`p-6 flex items-center justify-between`}>
          <h2 className={`text-lg font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>Support Us</h2>
          <button 
            onClick={onClose}
            className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 prose prose-sm max-w-none space-y-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Fuel the Ride</h3>
            <p className="text-base leading-relaxed">
              DECYCLES.CC is a passion project dedicated to independent cycling culture. We run on coffee, late nights, and the love for handbuilt bikes.
            </p>
            <p className="text-base leading-relaxed mt-2">
              If you find value in our curated database and want to help us keep the wheels turning, consider buying us a coffee or making a small contribution. Every bit helps us maintain the servers and continue discovering amazing creators worldwide.
            </p>
          </div>

          <div className="pt-4">
            <a 
              href="https://buymeacoffee.com" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent("click_support_platform", { support_platform: "buy_me_a_coffee" })}
              className={`block w-full text-center text-sm font-bold uppercase tracking-widest px-6 py-4 border transition-colors ${
                isDarkMode 
                  ? "bg-white text-black hover:bg-zinc-200 border-white" 
                  : "bg-black text-white hover:bg-zinc-800 border-black"
              }`}
            >
              Buy Me a Coffee
            </a>
          </div>
        </div>
      </motion.div>
    </>
  );
};
