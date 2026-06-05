"use client";

/**
 * components/shop/ShopDataContext.jsx
 * 商城真实数据上下文：挂载时拉取一次已上线商品/店铺，提供与原 mock 同签名的查询函数，
 * 使各商城组件无需逐个改成 async。
 */

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { fetchShopData } from "@/services/shopService";

const Ctx = createContext(null);
export const useShopData = () => useContext(Ctx);

export function ShopDataProvider({ children }) {
  const [state, setState] = useState({ products: [], stores: [], loading: true, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    fetchShopData()
      .then((d) => setState({ ...d, loading: false, error: null }))
      .catch((e) => setState({ products: [], stores: [], loading: false, error: e.message }));
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => {
    const storesById = Object.fromEntries(state.stores.map((s) => [s.id, s]));
    const productsById = Object.fromEntries(state.products.map((p) => [p.id, p]));
    return {
      loading: state.loading,
      error: state.error,
      reload: load,
      products: state.products,
      stores: state.stores,
      getProduct: (id) => productsById[id] || null,
      getStore: (id) => storesById[id] || null,
      listProducts: ({ categoryId = "all", q = "" } = {}) => {
        const kw = q.trim().toLowerCase();
        return state.products.filter((p) => {
          if (categoryId && categoryId !== "all" && p.categoryId !== categoryId) return false;
          if (!kw) return true;
          const st = storesById[p.storeId];
          return p.title.toLowerCase().includes(kw) || (st?.name || "").toLowerCase().includes(kw);
        });
      },
      listProductsByStore: (storeId, { excludeId, limit } = {}) => {
        let rows = state.products.filter((p) => p.storeId === storeId && p.id !== excludeId);
        if (limit) rows = rows.slice(0, limit);
        return rows;
      },
      searchStores: (q) => {
        const kw = q.trim().toLowerCase();
        if (!kw) return [];
        return state.stores.filter((s) => s.name.toLowerCase().includes(kw) || (s.desc || "").toLowerCase().includes(kw));
      },
    };
  }, [state, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
