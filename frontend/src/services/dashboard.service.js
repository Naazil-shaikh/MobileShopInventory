import { productService } from "./product.service.js";
import { inventoryService } from "./inventory.service.js";
import { saleService } from "./sale.service.js";

export const dashboardService = {
  getSummary: async () => {
    const [productsRes, lowStock, salesRes, historyRes] = await Promise.all([
      productService.getAll({ page: 1, limit: 1 }),
      inventoryService.getLowStock(),
      saleService.getHistory({ page: 1, limit: 5 }),
      inventoryService.getHistory({ page: 1, limit: 5 }),
    ]);

    const totalProducts = productsRes?.pagination?.total ?? 0;
    const lowStockCount = Array.isArray(lowStock) ? lowStock.length : 0;
    const totalSales = salesRes?.pagination?.total ?? 0;
    const recentSales = salesRes?.sales ?? [];
    const recentTransactions = historyRes?.transactions ?? [];

    const productsFull = await productService.getAll({ page: 1, limit: 100 });
    const totalStockValue = (productsFull?.products ?? []).reduce(
      (sum, p) => sum + (p.currentStock ?? 0) * (p.purchasePrice ?? 0),
      0,
    );

    return {
      totalProducts,
      lowStockCount,
      lowStockProducts: lowStock ?? [],
      totalSales,
      recentSales,
      recentTransactions,
      totalStockValue,
    };
  },
};
