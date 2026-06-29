import { Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFollow } from "../../hooks/useFollow";
import type { FolloweeType } from "../../types";

interface FollowButtonProps {
  targetId: string;
  targetType: FolloweeType;
  isDarkMode?: boolean;
  /** Called instead of following when the visitor isn't signed in. */
  onRequireAuth?: () => void;
  className?: string;
}

/**
 * Follow / Following toggle for a creator or user profile. Distinct from the
 * ♥ like — this drives the feed. Hidden on your own profile. Signed-out users
 * are routed to onRequireAuth (join/login) instead of following.
 */
export function FollowButton({
  targetId,
  targetType,
  isDarkMode,
  onRequireAuth,
  className = "",
}: FollowButtonProps) {
  const { currentUser } = useAuth();
  const { isFollowing, toggleFollow, loading } = useFollow(targetId, targetType);

  // No follow button on your own profile.
  if (currentUser?.uid === targetId) return null;

  const onClick = () => {
    if (!currentUser) {
      onRequireAuth?.();
      return;
    }
    toggleFollow();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-pressed={isFollowing}
      className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold uppercase tracking-widest brutalist-border transition-colors disabled:opacity-60 ${
        isFollowing
          ? isDarkMode
            ? "bg-transparent text-white hover:bg-white/10"
            : "bg-transparent text-black hover:bg-black/5"
          : isDarkMode
            ? "bg-white text-black hover:bg-gray-200"
            : "bg-black text-white hover:bg-gray-800"
      } ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
