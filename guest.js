import { createElement, createProductCard } from './components.js';
import { DataService } from './services/dataService.js';
import { guestCartService } from './utils/cartService.js';
import { NotificationService } from './utils/notificationService.js';

export class GuestModule {
  constructor() {
    this.guestTableNumber = null; // This will now be set by app.js
    this.allProducts = [];
    this.allCategories = [];
    this.currentCategory = 'all';
    this.loadingElement = null;
    this.viewMode = 'categories'; // 'categories' or 'products'
    this.selectedCategory = null;
  }

  async render(container) {
    this.loadingElement = NotificationService.showLoading('Səhifə yüklənir...');
    
    try {
      // guestTableNumber is now expected to be set by app.js before render() is called.
      // Remove URL and localStorage read here to avoid duplication of responsibility.
      
      // Fetch categories and products before rendering layout
      console.log('Loading categories and products...');
      this.allCategories = await DataService.getCategories();
      this.allProducts = await DataService.getProducts();
      console.log('Categories loaded:', this.allCategories.length);
      console.log('Products loaded:', this.allProducts.length);

      this.renderLayout(container);
      this.setupEventListeners(container);
      this.setupCartSubscription(container);
      this.updateCartDisplay(container);
      
      NotificationService.hideLoading(this.loadingElement);
      NotificationService.show('Xoş gəlmisiniz! Kateqoriya seçin.', 'success');
    } catch (error) {
      console.error('Error rendering guest module:', error);
      NotificationService.hideLoading(this.loadingElement);
      NotificationService.show('Səhifə yüklənərkən xəta baş verdi.', 'error');
      
      // Fallback: render with empty data
      this.allCategories = [];
      this.allProducts = [];
      this.renderLayout(container);
      this.setupEventListeners(container);
    }
  }

  renderLayout(container) {
    container.innerHTML = `
      <div class="max-w-7xl mx-auto animate-slide-in">
        ${this.renderTableInfo()}
        
        <div id="main-content" class="mb-8 sm:mb-12">
          ${this.renderCategoriesView()}
        </div>
        
        ${this.renderCart()}
      </div>
    `;
  }

  renderTableInfo() {
    // this.guestTableNumber is now expected to be set by app.js before render
    if (this.guestTableNumber) {
      return `
        <div class="text-center mb-8 sm:mb-12">
          <div class="inline-flex items-center justify-center space-x-4 mb-6">
            <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center shadow-2xl">
              <svg class="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
              </svg>
            </div>
            <div class="text-left">
              <h1 class="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Masa ${this.guestTableNumber}</h1>
              <p class="text-lg sm:text-xl text-slate-600">Xoş gəlmisiniz!</p>
            </div>
          </div>
          
          <div class="inline-flex items-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-2xl shadow-lg">
            <div class="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <p class="font-semibold">Sifarişiniz bu masaya qeyd ediləcək</p>
          </div>
        </div>
      `;
    }
    // This case should ideally not be reached if app.js handles table number entry.
    // However, as a fallback, show a message.
    return `
      <div class="text-center mb-8 sm:mb-12">
        <div class="inline-flex items-center space-x-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-2xl shadow-lg">
          <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <div class="text-left">
            <p class="font-bold text-lg">Masa nömrəsi təyin olunmayıb</p>
            <p class="text-sm text-white/80">Zəhmət olmasa masa nömrəsini daxil edin</p>
          </div>
        </div>
      </div>
    `;
  }

  renderCategoriesView() {
    return `
      <div class="text-center mb-8 sm:mb-10">
        <h2 class="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">Kateqoriya Seçin</h2>
        <p class="text-slate-600 text-lg">Nə yeməyiniz gəlir?</p>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <!-- Kampaniyalar category -->
        <div class="category-card ultra-modern-card p-6 sm:p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-300" data-category="campaign">
          <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-red-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
            <svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
            </svg>
          </div>
          <h3 class="text-xl sm:text-2xl font-bold text-slate-800 mb-2 group-hover:text-red-600 transition-colors">Kampaniyalar</h3>
          <p class="text-slate-600">Xüsusi təkliflər və endirimlər</p>
        </div>

        <!-- Regular categories -->
        ${this.allCategories.map(category => `
          <div class="category-card ultra-modern-card p-6 sm:p-8 text-center group cursor-pointer hover:scale-105 transition-all duration-300" data-category="${category.name}">
            <div class="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-primary-500 to-accent-500 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              ${this.getCategoryIcon(category.name)}
            </div>
            <h3 class="text-xl sm:text-2xl font-bold text-slate-800 mb-2 group-hover:text-primary-600 transition-colors">${category.name}</h3>
            <p class="text-slate-600">Ləzzətli seçimlər</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderProductsView() {
    return `
      <div class="flex items-center justify-between mb-6 sm:mb-8">
        <button id="back-to-categories" class="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7 7-7-7m14-8l-7 7-7-7m2 5l14-14m-8 8l-7 7m14-14l-7 7"></path>
          </svg>
          <span>Kateqoriyalara qayıt</span>
        </button>
        <h2 class="text-xl sm:text-3xl font-bold text-slate-800">${this.selectedCategory === 'campaign' ? 'Kampaniyalar' : this.selectedCategory}</h2>
        <div></div>
      </div>

      <div id="product-list" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <!-- Products will be loaded here -->
      </div>
    `;
  }

  getCategoryIcon(categoryName) {
    const iconMap = {
      'Əsas Yeməklər': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                       </svg>`,
      'Pizzalar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`,
      'Salatlar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                  </svg>`,
      'İçkilər': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 118.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                 </svg>`,
      'Şirniyyatlar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                      </svg>`
    };
    return iconMap[categoryName] || `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                                    </svg>`;
  }

  renderCart() {
    return `
      <div id="guest-cart" class="cart-container fixed bottom-0 right-0 max-w-full sm:max-w-md w-full sm:w-96 transition-all duration-500 transform translate-y-full sm:translate-y-0 sm:translate-x-full sm:opacity-100 opacity-0" style="bottom: env(safe-area-inset-bottom);">
        <div class="p-4 sm:p-6">
          <div class="flex justify-between items-center mb-4 sm:mb-6">
            <div class="flex items-center space-x-2 sm:space-x-3">
              <div class="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                <svg class="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
                </svg>
              </div>
              <h2 class="text-lg sm:text-xl font-bold text-slate-800">Səbət</h2>
            </div>
          </div>
          
          <!-- Table number input is now handled by guest-table-entry-section in app.js -->
          <!-- It's crucial that this.guestTableNumber is set BEFORE this component renders -->
          <!-- So no need for an input here anymore -->
          
          <div id="cart-items" class="space-y-3 mb-4 sm:mb-6 max-h-48 sm:max-h-64 overflow-y-auto">
            <!-- Cart items will be listed here -->
          </div>
          
          <div class="border-t border-slate-200 pt-4 sm:pt-6">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
              <span class="text-base sm:text-lg font-bold text-slate-800">Ümumi:</span>
              <span class="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-500 to-accent-500 bg-clip-text text-transparent">
                <span id="cart-total-price">0.00</span> AZN
              </span>
            </div>
            <button id="place-order-btn" disabled
                    class="w-full bg-gradient-to-r from-primary-500 to-primary-600 disabled:from-slate-300 disabled:to-slate-400 text-white px-6 py-3 sm:py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base">
              Sifariş Ver
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async loadProducts() {
    this.allProducts = await DataService.getProducts();
    this.renderProducts(this.allProducts);
  }

  renderProducts(products) {
    const productListDiv = document.querySelector('#product-list');
    if (!productListDiv) return;
    
    productListDiv.innerHTML = '';
    if (products.length === 0) {
      productListDiv.innerHTML = `
        <div class="col-span-full text-center py-12">
          <div class="text-slate-400 mb-4">
            <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 000 6.364L12 20.364l7.682-7.682a4 4 0 00-6.364-6.364L12 7.636l-1.318-1.318a4 4 0 00-6.364 0z"></path>
            </svg>
          </div>
          <p class="text-slate-500 text-lg">Bu kateqoriyada məhsul yoxdur</p>
        </div>
      `;
    } else {
      products.forEach(product => {
        const productCard = createProductCard(product);
        productListDiv.appendChild(productCard);
      });
    }
  }

  setupEventListeners(container) {
    // Category selection
    const mainContent = container.querySelector('#main-content');
    mainContent.addEventListener('click', (event) => {
      const categoryCard = event.target.closest('.category-card');
      if (categoryCard) {
        this.handleCategorySelection(categoryCard.dataset.category);
      }
      
      // Back to categories button
      if (event.target.closest('#back-to-categories')) {
        this.showCategoriesView();
      }
    });

    // Product interactions
    const productListDiv = container.querySelector('#product-list');
    if (productListDiv) {
      productListDiv.addEventListener('click', (event) => {
        this.handleProductInteraction(event);
      });
    }

    // Cart interactions
    const placeOrderBtn = container.querySelector('#place-order-btn');
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener('click', () => {
        this.placeOrder();
      });
    }

    const cartItemsDiv = container.querySelector('#cart-items');
    cartItemsDiv.addEventListener('click', (event) => {
      this.handleCartItemInteraction(event);
    });
  }

  handleCategorySelection(category) {
    this.selectedCategory = category;
    this.viewMode = 'products';
    this.showProductsView();
    
    // Filter and show products for selected category
    let filteredProducts = [];
    if (category === 'campaign') {
      filteredProducts = this.allProducts.filter(product => product.isCampaignItem || product.discountPercentage > 0);
    } else {
      filteredProducts = this.allProducts.filter(product => product.category === category);
    }
    
    this.renderProducts(filteredProducts);
  }

  showCategoriesView() {
    this.viewMode = 'categories';
    this.selectedCategory = null;
    const mainContent = document.querySelector('#main-content');
    mainContent.innerHTML = this.renderCategoriesView();
  }

  showProductsView() {
    this.viewMode = 'products';
    const mainContent = document.querySelector('#main-content');
    mainContent.innerHTML = this.renderProductsView();
  }

  handleCategoryFilter(clickedBtn, allBtns) {
    allBtns.forEach(btn => {
      btn.classList.remove('bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'text-white', 'shadow-lg', 'active');
      btn.classList.add('text-slate-700', 'bg-slate-100', 'hover:bg-slate-200');
    });
    
    clickedBtn.classList.add('bg-gradient-to-r', 'from-primary-500', 'to-primary-600', 'text-white', 'shadow-lg', 'active');
    clickedBtn.classList.remove('text-slate-700', 'bg-slate-100', 'hover:bg-slate-200');
    
    this.currentCategory = clickedBtn.dataset.category;
    let filteredProducts = [];
    if (this.currentCategory === 'all') {
        filteredProducts = this.allProducts;
    } else if (this.currentCategory === 'campaign') {
        filteredProducts = this.allProducts.filter(product => product.isCampaignItem || product.discountPercentage > 0);
    } else {
        filteredProducts = this.allProducts.filter(product => product.category === this.currentCategory);
    }
    this.renderProducts(filteredProducts);
  }

  handleProductInteraction(event) {
    const target = event.target;
    const productCard = target.closest('[data-product-id]');
    
    if (!productCard) return;
    
    const productId = productCard.dataset.productId;
    const product = this.allProducts.find(p => p.id === productId);
    
    if (target.textContent === '+') {
      const quantityInput = productCard.querySelector('input[type="number"]');
      const newValue = parseInt(quantityInput.value) + 1;
      quantityInput.value = newValue;
      
      // Add subtle animation
      quantityInput.style.transform = 'scale(1.1)';
      setTimeout(() => {
        quantityInput.style.transform = 'scale(1)';
      }, 150);
      
    } else if (target.textContent === '-') {
      const quantityInput = productCard.querySelector('input[type="number"]');
      const currentValue = parseInt(quantityInput.value);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
        
        // Add subtle animation
        quantityInput.style.transform = 'scale(0.9)';
        setTimeout(() => {
          quantityInput.style.transform = 'scale(1)';
        }, 150);
      }
    } else if (target.textContent === 'Səbətə əlavə et') {
      const quantityInput = productCard.querySelector('input[type="number"]');
      const quantity = parseInt(quantityInput.value);
      
      // Add loading state to button
      const button = target;
      const originalContent = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `
        <span class="flex items-center justify-center space-x-2">
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Əlavə edilir...</span>
        </span>
      `;
      
      setTimeout(() => {
        guestCartService.addItem(product, quantity);
        NotificationService.show(`${quantity} ədəd ${product.name} səbətə əlavə edildi!`, 'success');
        quantityInput.value = '1';
        
        // Restore button
        button.disabled = false;
        button.innerHTML = originalContent;
        
        // Add success animation to card
        productCard.style.transform = 'scale(1.05)';
        productCard.style.boxShadow = '0 20px 40px rgba(34, 197, 94, 0.3)';
        setTimeout(() => {
          productCard.style.transform = '';
          productCard.style.boxShadow = '';
        }, 500);
      }, 800);
    }
  }

  handleCartItemInteraction(event) {
    if (event.target.classList.contains('remove-item-btn')) {
      const index = parseInt(event.target.dataset.index);
      guestCartService.removeItem(index);
      NotificationService.show('Məhsul səbətdən silindi.', 'info');
    }
  }

  setupCartSubscription(container) {
    guestCartService.subscribe(() => {
      this.updateCartDisplay(container);
    });
  }

  updateCartDisplay(container) {
    const cartItemsDiv = container.querySelector('#cart-items');
    const cartTotalPriceSpan = container.querySelector('#cart-total-price');
    const cartDiv = container.querySelector('#guest-cart');
    
    const cart = guestCartService.getItems();
    const total = guestCartService.getTotal();
    
    cartItemsDiv.innerHTML = '';
    
    if (cart.length === 0) {
      const emptyState = createElement('div', { className: 'text-center py-8' });
      emptyState.innerHTML = `
        <div class="text-slate-400 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
          </svg>
        </div>
        <p class="text-slate-500">Səbətiniz boşdur</p>
      `;
      cartItemsDiv.appendChild(emptyState);
    } else {
      cart.forEach((item, index) => {
        const itemDiv = createElement('div', { className: 'flex justify-between items-center p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors' });
        itemDiv.innerHTML = `
          <div class="flex-1">
            <p class="font-semibold text-slate-800">${item.name}</p>
            <p class="text-sm text-slate-500">×${item.quantity}</p>
          </div>
          <div class="flex items-center space-x-3">
            <span class="font-bold text-slate-800">${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
            <button class="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 remove-item-btn" data-index="${index}">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12M6 18l12-12M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
      });
    }
    
    cartTotalPriceSpan.textContent = total.toFixed(2);
    this.updatePlaceOrderButtonState();
    
    // Show/hide cart based on items
    if (cart.length > 0) {
      cartDiv.classList.remove('translate-y-full', 'sm:translate-x-full', 'opacity-0');
      cartDiv.classList.add('translate-y-0', 'sm:translate-x-0', 'opacity-100');
    } else {
      cartDiv.classList.add('translate-y-full', 'sm:translate-x-full', 'opacity-0');
      cartDiv.classList.remove('translate-y-0', 'sm:translate-x-0', 'opacity-100');
    }
  }

  updatePlaceOrderButtonState() {
    const placeOrderBtn = document.querySelector('#place-order-btn');
    
    // Now, this.guestTableNumber should always be set when this module is active
    const isValid = guestCartService.getItems().length > 0 && this.guestTableNumber > 0;
    
    placeOrderBtn.disabled = !isValid;
  }

  async placeOrder() {
    // this.guestTableNumber is now guaranteed to be set if we reach this point
    const finalTableNumber = this.guestTableNumber;
    
    if (guestCartService.getItems().length === 0) {
      NotificationService.show('Zəhmət olmasa sifarişə məhsul əlavə edin.', 'error');
      return;
    }

    if (!finalTableNumber || finalTableNumber <= 0) {
      // This should ideally not happen if app.js ensures table number is set
      NotificationService.show('Zəhmət olmasa masa nömrəsi təyin olunduğundan əmin olun.', 'error');
      return;
    }

    const placeOrderBtn = document.querySelector('#place-order-btn');
    placeOrderBtn.disabled = true;
    const originalText = placeOrderBtn.innerHTML;
    placeOrderBtn.innerHTML = `
      <span class="flex items-center justify-center space-x-2">
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        <span>Sifarişiniz hazırlanır...</span>
      </span>
    `;

    // Show loading notification
    const loadingNotification = NotificationService.showLoading('Sifarişiniz göndərilir...');

    try {
      const newOrder = {
        tableNumber: finalTableNumber,
        items: guestCartService.getItems().map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          priceAtOrder: item.priceAtOrder
        })),
        status: 'pending',
        timestamp: new Date().toISOString(),
        orderSource: this.guestTableNumber ? 'qr-code' : 'manual'
      };

      const result = await DataService.addOrder(newOrder);
      
      NotificationService.hideLoading(loadingNotification);
      
      if (result) {
        guestCartService.clear();
        // Clear local storage only after successful order and if not from QR initial load
        // If it was from QR, it might be a multi-order session
        const urlParams = new URLSearchParams(window.location.search);
        if (!urlParams.get('table')) { // Only clear if not initially loaded via QR
            localStorage.removeItem('guestTableNumber');
            this.guestTableNumber = null; // Clear local state as well
        }
        
        NotificationService.show(
          `🎉 Sifarişiniz uğurla qəbul edildi! Masa ${finalTableNumber} üçün hazırlığa başlandı. Təşəkkür edirik!`, 
          'success', 
          8000
        );
        
        // Add confetti effect (visual enhancement)
        this.showSuccessAnimation();
        
        setTimeout(() => {
          const cartDiv = document.querySelector('#guest-cart');
          if (cartDiv) {
            cartDiv.classList.add('translate-y-full', 'sm:translate-x-full', 'opacity-0');
          }
        }, 3000);
      } else {
        NotificationService.show('❌ Sifariş verilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.', 'error');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      NotificationService.hideLoading(loadingNotification);
      NotificationService.show('🔌 Bağlantı xətası. İnternet bağlantınızı yoxlayın.', 'error');
    } finally {
      placeOrderBtn.disabled = false;
      placeOrderBtn.innerHTML = originalText;
      this.updatePlaceOrderButtonState();
    }
  }

  showSuccessAnimation() {
    // Create a simple success animation
    const successDiv = createElement('div', {
      className: 'fixed inset-0 flex items-center justify-center z-50 pointer-events-none'
    });
    
    successDiv.innerHTML = `
      <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-full shadow-2xl animate-bounce">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l-7 7-7-7m14-8l-7 7-7-7m2 5l14-14m-8 8l-7 7m14-14l-7 7"></path>
        </svg>
      </div>
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(successDiv);
        }, 500);
      }
    }, 2000);
  }
}