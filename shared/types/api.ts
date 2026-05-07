/** Standard API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** API error response */
export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Paginated data response */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
