export interface PagedRequest<
  TFilters extends object = Record<string, unknown>,
  TSort = string,
> {
  page?: number;
  size?: number;
  filter?: TFilters;
  sort?: {
    by: TSort;
    direction: "asc" | "desc";
  };
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
