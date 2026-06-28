import { collection, addDoc, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { uploadImage } from "./upload";
import type { AuthorType } from "../types";

export interface CreatePostInput {
  uid: string;
  /** users/{uid}.role — "creator" posts as their shop, otherwise as the user. */
  role?: string;
  userName?: string;
  userImage?: string;
  text: string;
  imageFiles?: File[];
}

/**
 * Create a feed post. The author identity (name + image) is denormalized onto
 * the post so the feed renders without an extra read per post. A creator posts
 * as their shop (name/logo from creators/{uid}); everyone else as their user.
 * An optional image is uploaded under posts/{uid}/ (compressed by uploadImage).
 */
export async function createPost(input: CreatePostInput): Promise<void> {
  const { uid, role, userName, userImage, text, imageFiles = [] } = input;
  const body = text.trim();
  if (!body && imageFiles.length === 0) return; // nothing to post

  let authorType: AuthorType = "user";
  let authorName = userName || "User";
  let authorImage = userImage || "";

  if (role === "creator") {
    try {
      const snap = await getDoc(doc(db, "creators", uid));
      if (snap.exists()) {
        const c = snap.data() as any;
        authorType = "creator";
        authorName = c.name || authorName;
        authorImage = c.profileImage || c.coverImage || authorImage;
      }
    } catch {
      /* fall back to the user identity */
    }
  }

  const imageUrls: string[] = [];
  for (const file of imageFiles) {
    imageUrls.push(await uploadImage(file, `posts/${uid}`));
  }

  await addDoc(collection(db, "posts"), {
    authorId: uid,
    authorType,
    authorName,
    authorImage: authorImage || null,
    text: body,
    ...(imageUrls.length ? { imageUrls } : {}),
    createdAt: serverTimestamp(),
    likesCount: 0,
  });
}
