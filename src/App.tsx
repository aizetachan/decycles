import React, { useEffect } from "react";
import { Routes, Route, useParams, Navigate, useLocation } from "react-router-dom";
import { Home } from "./pages/Home";
import { Welcome } from "./pages/Welcome";
import { EditProfile } from "./pages/EditProfile";
import { ResetPassword } from "./pages/ResetPassword";
import { EventPage } from "./pages/EventPage";
import { Favorites } from "./pages/Favorites";
import { MyEvents } from "./pages/MyEvents";

// Admin
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { Users } from "./pages/admin/Users";
import { Creators } from "./pages/admin/Creators";
import { AdminCreatorEdit } from "./pages/admin/AdminCreatorEdit";
import { CategoriesAdmin } from "./pages/admin/CategoriesAdmin";
import { FiltersAdmin } from "./pages/admin/FiltersAdmin";

// Global modals
import { JoinModal } from "./components/modals/JoinModal";
import { CreatorProfileModal } from "./components/modals/CreatorProfileModal";
import { EventModal } from "./components/modals/EventModal";
import { PostModal } from "./components/modals/PostModal";
import { useUI } from "./contexts/UIContext";
import { CookieBanner } from "./components/layout/CookieBanner";
import { useAuth } from "./contexts/AuthContext";
import { Ban } from "lucide-react";

/**
 * Full-screen lock shown when a signed-in user's `users/{uid}.blocked` flag is
 * true. An admin sets this from /admin/users. The flag is live-subscribed in
 * AuthContext, so blocking takes effect immediately on the user's session.
 * Blocked users can still sign out (the only allowed action).
 */
function BlockedScreen() {
  const { logout, userProfile } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white text-center">
      <div className="max-w-md flex flex-col items-center gap-5">
        <Ban className="w-14 h-14 text-red-500" />
        <h1 className="text-2xl font-black uppercase tracking-tighter">Account blocked</h1>
        <p className="text-sm text-gray-400">
          {userProfile?.name ? `${userProfile.name}, your` : "Your"} account has been blocked by an administrator.
          You can't use the platform right now. If you think this is a mistake, please contact support.
        </p>
        <button
          type="button"
          onClick={() => logout()}
          className="px-6 py-3 text-xs font-bold uppercase tracking-widest border-2 border-white hover:bg-white hover:text-black transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/**
 * Backward-compat handler for deep links to /creator/:id. The page is now a
 * modal mounted at app level, so we just open the modal for that id and
 * redirect back to Home — the modal renders on top.
 */
function CreatorDeepLinkRedirect() {
  const { id } = useParams<{ id: string }>();
  const { openCreatorProfile } = useUI();
  useEffect(() => {
    if (id) openCreatorProfile(id);
  }, [id, openCreatorProfile]);
  return <Navigate to="/" replace />;
}

export default function App() {
  const { isDarkMode, isJoinModalOpen, setIsJoinModalOpen } = useUI();
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const gtag = (window as any).gtag;
    if (gtag) {
      gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_title: document.title || "Decycles",
      });
    }
  }, [location]);

  // Hard stop for blocked users — overrides all routes so they can't reach any
  // page (except sign-out, inside BlockedScreen). The reset-password flow is
  // exempt so a blocked user following an email link isn't trapped.
  if (currentUser && userProfile?.blocked && location.pathname !== "/reset-password") {
    return <BlockedScreen />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/event/:creatorId/:eventIdx" element={<EventPage />} />
        <Route path="/creator/:id" element={<CreatorDeepLinkRedirect />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="creators" element={<Creators />} />
          <Route path="creators/new" element={<AdminCreatorEdit />} />
          <Route path="creators/edit/:id" element={<AdminCreatorEdit />} />
          <Route path="categories" element={<CategoriesAdmin />} />
          <Route path="filters" element={<FiltersAdmin />} />
        </Route>
      </Routes>

      {/* Global modals — reachable from any page. */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        isDarkMode={isDarkMode}
      />
      <CreatorProfileModal />
      <EventModal />
      <PostModal />
      <CookieBanner />
    </>
  );
}
