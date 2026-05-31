import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Creator } from '../types';

export function useCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live subscription — any add/update/delete in the creators collection
  // (including newly published events nested inside a creator doc) propagates
  // to all open clients without a page reload.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'creators'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Creator[];
        setCreators(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to creators: ', err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  // Kept for compatibility with any callers that explicitly refetch — the
  // onSnapshot subscription keeps `creators` fresh on its own.
  const fetchCreators = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'creators'));
      const creatorsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Creator[];
      setCreators(creatorsList);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching creators: ", err);
      setError(err.message);
    }
  };

  const getCreator = async (id: string): Promise<Creator | null> => {
    try {
      const docRef = doc(db, 'creators', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Creator;
      }
      return null;
    } catch (err: any) {
      console.error("Error fetching creator:", err);
      throw err;
    }
  };

  const addCreator = async (creatorData: Omit<Creator, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'creators'), creatorData);
      return docRef.id;
    } catch (err: any) {
      console.error("Error adding creator:", err);
      throw err;
    }
  };

  const updateCreator = async (id: string, creatorData: Partial<Creator>) => {
    try {
      const docRef = doc(db, 'creators', id);
      await updateDoc(docRef, creatorData);
    } catch (err: any) {
      console.error("Error updating creator:", err);
      throw err;
    }
  };

  const deleteCreator = async (id: string) => {
    try {
      const docRef = doc(db, 'creators', id);
      await deleteDoc(docRef);
    } catch (err: any) {
      console.error("Error deleting creator:", err);
      throw err;
    }
  };

  return {
    creators,
    loading,
    error,
    fetchCreators,
    getCreator,
    addCreator,
    updateCreator,
    deleteCreator
  };
}
