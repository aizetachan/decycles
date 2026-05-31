import { Category, SubCategory } from "../types";

export const CATEGORIES: Category[] = [
  "All",
  "Products",
  "SERVICES",
  "Creative & Media",
  "Community",
  "Events",
];

// What a creator/admin can actually pick (no "All").
export const SELECTABLE_CATEGORIES: Category[] = [
  "Products",
  "SERVICES",
  "Creative & Media",
  "Community",
  "Events",
];

export const PRODUCT_CATEGORIES: Category[] = [
  "Bikes & Frames",
  "Components",
  "Accessories",
  "Clothing",
  "Tools",
];

export const SERVICE_CATEGORIES: Category[] = [
  "Custom Builds & Repairs",
  "frame building",
  "Restorations",
  "Paint & Finishing",
];

export const EVENT_CATEGORIES: Category[] = [
  "Competitions",
  "Social Rides",
  "Touring",
  "Workshops",
  "Festivals",
];

// Visual identifier for each event category — drives the colored dot in the
// calendar chip and the category badge inside the event modal. Picked to be
// readable on both the dark and light map themes.
export const EVENT_CATEGORY_COLORS: Record<string, string> = {
  "Competitions": "#ef4444",  // red
  "Social Rides": "#f59e0b",  // amber
  "Touring": "#3b82f6",       // blue
  "Workshops": "#10b981",     // emerald
  "Festivals": "#a855f7",     // purple
};

export const COLLECTIVE_CATEGORIES: Category[] = [
  "Cycling Culture",
  "Riding Groups",
  "Performance Groups",
  "Bikepacking & Adventure",
  "Learning & Education",
];

export const ARTS_CATEGORIES: Category[] = [
  "Visual Artists & Illustrators",
  "Photographers & Videomakers",
  "Editorial & Publishing",
];

export type FilterGroup = { groupName: string; options: SubCategory[] };
export type FilterItem = SubCategory | FilterGroup;

export const SUBCATEGORIES: Record<string, FilterItem[]> = {
  "Bikes & Frames": [
    { groupName: "Build", options: ["Production", "Handmade"] },
    { groupName: "Material", options: ["Carbon", "Steel", "Titanium"] },
    { groupName: "Category", options: ["Road", "MTB", "Gravel", "Urban & Commuter", "Cargo & Utility", "BMX", "Track & Fixed", "Classic & Vintage", "Folding Bikes", "E-Bikes"] },
  ],
  Components: [
    { groupName: "Frameset", options: ["frame parts", "Forks"] },
    { groupName: "Cockpit", options: ["Handlebars", "Stems", "Headsets", "Bartapes & barends"] },
    { groupName: "Seatposts & Saddles", options: ["Seatposts", "Saddles"] },
    { groupName: "Wheels", options: ["Wheelsets", "Tires"] },
    { groupName: "Drivetrain", options: ["Cranksets & Chainrings", "Chains", "Bottom Brackets", "Derailleurs"] },
    { groupName: "Pedals", options: ["Platforms", "Straps & Clips"] },
  ],
  Accessories: [
    { groupName: "Category", options: ["Bags & Carrying", "Racks & Mounts", "Locks", "Bottles & Cages", "Helmets", "Electronics", "Lights", "Storage & Organizers"] },
  ],
  Clothing: [
    { groupName: "Category", options: ["Technical Cycling", "Casual & Lifestyle", "Headwear", "Shoes"] },
  ],
  Tools: [
    { groupName: "Category", options: ["Frame Building Tools", "Repair & Maintenance Tools", "Workshop Equipment"] },
  ],
  Products: [
    { groupName: "Category", options: ["Bikes & Frames", "Components", "Accessories", "Clothing", "Tools"] },
  ],
  SERVICES: [
    { groupName: "Category", options: ["Custom Builds & Repairs", "frame building", "Restorations", "Paint & Finishing"] },
  ],
  Competitions: [
    { groupName: "Category", options: ["Road races", "Gravel Races", "MTB Races", "Track Races", "Endurance & Ultra", "Fun & Community Races"] },
  ],
  Events: [
    { groupName: "Category", options: ["Competitions", "Social Rides", "Touring", "Workshops", "Festivals"] },
  ],
  Community: [
    { groupName: "Category", options: ["Cycling Culture", "Riding Groups", "Performance Groups", "Bikepacking & Adventure", "Learning & Education"] },
  ],
  "Creative & Media": [
    { groupName: "Category", options: ["Visual Artists & Illustrators", "Photographers & Videomakers", "Editorial & Publishing"] },
  ],
  "frame building": [
    { groupName: "Material", options: ["Carbon", "Steel", "Titanium"] },
  ],
};

export const getFlattenedSubcategories = (category: string): SubCategory[] => {
  const items = SUBCATEGORIES[category];
  if (!items) return [];
  return items.flatMap(item => typeof item === "string" ? item : item.options);
};
