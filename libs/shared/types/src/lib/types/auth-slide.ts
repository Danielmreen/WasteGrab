export type AuthSlide = {
  id: string;
  title: string;
  quote: string;
  author: string | null;
  imageUrl: string;
  imageAlt: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAuthSlideInput = {
  title: string;
  quote: string;
  author?: string | null;
  imageUrl: string;
  imageAlt: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type UpdateAuthSlideInput = Partial<CreateAuthSlideInput>;

export type PublicAuthSlidesResponse = {
  slides: AuthSlide[];
};
