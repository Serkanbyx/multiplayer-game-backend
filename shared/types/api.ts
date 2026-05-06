/** Standart API yanıt sarmalayıcısı */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** API hata yanıtı */
export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Sayfalanmış veri yanıtı */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
