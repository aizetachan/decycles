import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { Header } from "../components/layout/Header";
import { PasswordSetupForm } from "../components/auth/PasswordSetupForm";

/**
 * Landing page for the password-reset link in the Firebase email.
 *
 * The link looks like:
 *   /reset-password?mode=resetPassword&oobCode=XXX&apiKey=...&lang=en
 * We only care about `mode` and `oobCode`.
 */
export function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { isDarkMode, openJoinModal } = useUI();
  const { verifyResetCode, completePasswordReset } = useAuth();

  const oobCode = params.get("oobCode") || "";
  const mode = params.get("mode") || "";

  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");
  const [email, setEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode || mode !== "resetPassword") {
      setVerifyState("invalid");
      setErrorMsg("This password reset link is invalid or has expired.");
      return;
    }
    let cancelled = false;
    setVerifyState("verifying");
    (async () => {
      try {
        const verifiedEmail = await verifyResetCode(oobCode);
        if (cancelled) return;
        setEmail(verifiedEmail);
        setVerifyState("valid");
      } catch (err: any) {
        if (cancelled) return;
        setVerifyState("invalid");
        setErrorMsg(
          err?.code === "auth/expired-action-code"
            ? "This reset link has expired. Request a new one."
            : err?.code === "auth/invalid-action-code"
            ? "This reset link is invalid or has already been used. Request a new one."
            : "We couldn't verify this reset link. Try requesting a new one.",
        );
      }
    })();
    return () => { cancelled = true; };
  }, [oobCode, mode, verifyResetCode]);

  const handleSubmit = async (newPassword: string) => {
    await completePasswordReset(oobCode, newPassword);
    setDone(true);
  };

  const titleClass = `text-xl md:text-2xl font-bold uppercase tracking-widest ${isDarkMode ? "text-white" : "text-black"}`;
  const bodyClass = `text-sm font-bold ${isDarkMode ? "text-gray-400" : "text-gray-500"}`;
  const primaryBtnClass = `w-full py-3 brutalist-border brutalist-shadow font-bold uppercase tracking-widest text-sm transition-colors ${
    isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
  }`;
  const subBtnClass = `text-xs font-bold uppercase tracking-widest hover:underline ${isDarkMode ? "text-gray-400" : "text-gray-500"}`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${isDarkMode ? "bg-black text-white" : "bg-white text-black"}`}>
      <Header />

      <main className="max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col">
        <div className={`w-full max-w-xl mx-auto flex-1 flex flex-col brutalist-border brutalist-shadow mb-12 ${isDarkMode ? "bg-black" : "bg-white"}`}>
          {/* Header bar — same pattern as EditProfile */}
          <div className={`p-4 md:p-6 border-b-2 ${isDarkMode ? "border-white/20" : "border-black/20"}`}>
            <h1 className={titleClass}>
              {done ? "Password updated" : verifyState === "invalid" ? "Link invalid" : "Reset your password"}
            </h1>
            <p className={`mt-2 ${bodyClass}`}>
              {done
                ? "Your password has been changed. You can now sign in with your new password."
                : verifyState === "verifying"
                ? "One moment, verifying your reset link..."
                : verifyState === "invalid"
                ? errorMsg
                : email
                ? <>Choose a new password for <span className={isDarkMode ? "text-white" : "text-black"}>{email}</span>.</>
                : "Choose a new password."}
            </p>
          </div>

          {/* Body */}
          <div className="p-4 md:p-6 flex flex-col gap-6">
            {done ? (
              <button
                type="button"
                onClick={() => {
                  navigate("/", { replace: true });
                  openJoinModal("signin");
                }}
                className={primaryBtnClass}
              >
                Continue to login
              </button>
            ) : verifyState === "verifying" ? (
              <div className="flex items-center justify-center py-8">
                <svg className={`animate-spin h-6 w-6 ${isDarkMode ? "text-white" : "text-black"}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : verifyState === "invalid" ? (
              <button
                type="button"
                onClick={() => {
                  navigate("/", { replace: true });
                  openJoinModal("signin");
                }}
                className={primaryBtnClass}
              >
                Back to login
              </button>
            ) : (
              <>
                <PasswordSetupForm
                  isDarkMode={isDarkMode}
                  onSubmit={handleSubmit}
                  submitLabel="Reset password"
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => navigate("/", { replace: true })}
                    className={subBtnClass}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
