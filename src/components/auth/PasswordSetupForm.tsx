import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordSetupFormProps {
  isDarkMode: boolean;
  // Submit handler. Receives the validated password. Throw to surface an error.
  onSubmit: (newPassword: string) => Promise<void>;
  // Button copy. e.g. "Reset password" / "Create password".
  submitLabel: string;
  // Optional disabled state from the parent (e.g. while verifying the reset code).
  disabled?: boolean;
}

const MIN_LENGTH = 6;

export const PasswordSetupForm: React.FC<PasswordSetupFormProps> = ({
  isDarkMode,
  onSubmit,
  submitLabel,
  disabled = false,
}) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passwords are case-sensitive — no `uppercase` transform here, otherwise
  // toggling "show password" would misrepresent what the user actually typed.
  const inputClass = `w-full px-4 py-2 border focus:outline-none text-sm font-bold normal-case tracking-wider ${
    isDarkMode ? "bg-black text-white border-white/30" : "bg-white text-black border-black/20"
  } pr-10`;
  const labelClass = `block text-xs font-bold uppercase tracking-widest mb-1 ${
    isDarkMode ? "text-gray-300" : "text-gray-700"
  }`;
  const eyeBtnClass = `absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-opacity ${
    isDarkMode ? "text-white/60 hover:text-white" : "text-black/50 hover:text-black"
  }`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass}>New password</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            disabled={disabled || submitting}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            title={show ? "Hide password" : "Show password"}
            className={eyeBtnClass}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            required
            minLength={MIN_LENGTH}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            disabled={disabled || submitting}
          />
        </div>
      </div>

      {error && (
        <div className={`px-3 py-2 text-xs font-bold border-2 ${
          isDarkMode ? "border-red-500/50 text-red-400 bg-red-500/10" : "border-red-500/50 text-red-600 bg-red-50"
        }`}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || submitting}
        className={`w-full py-3 brutalist-border brutalist-shadow font-bold uppercase tracking-widest text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
          isDarkMode ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
        }`}
      >
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
};
