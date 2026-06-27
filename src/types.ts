export type Category = 'All' | 'Products' | 'Bikes & Frames' | 'Components' | 'Accessories' | 'Clothing' | 'Tools' | 'SERVICES' | 'Events' | 'Community' | 'Custom Builds & Repairs' | 'Paintwork' | 'Restorations' | 'Social Riding Groups' | 'Competition Groups' | 'Touring Communities' | 'Cultural Collectives' | 'Social Rides' | 'Competitions' | 'Touring Events' | 'Riding Communities' | 'Bikepacking & Adventure' | 'Culture & Creativity' | 'Cycling Culture' | 'Creative & Media' | string;

export type SubCategory = 
  | 'Bikes & Frames' | 'Road' | 'MTB' | 'Gravel' | 'Track & Fixed' | 'Classic & Vintage' | 'BMX' | 'Urban & Commuter' | 'Cargo & Utility' | 'Folding Bikes' | 'Vintage' | 'E-Bikes' | 'Production' | 'Handmade'
  | 'Carbon' | 'Steel' | 'Titanium'
  | 'frame parts' | 'Forks' | 'Handlebars' | 'Stems' | 'Headsets' | 'Bartapes & barends' | 'Seatposts' | 'Saddles' | 'Wheelsets' | 'Tires' | 'Cranksets & Chainrings' | 'Chains' | 'Bottom Brackets' | 'Derailleurs' | 'Platforms' | 'Straps & Clips'
  | 'Bags & Carrying' | 'Headwear' | 'Racks & Mounts' | 'Locks' | 'Bottles & Cages' | 'Helmets' | 'Electronics' | 'Lights' | 'Storage & Organizers'
  | 'Technical Cycling' | 'Casual & Lifestyle' | 'Shoes'
  | 'Frame Building Tools' | 'Repair & Maintenance Tools' | 'Workshop Equipment'
  | 'Custom Builds & Repairs' | 'Paint & Finishing' | 'Restorations'
  | 'Illustration & Graphic' | 'Photography' | 'Film & Video' | 'Magazine'
  | 'Social Riding Groups' | 'Competition Groups' | 'Touring Communities' | 'Social Rides' | 'Competitions' | 'Touring Events' | 'Expedition Groups' | 'Travel Resource'
  | 'Cycling Culture' | 'Art & Design' | 'Publishing' | 'Community Workshops'
  | 'Workshops' | 'Races' | 'Trails'
  | 'road' | 'mtb' | 'gravel' | 'urban & commuter' | 'classic & vintage' | 'Performance Groups' | 'Adventure & Touring' | 'Urban & Commuting'
  | 'expedition groups' | 'travel resources' | 'route libraries' | 'expedition diaries'
  | 'art & design' | 'publishing & media' | 'film & photography' | 'cycling culture projects'
  | 'community workshops' | 'cycling education' | 'advocacy & social impact' | 'local hubs'
  | 'Visual Artists & Illustrators' | 'Photographers & Videomakers' | 'Editorial & Publishing'
  | 'frame building' | 'classic bikes' | '80\'s & 90\'s MTB' | 'bespoke accessories'
  | 'Learning & Education'
  | string;

export interface Creator {
  id: string;
  name: string;
  description: string;
  website: string;
  socials?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  profileImage?: string;
  coverImage: string;
  gallery: any[];
  categories: Category[];
  subCategories?: SubCategory[];
  location: string;
  country: string;
  address?: string;
  coordinates?: [number, number];
  eventDate?: string; // ISO format date string e.g. "2026-05-15"
  endDate?: string; // ISO format date string e.g. "2026-05-16"
  recurringEvent?: string; // e.g. "first_friday_of_month"
  creatorName?: string;
  creatorImage?: string;
  creatorId?: string;
  views?: number;
  isPublished?: boolean;
  events?: any[];
  filters?: string[];
  /** Cached follower count, maintained by the syncFollowCounts function. */
  followersCount?: number;
}

/** What kind of entity is being followed (selects the target collection). */
export type FolloweeType = "creator" | "user";

/**
 * A follow relationship. Doc id is `{followerId}_{followeeId}`. Whether someone
 * is followed is answered by this doc's existence — `followeeType` only records
 * WHAT is followed (a creator/shop or a user) so we know which collection it is.
 */
export interface Follow {
  followerId: string;
  followeeId: string;
  followeeType: FolloweeType;
  createdAt?: any;
}

/** Who authored a post — a creator/shop or a regular user. */
export type AuthorType = "creator" | "user";

/**
 * A wall/feed post. Author name & image are denormalized so the feed renders
 * without an extra read per post. likesCount is maintained by a trigger.
 */
export interface Post {
  id: string;
  authorId: string;
  authorType: AuthorType;
  authorName: string;
  authorImage?: string;
  text: string;
  imageUrl?: string;
  createdAt?: any;
  likesCount?: number;
}
