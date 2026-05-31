import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  EmailAuthProvider,
  linkWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";
import { stripUndefined } from "../lib/upload";
import { setUserProperties } from "../lib/analytics";
import { randomUserAvatar } from "../lib/defaultAvatars";

interface AuthContextType {
  currentUser: User | null;
  userProfile: any | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, firstName: string, lastName: string, role?: string) => Promise<void>;
  loginWithGoogle: (role?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: any) => Promise<void>;
  // Password recovery + linking
  requestPasswordReset: (email: string) => Promise<void>;
  verifyResetCode: (oobCode: string) => Promise<string>;
  completePasswordReset: (oobCode: string, newPassword: string) => Promise<void>;
  setPasswordForCurrentUser: (newPassword: string) => Promise<void>;
  hasPasswordProvider: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const formatGoogleName = (displayName: string | null | undefined): string => {
  if (!displayName) return "";
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // If there is no user we are done loading. If there is one, we keep
      // loading=true until the userProfile is fetched (handled below) so that
      // ProtectedRoute does not evaluate the role with a null profile.
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        setUserProperties({
          user_role: "anonymous",
          has_shop: "false",
        });
      }
    });
    // Hard safety net so the app never gets stuck on a spinner.
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    const docRef = doc(db, "users", currentUser.uid);

    // Subscribe (not one-shot read) so role flips made by an admin from
    // /admin/users propagate live to the affected user's session.
    const unsubscribe = onSnapshot(
      docRef,
      async (docSnap) => {
        if (cancelled) return;

        // Doc may not exist yet during a signup/loginWithGoogle race —
        // those flows call setUserProfile themselves once setDoc finishes.
        if (!docSnap.exists()) {
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        setUserProfile(data);
        setLoading(false);

        if (data) {
          setUserProperties({
            user_role: (data.role || "user") as any,
            has_shop: data.role === "creator" ? "true" : "false",
          });
        }

        // Keep the cached ID token's `admin` claim aligned with the Firestore
        // role. The syncAdminClaim Cloud Function mirrors role → claim, but
        // the token has a 1h TTL and won't pick up a fresh claim mid-session
        // without a forced refresh. The function is async, so on a fresh
        // promotion we retry briefly with backoff to give it time to land.
        try {
          const tokenResult = await currentUser.getIdTokenResult();
          const claimAdmin = tokenResult.claims.admin === true;
          const docAdmin = data.role === "admin";
          if (docAdmin === claimAdmin) return;
          for (let i = 0; i < 5; i++) {
            if (cancelled) return;
            await currentUser.getIdToken(true);
            const fresh = await currentUser.getIdTokenResult();
            if ((fresh.claims.admin === true) === docAdmin) return;
            await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          }
        } catch (refreshErr) {
          console.warn("Token refresh check failed:", refreshErr);
        }
      },
      (err) => {
        console.error("Error subscribing to user profile:", err);
        if (!cancelled) setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [currentUser]);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signup = async (
    email: string,
    pass: string,
    firstName: string,
    lastName: string,
    role: string = "user"
  ) => {
    // createUserWithEmailAndPassword throws auth/email-already-in-use if the
    // email is taken — we never overwrite an existing account.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile = {
      firstName,
      lastName,
      // Keep `name` derived for any legacy reads (Header, CreatorGrid fallbacks).
      name: `${firstName} ${lastName}`.trim(),
      email,
      role,
      // Email/password sign-up has no source photo, so we hand them a random
      // bundled avatar so the UI never has to deal with an empty profileImage.
      // The user can change it later from EditProfile.
      profileImage: randomUserAvatar(),
      bio: "",
      favorites: [] as string[],
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, "users", userCredential.user.uid), newProfile);
    setUserProfile(newProfile);
  };

  const loginWithGoogle = async (role?: string) => {
    const result = await signInWithPopup(auth, googleProvider);
    const docRef = doc(db, "users", result.user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // Existing user — sign them in WITHOUT overwriting their stored data.
      // Critical so that an admin (or creator) doesn't get demoted by signing
      // in via the "Join as Creator/User" button.
      setUserProfile(docSnap.data());
      return;
    }

    // First time — create the doc with the requested role (defaults to "user").
    const display = result.user.displayName?.trim() || "";
    const parts = display.split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    const newProfile = {
      firstName,
      lastName,
      name: formatGoogleName(result.user.displayName),
      email: result.user.email || "",
      // Prefer the user's Google photo. Fall back to a random bundled avatar
      // for accounts that have no Google photo (rare, but possible).
      profileImage: result.user.photoURL || randomUserAvatar(),
      role: role || "user",
      favorites: [] as string[],
      createdAt: new Date().toISOString(),
    };
    setUserProfile(newProfile);
    await setDoc(docRef, newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (data: any) => {
    if (!currentUser) return;
    await setDoc(doc(db, "users", currentUser.uid), stripUndefined(data), { merge: true });
    setUserProfile((prev: any) => ({ ...prev, ...data }));
  };

  // Send the standard Firebase password reset email. The link in the email
  // bounces the user back to /reset-password on this same origin.
  const requestPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: false,
    });
  };

  const verifyResetCode = async (oobCode: string) => {
    return verifyPasswordResetCode(auth, oobCode);
  };

  const completePasswordReset = async (oobCode: string, newPassword: string) => {
    await confirmPasswordReset(auth, oobCode, newPassword);
  };

  // Used by Google-only users who want to also be able to sign in with
  // email+password. Requires the user to be signed in via Google first.
  const setPasswordForCurrentUser = async (newPassword: string) => {
    if (!currentUser) throw new Error("You must be signed in to set a password.");
    if (!currentUser.email) throw new Error("Your account has no email on file.");
    const credential = EmailAuthProvider.credential(currentUser.email, newPassword);
    await linkWithCredential(currentUser, credential);
    // Force-refresh providerData so the UI hides the "Add password" button.
    await currentUser.reload();
    setCurrentUser(auth.currentUser);
  };

  const hasPasswordProvider = !!currentUser?.providerData?.some(
    (p) => p.providerId === "password",
  );

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    signup,
    loginWithGoogle,
    logout,
    updateUserProfile,
    requestPasswordReset,
    verifyResetCode,
    completePasswordReset,
    setPasswordForCurrentUser,
    hasPasswordProvider,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
