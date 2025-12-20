import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient, useSession, signOut } from "../lib/api-client";

// 获取当前会话和用户信息
export function useAuth() {
  const { data: session, isPending, error, refetch } = useSession();

  return {
    user: session?.user,
    session,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error,
    refetch, // 手动刷新 session 的方法
  };
}

// 登出 Hook
export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      await signOut();
    },
  });
}

// 更新用户信息 Hook
export function useUpdateUser() {
  return useMutation({
    mutationFn: async (data: {
      name?: string;
      avatarUrl?: string;
      phone?: string;
      locale?: "zh-CN" | "en-US";
      vocabularyLevel?:
        | "primary_school"
        | "middle_school"
        | "high_school"
        | "cet4"
        | "cet6"
        | "ielts_toefl"
        | "gre";
    }) => {
      const res = await apiClient.api.users.me.$patch({
        json: data,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          (errorData as { error?: string }).error || "Update failed"
        );
      }

      return await res.json();
    },
  });
}

// 获取当前用户详细信息 Hook
export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await apiClient.api.users.me.$get();

      if (!res.ok) {
        throw new Error("Failed to fetch user");
      }

      return await res.json();
    },
  });
}
