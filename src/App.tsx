import React, { useEffect } from "react";
import { Routes, Route, useParams, Navigate } from "react-router-dom";
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
import { useUI } from "./contexts/UIContext";

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
    </>
  );
}
