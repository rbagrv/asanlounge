// Import and re-export from the modular service
import { DataService } from './services/dataService.js';

export const getProducts = DataService.getProducts.bind(DataService);
export const addProduct = DataService.addProduct.bind(DataService);
export const updateProduct = DataService.updateProduct.bind(DataService);
export const deleteProduct = DataService.deleteProduct.bind(DataService);
export const getOrders = DataService.getOrders.bind(DataService);
export const addOrder = DataService.addOrder.bind(DataService);
export const updateOrder = DataService.updateOrder.bind(DataService);
export const getTables = DataService.getTables.bind(DataService);
export const addTable = DataService.addTable.bind(DataService);
export const updateTable = DataService.updateTable.bind(DataService);
export const deleteTable = DataService.deleteTable.bind(DataService);
export const getAnalytics = DataService.getAnalytics.bind(DataService);
export const getPurchases = DataService.getPurchases.bind(DataService);
export const addPurchase = DataService.addPurchase.bind(DataService);
export const updatePurchase = DataService.updatePurchase.bind(DataService);
export const deletePurchase = DataService.deletePurchase.bind(DataService);
export const getCategories = DataService.getCategories.bind(DataService);
export const addCategory = DataService.addCategory.bind(DataService);
export const updateCategory = DataService.updateCategory.bind(DataService);
export const deleteCategory = DataService.deleteCategory.bind(DataService);
export const getDiscounts = DataService.getDiscounts.bind(DataService);
export const addDiscount = DataService.addDiscount.bind(DataService);
export const updateDiscount = DataService.updateDiscount.bind(DataService);
export const deleteDiscount = DataService.deleteDiscount.bind(DataService);
export const getInventoryItems = DataService.getInventoryItems.bind(DataService);
export const addInventoryItem = DataService.addInventoryItem.bind(DataService);
export const updateInventoryItem = DataService.updateInventoryItem.bind(DataService);
export const deleteInventoryItem = DataService.deleteInventoryItem.bind(DataService);
export const getRecipes = DataService.getRecipes.bind(DataService);

// For employees, we rely on auth service for registration, and user data would typically be managed in a 'users' collection or through Firebase Admin SDK.
// For now, we'll keep it simple for demo purposes.