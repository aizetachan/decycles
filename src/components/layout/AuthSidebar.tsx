import React from "react";
import { useNavigate } from "react-router-dom";
import { X, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../../contexts/AuthContext";

interface AuthSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

export function AuthSidebar({ isOpen, onClose, isDarkMode }: AuthSidebarProps) {
  const { logout, currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 h-full w-full sm:w-[400px] z-50 brutalist-border-l overflow-y-auto ${
              isDarkMode ? "bg-black text-white" : "bg-white text-black"
            }`}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold uppercase tracking-widest">My Account</h2>
                <button
                  onClick={onClose}
                  className={`p-2 brutalist-border brutalist-shadow transition-colors ${
                    isDarkMode ? "hover:bg-white/10" : "hover:bg-black/10"
                  }`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className={`p-6 border-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
                  <div className="flex items-center gap-4 mb-4">
                    {userProfile?.profileImage ? (
                      <img src={userProfile.profileImage} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2" />
                    ) : (
                      <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${isDarkMode ? "bg-white/10" : "bg-black/10"}`}>
                        <UserIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg">{userProfile?.name || "User"}</h3>
                      <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-600"}`}>{currentUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      onClose();
                      navigate('/');
                    }}
                    className="w-full mt-4 p-3 font-bold uppercase tracking-widest border-2 transition-colors bg-red-500 text-white border-red-500 hover:bg-red-600"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
