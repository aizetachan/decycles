import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * The ONE password field for the whole app — every password input (sign in,
 * sign up, reset, set password) must use this component instead of a raw
 * <input type="password">.
 *
 * Why: passwords are case-sensitive and must reach Firebase exactly as typed.
 * When the "show password" eye flips the field to type="text", mobile
 * keyboards (iOS / Android) start auto-capitalising the first letter and
 * auto-correcting words. Users then end up with an account password like
 * "Bici2024" when they typed "bici2024", and can't log in later. The
 * attributes below switch all of that off in both states, and the value is
 * never transformed (no trim / case change).
 */

/** Attributes that stop keyboards/browsers from altering what the user types. */
const NO_ALTERATION_PROPS = {
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;

/** Same protection for email fields (Firebase emails are case-insensitive, but
 *  autocorrect / a trailing space from the keyboard still breaks sign-in). */
export const EMAIL_INPUT_PROPS = {
  ...NO_ALTERATION_PROPS,
  type: "email",
  inputMode: "email",
  autoComplete: "email",
  // Show the email exactly as typed, overriding the brutalist `uppercase`.
  style: { textTransform: "none" },
} as const;

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  /** "current-password" for sign in, "new-password" when creating/changing one. */
  autoComplete: "current-password" | "new-password";
  isDarkMode: boolean;
  /** Visual classes for the input (any `uppercase` is neutralised). */
  className?: string;
  name?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Controlled visibility — lets a confirm field follow the main field's eye. */
  show?: boolean;
  onShowChange?: (show: boolean) => void;
  /** Hide the eye button (e.g. on a confirm field driven by `show`). */
  hideToggle?: boolean;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  autoComplete,
  isDarkMode,
  className = "",
  name,
  required = true,
  minLength,
  disabled,
  autoFocus,
  show: showProp,
  onShowChange,
  hideToggle = false,
}) => {
  const [showLocal, setShowLocal] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const show = showProp ?? showLocal;
  const setShow = (next: boolean) => {
    if (onShowChange) onShowChange(next);
    else setShowLocal(next);
  };

  // Desktop: warn when Caps Lock is on — the other classic way a capital
  // letter sneaks into a password unnoticed.
  const trackCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsLock(e.getModifierState("CapsLock"));
  };

  return (
    <div>
      <div className="relative">
        <input
          {...NO_ALTERATION_PROPS}
          type={show ? "text" : "password"}
          name={name}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          disabled={disabled}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          onBlur={() => setCapsLock(false)}
          className={`${className} ${hideToggle ? "" : "pr-10"}`}
          style={{ textTransform: "none" }}
        />
        {!hideToggle && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            title={show ? "Hide password" : "Show password"}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-opacity ${
              isDarkMode ? "text-white/60 hover:text-white" : "text-black/50 hover:text-black"
            }`}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {capsLock && (
        <p className={`mt-1 text-xs font-bold ${isDarkMode ? "text-yellow-300" : "text-yellow-700"}`}>
          ⚠ Caps Lock is on
        </p>
      )}
    </div>
  );
};
