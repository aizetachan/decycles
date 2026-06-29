import type { Post } from "../../types";

/**
 * Local-only mock feed, shown when the URL has ?mock=1. Covers the visual /
 * interaction variants so we can review the feed design without live data:
 * shop vs user authors, text-only, image-only, text+image, short vs long copy,
 * recent vs old, and high vs low like counts.
 */
const ago = (ms: number) => new Date(Date.now() - ms);
const MIN = 60_000;
const HR = 60 * MIN;
const DAY = 24 * HR;

const IMG = {
  drop: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80",
  ride: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80",
  workshop: "https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?auto=format&fit=crop&w=1200&q=80",
  logo1: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=100&h=100&q=80",
  logo2: "https://images.unsplash.com/photo-1511994298241-608e28f14fde?auto=format&fit=crop&w=100&h=100&q=80",
  user1: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&h=100&q=80",
  user2: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80",
};

export const MOCK_POSTS: Post[] = [
  {
    id: "mock-1",
    authorId: "mock-shop-1",
    authorType: "creator",
    authorName: "Tunk Bicycles",
    authorImage: IMG.logo1,
    text: "New spring collection just dropped 🌱 Hand-built steel frames, made to ride for decades.",
    imageUrl: IMG.drop,
    createdAt: ago(2 * HR),
    likesCount: 24,
  },
  {
    id: "mock-2",
    authorId: "mock-user-1",
    authorType: "user",
    authorName: "María G.",
    authorImage: IMG.user1,
    text: "Just finished a 120km gravel loop on my new build from @Tunk Bicycles. Legs destroyed, soul restored.",
    mentions: [{ type: "creator", id: "mock-shop-1", name: "Tunk Bicycles" }],
    createdAt: ago(5 * HR),
    likesCount: 8,
  },
  {
    id: "mock-3",
    authorId: "mock-shop-2",
    authorType: "creator",
    authorName: "Vetra Cycles",
    authorImage: IMG.logo2,
    text: "",
    imageUrl: IMG.ride,
    createdAt: ago(1 * DAY),
    likesCount: 3,
  },
  {
    id: "mock-4",
    authorId: "mock-user-2",
    authorType: "user",
    authorName: "Dieter Senft",
    authorImage: IMG.user2,
    text: "A few thoughts after a season of bikepacking the Pyrenees:\n\n1. Tubeless is non-negotiable.\n2. Pack less than you think.\n3. The best route is the one that scares you a little.\n\nAlready planning next year. Who's in?",
    createdAt: ago(3 * DAY),
    likesCount: 0,
  },
  {
    id: "mock-5",
    authorId: "mock-shop-3",
    authorType: "creator",
    authorName: "Gritline Paintwork",
    authorImage: IMG.logo1,
    text: "Workshop tour this Saturday — come see how we paint. Limited spots, first come first served.",
    imageUrls: [IMG.workshop, IMG.drop, IMG.ride],
    createdAt: ago(7 * DAY),
    likesCount: 132,
  },
];
