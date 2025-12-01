export type MenuItem = {
  title: string;
  price: string;
  description?: string;
  unit?: string;
  notes?: string;
  category: string;
  superCategory?: string;
  quantity?: string;
};

export type MenuData = {
  items: MenuItem[];
  updatedAt: number;
};
