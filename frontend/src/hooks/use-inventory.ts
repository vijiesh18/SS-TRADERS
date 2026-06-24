import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface LowStockItem {
  id: string;
  name: string;
  productCode: string;
  barcode?: string | null;
  stockQuantity: string;
  minimumStock: string;
}

export function useLowStock() {
  return useQuery({
    queryKey: ["inventory", "low-stock"],
    queryFn: async () => {
      const { data } = await api.get("/inventory/low-stock");
      return data.items as LowStockItem[];
    },
  });
}

export interface DeadStockItem {
  id: string;
  name: string;
  productCode: string;
  stockQuantity: string;
  sellingPrice: string;
}

export function useDeadStock(days = 90) {
  return useQuery({
    queryKey: ["inventory", "dead-stock", days],
    queryFn: async () => {
      const { data } = await api.get("/inventory/dead-stock", { params: { days } });
      return data as { items: DeadStockItem[]; cutoffDays: number };
    },
  });
}

export interface FastMovingItem {
  id: string;
  name: string;
  productCode: string;
  sellingPrice: string;
  stockQuantity: string;
  quantitySold: string;
}

export function useFastMoving(days = 30) {
  return useQuery({
    queryKey: ["inventory", "fast-moving", days],
    queryFn: async () => {
      const { data } = await api.get("/inventory/fast-moving", { params: { days } });
      return data as { items: FastMovingItem[]; periodDays: number };
    },
  });
}

export interface StockMovement {
  id: string;
  type: string;
  quantity: string;
  balanceAfter: string;
  reference?: string | null;
  note?: string | null;
  createdAt: string;
  createdBy?: { name: string } | null;
}

export function useStockMovements(productId: string | null) {
  return useQuery({
    queryKey: ["inventory", "movements", productId],
    queryFn: async () => {
      const { data } = await api.get(`/inventory/movements/${productId}`);
      return data.items as StockMovement[];
    },
    enabled: !!productId,
  });
}

interface AdjustmentPayload {
  productId: string;
  quantity: number;
  direction: "IN" | "OUT";
  reason: string;
}

export function useStockAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AdjustmentPayload) => {
      const { data } = await api.post("/inventory/adjustments", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ────────────────────────────────────────────────────────────────
// Products list (searchable, paginated)
// ────────────────────────────────────────────────────────────────
export interface ProductItem {
  id: string;
  productCode: string;
  name: string;
  unit: string;
  variant?: string | null;
  hsnCode?: string | null;
  gstPercentage: string;
  sellingPrice: string;
  purchasePrice: string;
  stockQuantity: string;
  minimumStock: string;
  barcode?: string | null;
  shadeCode?: string | null;
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
}

interface ProductsFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
}

export function useProducts(filters: ProductsFilters = {}) {
  return useQuery({
    queryKey: ["products", "list", filters],
    queryFn: async () => {
      const { data } = await api.get("/products", { params: filters });
      return data as { items: ProductItem[]; total: number; page: number; limit: number };
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["products", "categories"],
    queryFn: async () => {
      const { data } = await api.get("/products/categories");
      return (data.items || []) as { id: string; name: string }[];
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await api.post("/products", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, unknown> & { id: string }) => {
      const { data } = await api.put(`/products/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
