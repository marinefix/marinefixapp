export type Category = {
  id: string;
  name: string;
  slug: string;
  department: string;
  parent_id: string | null;
  order_index: number;
  icon: string | null;
};

export type Equipment = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  guide_count?: number;
};

export type Guide = {
  id: string;
  equipment_id: string;
  category_id?: string;
  title: string;
  symptom: string | null;
  safety_ppe: string[] | null;
  tools_required: string[] | null;
  introduction: string | null;
  is_approved?: boolean;
  created_at: string;
  image_url?: string;
  safety_precautions?: string[];
  steps?: { step_number?: number; instruction: string; tip?: string }[];
};

export type GuideStep = {
  id: string;
  guide_id: string;
  step_number: number;
  title: string;
  instruction: string;
  warning: string | null;
};

export type GuideImage = {
  id: string;
  guide_id: string;
  caption: string | null;
  url: string;
  order_index: number;
};

export type GuideWithRelations = Guide & {
  steps: GuideStep[];
  images: GuideImage[];
  equipment?: Equipment;
};

export type Bookmark = {
  id: string;
  guide_id: string;
  created_at: string;
};