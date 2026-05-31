import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, isDarkMode }) => {
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
          <h2 className={`text-lg font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>Contact Us</h2>
          <button 
            onClick={onClose}
            className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 prose prose-sm max-w-none space-y-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Say Hello</h3>
            <p className="text-base leading-relaxed">
              Got a question, a suggestion, or just want to talk bikes? We'd love to hear from you. Drop us a line and let's keep the wheels turning.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Email</h3>
            <a href="mailto:contact@decyclesteam.com" className={`text-base font-bold transition-colors ${isDarkMode ? "text-white hover:text-gray-300" : "text-black hover:text-gray-600"}`}>
              contact@decyclesteam.com
            </a>
          </div>
        </div>
      </motion.div>
    </>
  );
};
