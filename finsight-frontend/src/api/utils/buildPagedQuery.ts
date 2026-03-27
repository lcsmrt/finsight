import { PagedRequest } from "../dtos";

export function buildPagedQuery(params?: PagedRequest<object>): string {
  if (!params) return "";

  const query = new URLSearchParams();
  const { page, size, sort, filter } = params;

  if (page !== undefined) query.set("page", String(page));
  if (size !== undefined) query.set("size", String(size));
  if (sort) {
    query.set("sortBy", String(sort.by));
    query.set("sortDirection", sort.direction);
  }
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
  }

  return query.toString();
}
