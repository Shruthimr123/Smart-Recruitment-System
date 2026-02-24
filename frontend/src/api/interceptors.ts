import { toast } from "sonner";

let isRedirecting = false;

export const addInactiveUserInterceptor = (instance: any) => {
  instance.interceptors.response.use(
    (response: any) => response,
    (error: any) => {
      const status = error.response?.status;
      const message = error.response?.data?.message?.toLowerCase();
      const currentPath = window.location.pathname;

      //  Skip redirect if on reset-password page
      const isResetPasswordPage = currentPath.startsWith("/reset-password");

      if (!isRedirecting && currentPath !== "/login" && !isResetPasswordPage) {
        if (status === 401) {
          isRedirecting = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.replace("/login");
        } else if (status === 403 && message?.includes("inactive")) {
          isRedirecting = true;
          toast.error("Your account is inactive. Please contact admin.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.replace("/login");
        }
      }

      return Promise.reject(error);
    }
  );
};
