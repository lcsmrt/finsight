import { createElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { finsightApi } from "../clients/finsightApi";
import { useRenamePlan, useUpdateMemberRole } from "./usePlanService";

vi.mock("../clients/finsightApi", () => ({
  finsightApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = finsightApi as unknown as {
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  return { queryClient, Wrapper };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRenamePlan", () => {
  it("PUTs to a plan-scoped URL and invalidates the plans query on success", async () => {
    mockedApi.put.mockResolvedValue({
      data: { id: 5, name: "New name", default: false, myRole: "OWNER" },
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(["plans"], [{ id: 5, name: "Old name" }]);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useRenamePlan(), {
      wrapper: Wrapper,
    });

    result.current.mutate({ params: { planId: 5 }, body: { name: "New name" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.put).toHaveBeenCalledWith("/plans/5", {
      name: "New name",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plans"] });
    expect(queryClient.getQueryState(["plans"])?.isInvalidated).toBe(true);
  });
});

describe("useUpdateMemberRole", () => {
  it("PUTs to a plan- and member-scoped URL and invalidates planMembers and plans on success", async () => {
    mockedApi.put.mockResolvedValue({
      data: { userId: 9, name: "Bob", email: "bob@example.com", role: "EDITOR" },
    });

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(["planMembers", 5], []);
    queryClient.setQueryData(["plans"], []);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      params: { planId: 5, userId: 9 },
      body: { role: "EDITOR" },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedApi.put).toHaveBeenCalledWith("/plans/5/members/9", {
      role: "EDITOR",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["planMembers", 5],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["plans"] });
    expect(queryClient.getQueryState(["planMembers", 5])?.isInvalidated).toBe(
      true,
    );
    expect(queryClient.getQueryState(["plans"])?.isInvalidated).toBe(true);
  });

  it("does not invalidate queries when the request fails", async () => {
    mockedApi.put.mockRejectedValue(new Error("network error"));

    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(["planMembers", 5], []);
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateMemberRole(), {
      wrapper: Wrapper,
    });

    result.current.mutate({
      params: { planId: 5, userId: 9 },
      body: { role: "EDITOR" },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(["planMembers", 5])?.isInvalidated).toBe(
      false,
    );
  });
});
