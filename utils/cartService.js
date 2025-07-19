export class CartService {
  constructor() {
    this.cart = [];
    this.listeners = [];
  }

  addItem(product, quantity = 1) {
    const existingItemIndex = this.cart.findIndex(item => item.id === product.id);
    const priceAtOrder = product.discountPercentage > 0
      ? product.price * (1 - product.discountPercentage / 100)
      : product.price;

    if (existingItemIndex > -1) {
      this.cart[existingItemIndex].quantity += quantity;
      this.cart[existingItemIndex].priceAtOrder = priceAtOrder;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        quantity: quantity,
        priceAtOrder: priceAtOrder
      });
    }
    
    this.notifyListeners();
  }

  removeItem(index) {
    this.cart.splice(index, 1);
    this.notifyListeners();
  }

  clear() {
    this.cart = [];
    this.notifyListeners();
  }

  getItems() {
    return this.cart;
  }

  getTotal() {
    return this.cart.reduce((total, item) => total + (item.priceAtOrder * item.quantity), 0);
  }

  getItemCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  updateQuantity(index, quantity) {
    if (quantity > 0) {
      this.cart[index].quantity = quantity;
    } else {
      this.removeItem(index);
    }
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  unsubscribe(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.cart));
  }
}

// Global instance for guest usage
export const guestCartService = new CartService();