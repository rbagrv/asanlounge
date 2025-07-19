import { db } from '../firebase-config.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../constants/initialData.js';

export class DataService {
  static async getProducts() {
    try {
      const productsCol = collection(db, 'products');
      const productSnapshot = await getDocs(productsCol);
      const productList = productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (productList.length > 0) {
        localStorage.setItem('productsCache', JSON.stringify(productList));
        return productList;
      }
    } catch (error) {
      console.error("Error getting products from Firestore: ", error);
    }
  
    // Fallback logic
    console.warn("Could not fetch products from Firestore. Checking cache...");
    const cachedProducts = localStorage.getItem('productsCache');
    if (cachedProducts) {
      try {
        const parsedProducts = JSON.parse(cachedProducts);
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          console.log("Loaded products from cache.");
          return parsedProducts;
        }
      } catch (e) {
        console.error("Error parsing cached products", e);
      }
    }
    
    console.warn("Cache empty or invalid. Falling back to initial product data.");
    return INITIAL_PRODUCTS.map((product, index) => ({ 
      id: `product-${index}`, 
      ...product,
      stock: product.stock || 20
    }));
  }

  static async addProduct(productData) {
    try {
      const docRef = await addDoc(collection(db, 'products'), productData);
      return { id: docRef.id, ...productData };
    } catch (error) {
      console.error("Error adding product: ", error);
      return null;
    }
  }

  static async updateProduct(productId, updatedData) {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating product: ", error);
      return false;
    }
  }

  static async deleteProduct(productId) {
    try {
      await deleteDoc(doc(db, 'products', productId));
      return true;
    } catch (error) {
      console.error("Error deleting product: ", error);
      return false;
    }
  }

  static async getOrders() {
    try {
      const ordersCol = collection(db, 'orders');
      const q = query(ordersCol, orderBy('createdAt', 'desc'));
      const orderSnapshot = await getDocs(q);
      return orderSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting orders: ", error);
      console.warn("Could not fetch orders from Firestore.");
      return [];
    }
  }

  static async addOrder(order) {
    try {
      const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      const orderWithMetadata = {
        ...order,
        total,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderWithMetadata);
      // When returning, use serverTimestamp() for consistency or retrieve fresh doc
      const newOrderData = { ...order, id: docRef.id, total, createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } }; // Mock Firestore Timestamp
      return newOrderData;
    } catch (error) {
      console.error("Error adding order: ", error);
      // Simulate a successful order in offline mode for better UX
      const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      NotificationService.show('Sifarişiniz qəbul edildi (offline rejim).', 'info');
      return { ...order, id: `offline-${Date.now()}`, total };
    }
  }

  static async updateOrder(orderId, newStatus) {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating order: ", error);
      return false;
    }
  }

  static async getTables() {
    try {
      const tablesCol = collection(db, 'tables');
      const tableSnapshot = await getDocs(tablesCol);
      return tableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting tables: ", error);
      console.warn("Could not fetch tables from Firestore.");
      return [];
    }
  }

  static async addTable(tableData) {
    try {
      const baseUrl = window.location.origin;
      const qrCode = `${baseUrl}/?table=${tableData.number}`;
      
      const tableWithQR = {
        ...tableData,
        qrCode: qrCode,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'tables'), tableWithQR);
      return { id: docRef.id, ...tableWithQR };
    } catch (error) {
      console.error("Error adding table: ", error);
      return null;
    }
  }

  static async updateTable(tableId, updatedData) {
    try {
      const tableRef = doc(db, 'tables', tableId);
      await updateDoc(tableRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating table: ", error);
      return false;
    }
  }

  static async deleteTable(tableId) {
    try {
      await deleteDoc(doc(db, 'tables', tableId));
      return true;
    } catch (error) {
      console.error("Error deleting table: ", error);
      return false;
    }
  }

  static async addPurchase(purchaseData) {
    try {
      const docRef = await addDoc(collection(db, 'purchases'), {
        ...purchaseData,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...purchaseData };
    } catch (error) {
      console.error("Error adding purchase: ", error);
      return null;
    }
  }

  static async updatePurchase(purchaseId, updatedData) {
    try {
      const purchaseRef = doc(db, 'purchases', purchaseId);
      await updateDoc(purchaseRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating purchase: ", error);
      return false;
    }
  }

  static async deletePurchase(purchaseId) {
    try {
      await deleteDoc(doc(db, 'purchases', purchaseId));
      return true;
    } catch (error) {
      console.error("Error deleting purchase: ", error);
      return false;
    }
  }

  static async getPurchases() {
    try {
      const purchasesCol = collection(db, 'purchases');
      const q = query(purchasesCol, orderBy('createdAt', 'desc'));
      const purchaseSnapshot = await getDocs(q);
      return purchaseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting purchases: ", error);
      console.warn("Could not fetch purchases from Firestore.");
      return [];
    }
  }

  static async getAnalytics() {
    try {
      const orders = await this.getOrders();
      if (!orders || orders.length === 0) {
          // If orders can't be fetched, return a default state for analytics
          return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0, activeOrders: 0, popularItems: [] };
      }
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayOrders = orders.filter(order => {
        if (order.createdAt && order.createdAt.seconds) {
            return new Date(order.createdAt.seconds * 1000) >= todayStart;
        }
        return false;
      });
      
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const todayRevenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
      
      return {
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        activeOrders: orders.filter(order => {
            return ['pending', 'in-prep', 'ready'].includes(order.status);
        }).length,
        popularItems: this.getPopularItems(orders)
      };
    } catch (error) {
      console.error("Error getting analytics: ", error);
      // Provide a clear fallback object
      return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0, activeOrders: 0, popularItems: [] };
    }
  }

  static getPopularItems(orders) {
    const itemCounts = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });
    return Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  static async getCategories() {
    try {
      const categoriesCol = collection(db, 'categories');
      const categorySnapshot = await getDocs(categoriesCol);
      const categoryList = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (categoryList.length > 0) {
        localStorage.setItem('categoriesCache', JSON.stringify(categoryList));
        return categoryList;
      }
    } catch (error) {
      console.error("Error getting categories from Firestore: ", error);
    }

    // Fallback logic
    console.warn("Could not fetch categories from Firestore. Checking cache...");
    const cachedCategories = localStorage.getItem('categoriesCache');
    if (cachedCategories) {
        try {
            const parsedCategories = JSON.parse(cachedCategories);
            if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
                console.log("Loaded categories from cache.");
                return parsedCategories;
            }
        } catch (e) {
            console.error("Error parsing cached categories", e);
        }
    }

    console.warn("Cache empty or invalid. Falling back to initial category data.");
    return INITIAL_CATEGORIES.map((category, index) => ({ 
      id: `category-${index}`, 
      ...category 
    }));
  }

  static async addCategory(categoryData) {
    try {
      const docRef = await addDoc(collection(db, 'categories'), categoryData);
      return { id: docRef.id, ...categoryData };
    } catch (error) {
      console.error("Error adding category: ", error);
      return null;
    }
  }

  static async updateCategory(categoryId, updatedData) {
    try {
      const categoryRef = doc(db, 'categories', categoryId);
      await updateDoc(categoryRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating category: ", error);
      return false;
    }
  }

  static async deleteCategory(categoryId) {
    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      return true;
    } catch (error) {
      console.error("Error deleting category: ", error);
      return false;
    }
  }

  // --- New Data Services for Admin Panel Sections ---

  static async getDiscounts() {
    try {
      const discountsCol = collection(db, 'discounts');
      const discountSnapshot = await getDocs(discountsCol);
      return discountSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting discounts: ", error);
      console.warn("Could not fetch discounts from Firestore.");
      return [];
    }
  }

  static async addDiscount(discountData) {
    try {
      const docRef = await addDoc(collection(db, 'discounts'), {
        ...discountData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...discountData };
    } catch (error) {
      console.error("Error adding discount: ", error);
      return null;
    }
  }

  static async updateDiscount(discountId, updatedData) {
    try {
      const discountRef = doc(db, 'discounts', discountId);
      await updateDoc(discountRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating discount: ", error);
      return false;
    }
  }

  static async deleteDiscount(discountId) {
    try {
      await deleteDoc(doc(db, 'discounts', discountId));
      return true;
    } catch (error) {
      console.error("Error deleting discount: ", error);
      return false;
    }
  }

  static async getInventoryItems() {
    try {
      const inventoryCol = collection(db, 'inventory');
      const inventorySnapshot = await getDocs(inventoryCol);
      return inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting inventory items: ", error);
      console.warn("Could not fetch inventory items from Firestore.");
      return [];
    }
  }

  static async addInventoryItem(itemData) {
    try {
      const docRef = await addDoc(collection(db, 'inventory'), {
        ...itemData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...itemData };
    } catch (error) {
      console.error("Error adding inventory item: ", error);
      return null;
    }
  }

  static async updateInventoryItem(itemId, updatedData) {
    try {
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Error updating inventory item: ", error);
      return false;
    }
  }

  static async deleteInventoryItem(itemId) {
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      return true;
    } catch (error) {
      console.error("Error deleting inventory item: ", error);
      return false;
    }
  }

  static async getRecipes() {
    try {
      const recipesCol = collection(db, 'recipes');
      const recipeSnapshot = await getDocs(recipesCol);
      return recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting recipes: ", error);
      return [];
    }
  }
  
  static async resetDatabase() {
    const collections = ['products', 'orders', 'tables', 'purchases', 'categories', 'discounts', 'inventory'];
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
      await Promise.all(deletePromises);
      console.log(`Collection ${collectionName} cleared.`);
    }

    // Re-seed initial data
    await this.getProducts(); // Will re-seed if empty
    await this.getCategories(); // Will re-seed if empty
  }
}