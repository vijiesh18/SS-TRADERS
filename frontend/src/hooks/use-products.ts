import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface Product {
  id: string;
  productCode: string;
  barcode?: string | null;
  name: string;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  subcategoryId?: string | null;
  subcategory?: { id: string; name: string } | null;
  hsnCode?: string | null;
  gstPercentage: string;
  unit: string;
  variant?: string | null;
  shadeCode?: string | null;
  shadeName?: string | null;
  purchasePrice: string;
  sellingPrice: string;
  stockQuantity: string;
  minimumStock: string;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ProductListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  lowStock?: boolean;
}

export function useProducts(params: ProductListParams = {}) {
  return useQuery({
    queryKey: ["products", "list", params],
    queryFn: async () => {
      const { data } = await api.get("/products", { params });
      return data as { items: Product[]; total: number; page: number; limit: number };
    },
  });
}

export interface ProductFormValues {
  productCode: string;
  barcode?: string;
  name: string;
  brandId?: string;
  categoryId?: string;
  subcategoryId?: string;
  hsnCode?: string;
  gstPercentage: number;
  unit: string;
  variant?: string;
  shadeCode?: string;
  shadeName?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minimumStock: number;
  imageUrl?: string;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductFormValues) => {
      const { data } = await api.post("/products", payload);
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProductFormValues> & { id: string }) => {
      const { data } = await api.put(`/products/${id}`, payload);
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data } = await api.delete(`/products/${id}`, { data: { reason } });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ── Categories & Brands ──────────────────────────

export interface Category {
  id: string;
  name: string;
  subcategories?: { id: string; name: string }[];
}

export interface Brand {
  id: string;
  name: string;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await api.get("/products/categories");
      return data as { items: Category[] };
    },
    retry: false,
  });
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data } = await api.get("/products/brands");
      return data as { items: Brand[] };
    },
    retry: false,
  });
}
