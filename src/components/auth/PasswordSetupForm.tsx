import React, { useState } from "react";
import { PasswordInput } from "./PasswordInput";

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

  const inputClass = `w-full px-4 py-2 border focus:outline-none text-sm font-bold tracking-wider ${
    isDarkMode ? "bg-black text-white border-white/30" : "bg-white text-black border-black/20"
  }`;
  const labelClass = `block text-xs font-bold uppercase tracking-widest mb-1 ${
    isDarkMode ? "text-gray-300" : "text-gray-700"
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
        <PasswordInput
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          name="new-password"
          minLength={MIN_LENGTH}
          show={show}
          onShowChange={setShow}
          disabled={disabled || submitting}
          isDarkMode={isDarkMode}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          name="confirm-new-password"
          minLength={MIN_LENGTH}
          show={show}
          hideToggle
          disabled={disabled || submitting}
          isDarkMode={isDarkMode}
          className={inputClass}
        />
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
