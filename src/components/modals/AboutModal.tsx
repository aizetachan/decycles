import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, isDarkMode }) => {
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
          <h2 className={`text-lg font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`}>About DECYCLES.CC</h2>
          <button 
            onClick={onClose}
            className={`p-2 brutalist-border brutalist-shadow transition-colors ${isDarkMode ? "bg-black text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-black hover:text-white"}`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className={`p-4 sm:p-6 overflow-y-auto flex-1 prose prose-sm max-w-none space-y-6 ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Our Mission</h3>
            <p className="text-base leading-relaxed">
              DECYCLES.CC is a curated, worldwide database dedicated to independent bicycle creators, framebuilders, component makers, and cycling communities.
            </p>
            <p className="text-base leading-relaxed mt-2">
              Our mission is to highlight the craftsmanship, passion, and innovation found within the independent cycling community. We believe in the power of custom products and the unique stories behind every brand.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Our Vision</h3>
            <p className="text-base leading-relaxed">
              Whether you are looking for a custom steel frame, unique clothing, or specialized components, DECYCLES.CC connects you with the artisans who pour their heart into every piece they create. We aim to be the central hub for discovering the finest independent cycling brands globally.
            </p>
          </div>

          <div>
            <h3 className={`text-lg font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-white" : "text-black"}`}>Get Involved</h3>
            <p className="text-base leading-relaxed">
              If you are a creator or know someone who should be featured, please use the "Join" button to submit an application.
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
};
