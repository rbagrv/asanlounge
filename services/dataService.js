import { db } from '../firebase-config.js';
import { getAuth } from 'firebase/auth';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  writeBatch, // New: For batch writes in sync
  increment // New: For increment operations
} from 'firebase/firestore';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, DEFAULT_PERMISSIONS, PAYMENT_TYPES } from '../constants/initialData.js';
import { offlineMode } from '../app.js'; // New: Import offlineMode
import { saveOfflineOrder, getOfflineOrders, clearOfflineOrder } from '../utils/offlineDB.js'; // New: Import IndexedDB utilities
import { NotificationService } from '../utils/notificationService.js';
import { AuthService } from '../auth.js';

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
    const productsWithIds = INITIAL_PRODUCTS.map((product, index) => ({ 
      id: `product-${index}`, 
      ...product,
      stock: product.stock || 20
    }));
    // Attempt to seed initial products if Firestore was empty
    if (db) {
      for (const product of productsWithIds) {
        try {
          // Check if product exists before adding to prevent duplicates on every app load
          const productRef = doc(db, 'products', product.id);
          const productSnap = await getDoc(productRef);
          if (!productSnap.exists()) {
            await setDoc(productRef, product);
          }
        } catch (seedError) {
          console.error("Error seeding product:", product.name, seedError);
        }
      }
    }
    return productsWithIds;
  }

  static async addProduct(productData) {
    if (!AuthService.hasPermission('add_product')) {
      throw new Error('İcazə yoxdur: Məhsul əlavə etmək üçün icazəniz yoxdur.');
    }
    try {
      const docRef = await addDoc(collection(db, 'products'), productData);
      return { id: docRef.id, ...productData };
    } catch (error) {
      console.error("Error adding product: ", error);
      return null;
    }
  }

  static async updateProduct(productId, updatedData) {
    if (!AuthService.hasPermission('edit_product')) {
      throw new Error('İcazə yoxdur: Məhsul redaktə etmək üçün icazəniz yoxdur.');
    }
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
    if (!AuthService.hasPermission('delete_product')) {
      throw new Error('İcazə yoxdur: Məhsul silmək üçün icazəniz yoxdur.');
    }
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
    if (offlineMode) {
      console.log('App is offline. Storing order in IndexedDB.');
      try {
        const tempOrderId = `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const orderToStore = {
          ...order,
          id: tempOrderId, // Assign a temporary ID
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }, // Mock timestamp
          status: 'pending-offline' // Mark as pending offline
        };
        await saveOfflineOrder(orderToStore);
        NotificationService.show('Sifariş offline olaraq saxlanıldı, internet bərpa olunanda göndəriləcək.', 'warning', 5000);
        return orderToStore; // Return the temporarily stored order
      } catch (idbError) {
        console.error('Error saving order to IndexedDB:', idbError);
        NotificationService.show('Offline sifarişi saxlamaq mümkün olmadı!', 'error');
        return null;
      }
    }

    // Online mode: proceed with Firestore
    try {
      const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
      const orderWithMetadata = {
        ...order,
        total,
        paymentType: order.paymentType || PAYMENT_TYPES.CASH, // Default to cash if not provided
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderWithMetadata);
      const newOrderData = {
        ...order,
        id: docRef.id,
        total,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
      };
      // Telegram notification for QR-origin orders
      if (order.orderSource === 'qr-code') {
        await DataService.sendTelegramNotification(newOrderData);
      }
      // Update customer loyalty points
      if (order.userId) {
        await DataService.updateLoyaltyPoints(order.userId, total);
      }
      return newOrderData;
    } catch (error) {
      console.error("Error adding order to Firestore: ", error);
      NotificationService.show('Sifariş göndərilərkən xəta baş verdi!', 'error');
      return null;
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

  static getOrdersForUser(userId, callback) {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, where("userId", "==", userId), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(orders);
    }, (error) => {
        console.error("Error listening to user orders: ", error);
    });

    return unsubscribe; // Return the unsubscribe function to stop listening
  }

  static async updateOrderItems(orderId, items) {
    try {
        const orderRef = doc(db, 'orders', orderId);
        const newTotal = items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
        await updateDoc(orderRef, {
            items: items,
            total: newTotal,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error("Error updating order items:", error);
        return false;
    }
  }

  static async getTables() {
    try {
      const tablesCol = collection(db, 'tables');
      const tableSnapshot = await getDocs(tablesCol);
      const tableList = tableSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (tableList.length > 0) {
        return tableList;
      }
    } catch (error) {
      console.error("Error getting tables: ", error);
    }
    console.warn("Could not fetch tables from Firestore. Returning empty array.");
    return [];
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
      const [orders, products, users] = await Promise.all([
        this.getOrders(),
        this.getProducts(), // Need products to get categories
        this.getUsers() // Need users for top customers
      ]);

      if (!orders || orders.length === 0) {
          return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0, activeOrders: 0, popularItems: [], salesByPaymentType: {}, topCustomers: [], hourlySales: Array(24).fill(0), categorySales: {} };
      }
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const paidOrders = orders.filter(order => order.status === 'paid');
      const activeOrders = orders.filter(order => order.status !== 'paid' && order.status !== 'cancelled');
      
      const totalRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0); // Assuming order.total is already computed
      const todayRevenue = paidOrders.filter(order => {
        if (order.createdAt && order.createdAt.seconds) {
            return new Date(order.createdAt.seconds * 1000) >= todayStart;
        }
        return false;
      }).reduce((sum, order) => sum + order.total, 0);

      // --- New Analytics Calculations ---

      // Sales by Payment Type
      const salesByPaymentType = {};
      paidOrders.forEach(order => {
        const type = order.paymentType || PAYMENT_TYPES.CASH; // Default to cash for old orders
        salesByPaymentType[type] = (salesByPaymentType[type] || 0) + order.total;
      });

      // Top 5 Customers
      const customerTotals = {};
      paidOrders.forEach(order => {
          const userId = order.userId;
          if (userId) {
              customerTotals[userId] = (customerTotals[userId] || 0) + order.total;
          }
      });
      const sortedCustomers = Object.entries(customerTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
      
      const topCustomers = sortedCustomers.map(([userId, totalSpent]) => {
          const user = users.find(u => u.id === userId);
          return {
              userId,
              name: user ? (user.name || user.email) : 'Anonim', // Use name if available, else email, else Anonymous
              totalSpent
          };
      });

      // Daily Sales Trend (hourly)
      const hourlySales = Array(24).fill(0);
      paidOrders.forEach(order => {
        if (order.createdAt && order.createdAt.seconds) {
          const orderDate = new Date(order.createdAt.seconds * 1000);
          const hour = orderDate.getHours();
          hourlySales[hour] += order.total;
        }
      });

      // Sales Distribution by Product Category
      const categorySales = {};
      paidOrders.forEach(order => {
        order.items.forEach(item => {
          const product = products.find(p => p.id === item.id);
          if (product && product.category) {
            categorySales[product.category] = (categorySales[product.category] || 0) + (item.quantity * item.priceAtOrder);
          }
        });
      });

      return {
        totalOrders: orders.length,
        todayOrders: paidOrders.filter(order => {
          if (order.createdAt && order.createdAt.seconds) {
              return new Date(order.createdAt.seconds * 1000) >= todayStart;
          }
          return false;
        }).length,
        totalRevenue: totalRevenue,
        todayRevenue: todayRevenue,
        activeOrders: activeOrders.length,
        popularItems: this.getPopularItems(orders),
        salesByPaymentType,
        topCustomers,
        hourlySales,
        categorySales
      };
    } catch (error) {
      console.error("Error getting analytics: ", error);
      return { totalOrders: 0, todayOrders: 0, totalRevenue: 0, todayRevenue: 0, activeOrders: 0, popularItems: [], salesByPaymentType: {}, topCustomers: [], hourlySales: Array(24).fill(0), categorySales: {} };
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
    const categoriesWithIds = INITIAL_CATEGORIES.map((category, index) => ({ 
      id: `category-${index}`, 
      ...category 
    }));
    // Attempt to seed initial categories if Firestore was empty
    if (db) {
      for (const category of categoriesWithIds) {
        try {
          const categoryRef = doc(db, 'categories', category.id);
          const categorySnap = await getDoc(categoryRef);
          if (!categorySnap.exists()) {
            await setDoc(categoryRef, category);
          }
        } catch (seedError) {
          console.error("Error seeding category:", category.name, seedError);
        }
      }
    }
    return categoriesWithIds;
  }

  static async addCategory(categoryData) {
    try {
      if (!AuthService.hasPermission('add_category')) {
        throw new Error('İcazə yoxdur: Kategoriya əlavə etmək üçün icazəniz yoxdur.');
      }
      const docRef = await addDoc(collection(db, 'categories'), categoryData);
      return { id: docRef.id, ...categoryData };
    } catch (error) {
      console.error("Error adding category: ", error);
      return null;
    }
  }

  static async updateCategory(categoryId, updatedData) {
    try {
      if (!AuthService.hasPermission('edit_category')) {
        throw new Error('İcazə yoxdur: Kategoriya redaktə etmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('delete_category')) {
        throw new Error('İcazə yoxdur: Kategoriya silmək üçün icazəniz yoxdur.');
      }
      await deleteDoc(doc(db, 'categories', categoryId));
      return true;
    } catch (error) {
      console.error("Error deleting category: ", error);
      return false;
    }
  }

  static async getUsers() {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting users: ", error);
        return [];
    }
  }

  static async addUser(userData) {
    try {
      const docRef = await addDoc(collection(db, 'users'), userData);
      return { id: docRef.id, ...userData };
    } catch (error) {
      console.error("Error adding user to collection: ", error);
      return null;
    }
  }

  static async updateUser(userId, updatedData) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating user: ", error);
      return false;
    }
  }

  static async deleteUser(userId) {
    // Note: This only deletes the user from the 'users' collection, not from Firebase Auth.
    // Deleting from Auth requires admin privileges, typically on a backend.
    try {
      await deleteDoc(doc(db, 'users', userId));
      return true;
    } catch (error) {
      console.error("Error deleting user: ", error);
      return false;
    }
  }

  // --- New Data Services for Admin Panel Sections ---

  /**
   * Saves or updates a guest's profile in the 'users' collection.
   * Uses the Firebase anonymous UID as the document ID.
   * @param {string} userId - The Firebase anonymous user ID.
   * @param {string} name - The guest's name.
   * @param {string} mobile - The guest's mobile number.
   * @returns {Promise<boolean>} - True if successful, false otherwise.
   */
  static async saveGuestProfile(userId, name, mobile) {
    if (!userId) {
      console.error("Cannot save guest profile: userId is null.");
      return false;
    }
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        name: name,
        mobile: mobile,
        role: 'guest-anonymous', // Assign a specific role for anonymous guests
        createdAt: serverTimestamp() // Will only set on initial creation
      }, { merge: true }); // Merge true ensures other fields are not overwritten if document exists
      console.log(`Guest profile for ${userId} saved/updated.`);
      return true;
    } catch (error) {
      console.error("Error saving guest profile:", error);
      return false;
    }
  }

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
      if (!AuthService.hasPermission('add_discount')) {
        throw new Error('İcazə yoxdur: İmzalama əlavə etmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('edit_discount')) {
        throw new Error('İcazə yoxdur: İmzalama redaktə etmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('delete_discount')) {
        throw new Error('İcazə yoxdur: İmzalama silmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('add_inventory_item')) {
        throw new Error('İcazə yoxdur: Məhsul əlavə etmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('edit_inventory_item')) {
        throw new Error('İcazə yoxdur: Məhsul redaktə etmək üçün icazəniz yoxdur.');
      }
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
      if (!AuthService.hasPermission('delete_inventory_item')) {
        throw new Error('İcazə yoxdur: Məhsul silmək üçün icazəniz yoxdur.');
      }
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

  static async addRecipe(recipeData) {
    try {
      if (!AuthService.hasPermission('add_recipe')) {
        throw new Error('İcazə yoxdur: Reçetə əlavə etmək üçün icazəniz yoxdur.');
      }
      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      return { id: docRef.id, ...recipeData };
    } catch (error) {
      console.error("Error adding recipe: ", error);
      return null;
    }
  }

  static async updateRecipe(recipeId, updatedData) {
    try {
      if (!AuthService.hasPermission('edit_recipe')) {
        throw new Error('İcazə yoxdur: Reçetə redaktə etmək üçün icazəniz yoxdur.');
      }
      const recipeRef = doc(db, 'recipes', recipeId);
      await updateDoc(recipeRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating recipe: ", error);
      return false;
    }
  }

  static async getSuppliers() {
    try {
      const suppliersCol = collection(db, 'suppliers');
      const snapshot = await getDocs(suppliersCol);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting suppliers: ", error);
      return [];
    }
  }

  static async addSupplier(supplierData) {
    try {
      if (!AuthService.hasPermission('add_supplier')) {
        throw new Error('İcazə yoxdur: Təchizatçı əlavə etmək üçün icazəniz yoxdur.');
      }
      const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
      return { id: docRef.id, ...supplierData };
    } catch (error) {
      console.error("Error adding supplier: ", error);
      return null;
    }
  }

  static async updateSupplier(supplierId, updatedData) {
    try {
      if (!AuthService.hasPermission('edit_supplier')) {
        throw new Error('İcazə yoxdur: Təchizatçı redaktə etmək üçün icazəniz yoxdur.');
      }
      const supplierRef = doc(db, 'suppliers', supplierId);
      await updateDoc(supplierRef, updatedData);
      return true;
    } catch (error) {
      console.error("Error updating supplier: ", error);
      return false;
    }
  }

  static async deleteSupplier(supplierId) {
    try {
      if (!AuthService.hasPermission('delete_supplier')) {
        throw new Error('İcazə yoxdur: Təchizatçı silmək üçün icazəniz yoxdur.');
      }
      await deleteDoc(doc(db, 'suppliers', supplierId));
      return true;
    } catch (error) {
      console.error("Error deleting supplier: ", error);
      return false;
    }
  }

  static async getPermissions() {
    try {
        const permissionsRef = doc(db, 'settings', 'permissions');
        const docSnap = await getDoc(permissionsRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.warn("Permissions document not found. Seeding with default permissions.");
            await setDoc(permissionsRef, DEFAULT_PERMISSIONS);
            return DEFAULT_PERMISSIONS;
        }
    } catch (error) {
        console.error("Error getting permissions:", error);
        console.warn("Falling back to default permissions due to error.");
        return DEFAULT_PERMISSIONS;
    }
  }
  
  static async resetDatabase() {
    const collections = ['products', 'orders', 'tables', 'purchases', 'categories', 'discounts', 'inventory', 'users', 'recipes', 'suppliers'];
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, collectionName, d.id)));
      await Promise.all(deletePromises);
      console.log(`Collection ${collectionName} cleared.`);
    }

    // Clear specific setting documents
    await deleteDoc(doc(db, 'settings', 'businessInfo')).catch(e => console.warn("businessInfo not found or error deleting:", e));
    await deleteDoc(doc(db, 'settings', 'permissions')).catch(e => console.warn("permissions not found or error deleting:", e));


    // Re-seed initial data
    await this.getProducts(); // Will re-seed if empty
    await this.getCategories(); // Will re-seed if empty
    await this.getPermissions(); // Re-seed default permissions
  }

  static async getBusinessInfo() {
    try {
        const settingsRef = doc(db, 'settings', 'businessInfo');
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('businessInfoCache', JSON.stringify(data));
            return data;
        } else {
            // Return default info if not set
            const defaultInfo = {
                businessName: 'Eat & Drink App',
                address: 'Bakı şəhəri, Nəsimi rayonu',
                phone: '+994 xx xxx xx xx',
                socials: {
                    instagram: '',
                    facebook: '',
                    tiktok: ''
                }
            };
            return defaultInfo;
        }
    } catch (error) {
        console.error("Error getting business info:", error);
        const cachedInfo = localStorage.getItem('businessInfoCache');
        if (cachedInfo) {
            try {
                return JSON.parse(cachedInfo);
            } catch (e) {
                console.error("Error parsing cached business info", e);
            }
        }
        return {}; // fallback
    }
}

  static async updateBusinessInfo(data) {
    try {
        const settingsRef = doc(db, 'settings', 'businessInfo');
        await setDoc(settingsRef, data, { merge: true });
        localStorage.setItem('businessInfoCache', JSON.stringify(data));
        return true;
    } catch (error) {
        console.error("Error updating business info:", error);
        return false;
    }
  }

  /**
   * Syncs orders from IndexedDB to Firebase when online.
   */
  static async syncOrdersQueue() {
    console.log('Attempting to sync offline orders...');
    const offlineOrders = await getOfflineOrders();
    if (offlineOrders.length === 0) {
      console.log('No offline orders to sync.');
      return;
    }

    const syncPromises = offlineOrders.map(async (offlineOrder) => {
      try {
        // Remove temporary ID and status for Firestore insertion
        const { id, status, ...orderData } = offlineOrder;
        
        // Re-add serverTimestamp for createdAt and updatedAt
        const orderToUpload = {
            ...orderData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            status: status === 'pending-offline' ? 'pending' : status // Reset status from 'pending-offline' to 'pending'
        };

        await addDoc(collection(db, 'orders'), orderToUpload);
        await clearOfflineOrder(id); // Remove from IndexedDB after successful upload
        console.log(`Successfully synced order ${id} to Firebase.`);
        return true;
      } catch (error) {
        console.error(`Failed to sync order ${offlineOrder.id}:`, error);
        NotificationService.show(`Sifariş #${offlineOrder.id.substring(8, 14)} sinxronizasiya edilərkən xəta baş verdi. Yenidən cəhd ediləcək.`, 'error');
        return false;
      }
    });

    await Promise.all(syncPromises);
    // After attempting all syncs, update the offline indicator to reflect current queue size
    const offlineIndicator = document.getElementById('offline-indicator');
    const pendingOrdersBadge = document.getElementById('pending-orders-badge');
    if (offlineIndicator && pendingOrdersBadge) {
        const remainingCount = await getOfflineOrdersCount();
        if (remainingCount > 0) {
            pendingOrdersBadge.textContent = `(${remainingCount})`;
            pendingOrdersBadge.classList.remove('hidden');
        } else {
            pendingOrdersBadge.classList.add('hidden');
        }
    }
  }

  // Telegram Bot integration for QR orders
  static async sendTelegramNotification(order) {
    // IMPORTANT: Replace these placeholder values with your actual Telegram Bot Token and Chat ID.
    const botToken = '<YOUR_TELEGRAM_BOT_TOKEN>';
    const chatId = '<YOUR_TELEGRAM_CHAT_ID>';
    const message = `New QR Order\nID: ${order.id}\nTable: ${order.tableNumber}\nTotal: ${order.total.toFixed(2)} AZN`;
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message })
      });
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  // Customer loyalty: increment points based on spent amount
  static async updateLoyaltyPoints(userId, amount) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        loyaltyPoints: increment(Math.floor(amount))
      });
    } catch (error) {
      console.error('Error updating loyalty points:', error);
    }
  }

  /**
   * Sends an error report to a simulated backend for logging.
   * In a real application, this would send data to a dedicated error logging service.
   * @param {object} errorDetails - Object containing details about the error.
   */
  static async sendErrorReport(errorDetails) {
    console.groupCollapsed('🚨 Error Report Sent (Simulated)');
    console.error('Error Type:', errorDetails.type);
    console.error('Message:', errorDetails.message);
    console.error('Stack:', errorDetails.stack);
    console.error('Source:', errorDetails.source);
    console.error('Line/Col:', errorDetails.lineno, errorDetails.colno);
    console.error('Timestamp:', errorDetails.timestamp);
    console.error('User Agent:', errorDetails.userAgent);
    console.groupEnd();

    // Placeholder for actual API call to a backend error logging service:
    /*
    try {
      // Example: Using a Firebase Function for error logging
      const logError = httpsCallable(functions, 'logClientError');
      await logError(errorDetails);
      console.log('Error report successfully sent to backend.');
    } catch (backendError) {
      console.error('Failed to send error report to backend:', backendError);
      // It's crucial not to throw from an error reporter, or it could cause infinite loops.
    }
    */

    // For now, just resolve indicating it was "handled" locally.
    return true;
  }
}