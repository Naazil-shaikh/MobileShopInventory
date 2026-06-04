export const PRODUCT_CATEGORIES = [
  { value: "mobile", label: "Mobile" },
  { value: "accessory", label: "Accessory" },
  { value: "charger", label: "Charger" },
  { value: "cable", label: "Cable" },
  { value: "earphones", label: "Earphones" },
];

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "upi", label: "UPI" },
];

export const MOBILE_UNIT_STATUSES = [
  { value: "in_stock", label: "In Stock" },
  { value: "sold", label: "Sold" },
  { value: "returned", label: "Return" },
];

export const INVENTORY_ACTIONS = [
  { value: "add", label: "Add Stock" },
  { value: "reduce", label: "Reduce Stock" },
  { value: "return", label: "Return Stock" },
  { value: "damage", label: "Record Damage" },
];

export const QUERY_KEYS = {
  products: "products",
  product: "product",
  suppliers: "suppliers",
  customers: "customers",
  customerPurchases: "customerPurchases",
  inventoryHistory: "inventoryHistory",
  lowStock: "lowStock",
  mobileUnits: "mobileUnits",
  sales: "sales",
  saleInvoice: "saleInvoice",
  dashboard: "dashboard",
};
