import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../../contexts/UIContext';

interface ProtectedRouteProps {
  requiredRole?: string;
  children?: React.ReactNode;
}

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { currentUser, userProfile, loading } = useAuth();
  const { isDarkMode } = useUI();

  // Treat "logged in but profile still loading" as loading too, otherwise
  // the role check would fail with userProfile=null and bounce the user out.
  if (loading || (currentUser && !userProfile)) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? "bg-black text-white" : "bg-[#F3F4F6] text-black"}`}>
        <div className="animate-spin w-8 h-8 border-4 border-current border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && userProfile?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
