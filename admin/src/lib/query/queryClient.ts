import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/error/apiError";

export const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          if (
            error instanceof ApiError &&
            [400, 401, 403, 404, 409, 422].includes(error.status)
          ) {
            return false;
          }
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
