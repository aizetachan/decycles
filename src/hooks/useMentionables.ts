import { useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export interface Mentionable {
  id: string;
  type: "creator" | "user";
  name: string;
  image?: string;
}

/**
 * Lazy source of @mention candidates — registered creators (shops) and users.
 * `load()` fetches once on first use (e.g. when the composer sees an "@").
 */
export function useMentionables() {
  const [items, setItems] = useState<Mentionable[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    setLoaded(true);
    try {
      const [creatorsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, "creators")),
        getDocs(collection(db, "users")),
      ]);
      const creators: Mentionable[] = creatorsSnap.docs.map((d) => {
        const c = d.data() as any;
        return { id: d.id, type: "creator", name: c.name, image: c.profileImage || c.coverImage };
      });
      const users: Mentionable[] = usersSnap.docs.map((d) => {
        const u = d.data() as any;
        return { id: d.id, type: "user", name: u.name, image: u.profileImage };
      });
      setItems([...creators, ...users].filter((m) => m.name));
    } catch (err) {
      console.error("Failed to load mention candidates", err);
      setLoaded(false); // allow retry
    }
  }, [loaded]);

  return { items, load };
}
