export type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string;
  createdAt?: string;
};

export type Transaction = {
  id: number;
  amount: number;
  description: string | null;
  createdAt: string;
  categoryId: number;
  category: Category | null;
};
