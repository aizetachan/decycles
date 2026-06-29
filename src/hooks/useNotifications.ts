import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { isMockMode } from "../lib/previewMock";
import type { Notification } from "../types";

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "like", actorId: "mock-shop-2", actorName: "Vetra Cycles", actorImage: "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=100&h=100&q=80", postId: "mock-3", read: false, createdAt: new Date(Date.now() - 6e5) },
  { id: "n2", type: "follow", actorId: "mock-user-1", actorName: "María G.", actorImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&h=100&q=80", read: false, createdAt: new Date(Date.now() - 36e5) },
  { id: "n3", type: "mention", actorId: "mock-shop-3", actorName: "Gritline Paintwork", actorImage: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=100&h=100&q=80", postId: "mock-5", read: true, createdAt: new Date(Date.now() - 864e5) },
];

/** Live in-app notifications for the signed-in user (newest first). */
export function useNotifications() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const mock = isMockMode();

  useEffect(() => {
    if (mock) {
      setItems(MOCK_NOTIFICATIONS);
      return;
    }
    if (!currentUser) {
      setItems([]);
      return;
    }
    const q = query(
      collection(db, `users/${currentUser.uid}/notifications`),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    const unsub = onSnapshot(
      q,
      (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]),
      (err) => console.error("notifications subscription error", err),
    );
    return () => unsub();
  }, [currentUser?.uid, mock]);

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = async () => {
    const unread = items.filter((n) => !n.read);
    if (!unread.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true }))); // optimistic
    if (mock || !currentUser) return;
    await Promise.all(
      unread.map((n) =>
        updateDoc(doc(db, `users/${currentUser.uid}/notifications/${n.id}`), { read: true }).catch(() => {}),
      ),
    );
  };

  return { items, unreadCount, markAllRead };
}
