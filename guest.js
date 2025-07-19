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
    this.isCartExpanded = false; // To track cart state
    this.isInitialized = false; // Add initialization flag
  }

  async initialize() {
    if (this.isInitialized) return;

    this.loadingElement = NotificationService.showLoading('Məlumatlar yüklənir...');
    try {
        console.log('Loading categories and products...');
        // These will now use the fallback mechanism in dataService
        const [categories, products] = await Promise.all([
          DataService.getCategories(),
          DataService.getProducts()
        ]);
        this.allCategories = categories;
        this.allProducts = products;

        console.log('Categories loaded:', this.allCategories.length);
        console.log('Products loaded:', this.allProducts.length);
        this.isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize guest module with data:', error);
        NotificationService.show('Məlumatlar yüklənərkən xəta baş verdi. Offline rejim aktivdir.', 'error');
        // Use initial data as a last resort
        this.allCategories = INITIAL_CATEGORIES.map((cat, i) => ({ id: `local-cat-${i}`, ...cat }));
        this.allProducts = INITIAL_PRODUCTS.map((p, i) => ({ id: `local-product-${i}`, ...p }));
    } finally {
        NotificationService.hideLoading(this.loadingElement);
    }
  }

  async render(container) {
    // Ensure data is loaded before rendering
    await this.initialize();
    
    // Clear the container before rendering new content
    container.innerHTML = '';

    try {
      // Add a wrapper for guest content to manage padding with fixed cart
      const mainWrapper = createElement('div', { id: 'guest-main-wrapper' });
      mainWrapper.innerHTML = `
        <div id="guest-content-wrapper" class="pb-24 sm:pb-28"></div>
        <div id="cart-container-placeholder"></div>
      `;
      container.appendChild(mainWrapper);

      const guestContentWrapper = mainWrapper.querySelector('#guest-content-wrapper');
      const cartPlaceholder = mainWrapper.querySelector('#cart-container-placeholder');

      this.renderLayout(guestContentWrapper);
      this.renderCart(cartPlaceholder);

      this.setupEventListeners(container);
      this.setupCartSubscription(container);
      this.updateCartDisplay(container);
      
      NotificationService.show('Xoş gəlmisiniz! Menyudan seçim edin.', 'success');
    } catch (error) {
      console.error('Error rendering guest module:', error);
      NotificationService.show('Səhifə yüklənərkən xəta baş verdi.', 'error');
      // Attempt to render a fallback message in the container
      container.innerHTML = `<div class="text-center p-8"><p class="text-red-500">Səhifəni göstərmək mümkün olmadı. Zəhmət olmasa, səhifəni yeniləyin.</p></div>`;
    }
  }

  renderLayout(container) {
    if (!container) return; // Guard against null container
    container.innerHTML = `
      <div class="max-w-7xl mx-auto animate-slide-in">
        ${this.renderTableInfo()}
        
        <div id="main-content" class="mb-8 sm:mb-12">
          ${this.renderCategoriesView()}
        </div>
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p class="font-semibold">Sifarişiniz bu masaya qeyd ediləcək</p>
          </div>
        </div>
      `;
    }
    // New simplified message for when no table is set yet.
    return `
      <div class="text-center mb-8 sm:mb-12">
          <h1 class="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Menyu</h1>
          <p class="text-lg sm:text-xl text-slate-600">Sifariş vermək üçün məhsul seçin</p>
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7 7m-2-2h4m-8 8l-7 7m14-14l-7 7"></path>
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
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M4 6h20M4 12h20M4 18h20"></path>
                       </svg>`,
      'Pizzalar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 9l-7-7 7 7m-2-2h4m-8 8l-7 7m14-14l-7 7"></path>
                  </svg>`,
      'Salatlar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m-8 8l-7 7m14-14l-7 7"></path>
                  </svg>`,
      'İçkilər': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.172a4 4 0 000 6.364L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                 </svg>`,
      'Şirniyyatlar': `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4 4 0 000 6.364L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>`
    };
    return iconMap[categoryName] || `<svg class="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h20M4 12h20M4 18h20"></path>
                                    </svg>`;
  }

  renderCart(container) {
    container.innerHTML = `
      <div id="guest-cart-container" class="fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 transform translate-y-full">
        <div id="cart-bar" class="ultra-modern-card p-3 sm:p-4 mx-auto max-w-3xl rounded-t-2xl cursor-pointer" style="box-shadow: 0 -8px 32px rgba(0,0,0,0.1);">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="relative">
                        <div class="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
                            </svg>
                        </div>
                        <span id="cart-item-count-badge" class="absolute -top-1 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform scale-0 transition-transform duration-300">0</span>
                    </div>
                    <span class="text-slate-700 font-semibold hidden sm:block">Səbətiniz</span>
                </div>
                <div class="flex items-center space-x-3">
                    <span id="cart-total-price-bar" class="text-lg sm:text-xl font-bold text-slate-800">0.00 AZN</span>
                    <button id="toggle-cart-details" class="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center transition-transform duration-500">
                        <svg class="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l14-14m-8 8l-7 7m14-14l-7 7"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        
        <div id="cart-details" class="hidden bg-white p-4 max-w-3xl mx-auto border-t border-slate-200">
            <h2 class="text-lg font-bold text-slate-800 mb-4 text-center">Sifariş Detalları</h2>
            <div id="cart-items" class="space-y-3 mb-4 max-h-64 overflow-y-auto">
            </div>
            <button id="place-order-btn" disabled class="w-full bg-gradient-to-r from-primary-500 to-primary-600 disabled:from-slate-300 disabled:to-slate-400 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed">
              Sifariş Ver
            </button>
        </div>
      </div>
    `;
  }

  async loadProducts() {
    this.allProducts = await DataService.getProducts();
    this.renderProducts(this.allProducts);
  }

  renderProducts(products) {
    try {
      const productListDiv = document.querySelector('#product-list');
      console.log('Product list div found:', !!productListDiv);
      
      if (!productListDiv) {
        console.error('Product list container not found');
        return;
      }
      
      productListDiv.innerHTML = '';
      console.log('Rendering products:', products.length);
      
      if (products.length === 0) {
        productListDiv.innerHTML = `
          <div class="col-span-full text-center py-12">
            <div class="text-slate-400 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <p class="text-slate-500 text-lg">Bu kateqoriyada məhsul yoxdur</p>
          </div>
        `;
      } else {
        products.forEach((product, index) => {
          try {
            const productCard = createProductCard(product);
            productListDiv.appendChild(productCard);
            console.log(`Product card ${index + 1} added:`, product.name);
          } catch (cardError) {
            console.error(`Error creating product card for ${product.name}:`, cardError);
          }
        });
      }
    } catch (error) {
      console.error('Error in renderProducts:', error);
      NotificationService.show('Məhsullar göstərilmədi.', 'error');
    }
  }

  setupEventListeners(container) {
    // Use a single event listener on a persistent parent element for both category and product views.
    container.addEventListener('click', (event) => {
      // Category selection
      const categoryCard = event.target.closest('.category-card');
      if (categoryCard) {
        this.handleCategorySelection(categoryCard.dataset.category);
        return; // Stop further processing
      }
      
      // Back to categories button
      if (event.target.closest('#back-to-categories')) {
        this.showCategoriesView();
        return; // Stop further processing
      }
      
      // Product interactions (delegated from mainContent)
      const productCard = event.target.closest('.product-card');
      if (productCard) {
          this.handleProductInteraction(event);
      }
    });

    // Cart interactions
    const cartContainer = container.querySelector('#guest-cart-container');
    if (cartContainer) {
        cartContainer.addEventListener('click', (event) => {
            const placeOrderBtn = event.target.closest('#place-order-btn');
            const cartItemInteraction = event.target.closest('.remove-item-btn');
            const toggleBtn = event.target.closest('#cart-bar');

            if (placeOrderBtn) {
                this.placeOrder();
            } else if (cartItemInteraction) {
                this.handleCartItemInteraction(event);
            } else if (toggleBtn && !placeOrderBtn && !cartItemInteraction) { // Ensure not clicking on other buttons within cart-bar
                this.toggleCartDetails();
            }
        });
    }
  }

  toggleCartDetails() {
    this.isCartExpanded = !this.isCartExpanded;
    const details = document.querySelector('#cart-details');
    const toggleIcon = document.querySelector('#toggle-cart-details svg');

    if (this.isCartExpanded) {
        details.classList.remove('hidden');
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        details.classList.add('hidden');
        toggleIcon.style.transform = 'rotate(0deg)';
    }
  }

  handleCategorySelection(category) {
    try {
      console.log('Category selected:', category);
      this.selectedCategory = category;
      this.viewMode = 'products';
      
      // Show products view first
      this.showProductsView();
      
      // Filter and show products for selected category
      let filteredProducts = [];
      if (category === 'campaign') {
        filteredProducts = this.allProducts.filter(product => product.isCampaignItem || (product.discountPercentage && product.discountPercentage > 0));
      } else {
        filteredProducts = this.allProducts.filter(product => product.category === category);
      }
      
      console.log('Filtered products:', filteredProducts.length);
      
      // Add a small delay to ensure DOM is updated
      setTimeout(() => {
        this.renderProducts(filteredProducts);
      }, 50);
      
    } catch (error) {
      console.error('Error in handleCategorySelection:', error);
      NotificationService.show('Məhsullar yüklənərkən xəta baş verdi.', 'error');
    }
  }

  showCategoriesView() {
    try {
      this.viewMode = 'categories';
      this.selectedCategory = null;
      const mainContent = document.querySelector('#main-content');
      if (mainContent) {
        mainContent.innerHTML = this.renderCategoriesView();
      } else {
        console.error('Main content not found');
      }
    } catch (error) {
      console.error('Error in showCategoriesView:', error);
    }
  }

  showProductsView() {
    try {
      this.viewMode = 'products';
      const mainContent = document.querySelector('#main-content');
      if (mainContent) {
        mainContent.innerHTML = this.renderProductsView();
        console.log('Products view rendered');
      } else {
        console.error('Main content not found for products view');
      }
    } catch (error) {
      console.error('Error in showProductsView:', error);
    }
  }

  handleProductInteraction(event) {
    const target = event.target;
    const productCard = target.closest('[data-product-id]');
    
    if (!productCard) return;
    
    const productId = productCard.dataset.productId;
    const product = this.allProducts.find(p => p.id === productId);
    
    if (!product) {
      console.error('Product not found:', productId);
      return;
    }
    
    if (target.closest('.quantity-plus-btn')) {
      const quantityInput = productCard.querySelector('input[type="number"]');
      if (quantityInput) {
        const newValue = parseInt(quantityInput.value) + 1;
        quantityInput.value = newValue;
        
        // Add subtle animation
        quantityInput.style.transform = 'scale(1.1)';
        setTimeout(() => {
          quantityInput.style.transform = 'scale(1)';
        }, 150);
      }
      
    } else if (target.closest('.quantity-minus-btn')) {
      const quantityInput = productCard.querySelector('input[type="number"]');
      if (quantityInput) {
        const currentValue = parseInt(quantityInput.value);
        if (currentValue > 1) {
          quantityInput.value = currentValue - 1;
          
          // Add subtle animation
          quantityInput.style.transform = 'scale(0.9)';
          setTimeout(() => {
            quantityInput.style.transform = 'scale(1)';
          }, 150);
        }
      }
    } else if (target.closest('.add-to-cart-btn')) {
      const quantityInput = productCard.querySelector('input[type="number"]');
      const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
      
      // Add loading state to button
      const button = target.closest('.add-to-cart-btn');
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
        if (quantityInput) quantityInput.value = '1';
        
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
    const cartTotalPriceSpan = container.querySelector('#cart-total-price-bar');
    const cartContainer = container.querySelector('#guest-cart-container');
    const cartItemCountBadge = container.querySelector('#cart-item-count-badge');
    
    const cart = guestCartService.getItems();
    const total = guestCartService.getTotal();
    const itemCount = guestCartService.getItemCount();
    
    if (!cartItemsDiv || !cartTotalPriceSpan || !cartContainer || !cartItemCountBadge) return;

    cartItemsDiv.innerHTML = '';
    
    if (cart.length === 0) {
      const emptyState = createElement('div', { className: 'text-center py-8' });
      emptyState.innerHTML = `
        <div class="text-slate-400 mb-4">
          <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18l7-7 7 7m-2-2h4m-8 8l-7 7m14-14l-7 7"></path>
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
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18l7-7 7 7m-2-2h4m-8 8l-7 7m14-14l-7 7"></path>
              </svg>
            </button>
          </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
      });
    }
    
    cartTotalPriceSpan.textContent = `${total.toFixed(2)} AZN`;
    this.updatePlaceOrderButtonState();
    
    // Show/hide cart bar based on items
    if (cart.length > 0) {
      cartContainer.classList.remove('translate-y-full');
      cartItemCountBadge.textContent = itemCount;
      cartItemCountBadge.classList.remove('scale-0');
      cartItemCountBadge.classList.add('scale-100');
    } else {
      cartContainer.classList.add('translate-y-full');
      cartItemCountBadge.classList.add('scale-0');
      cartItemCountBadge.classList.remove('scale-100');
      // Collapse cart if it becomes empty
      if (this.isCartExpanded) {
        this.toggleCartDetails();
      }
    }
  }

  updatePlaceOrderButtonState() {
    const placeOrderBtn = document.querySelector('#place-order-btn');
    if (!placeOrderBtn) return;
    
    // Button is enabled if cart has items. Table number check is moved to placeOrder().
    const isValid = guestCartService.getItems().length > 0;
    
    placeOrderBtn.disabled = !isValid;
    // Update button text based on whether table number is known
    placeOrderBtn.textContent = this.guestTableNumber 
        ? 'Sifarişi Tamamla' 
        : 'Masa Nömrəsini Daxil Et';
  }

  async placeOrder() {
    // If table number is not set, prompt for it.
    if (!this.guestTableNumber) {
      this.promptForTableNumber();
      return;
    }

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
        timestamp: new Date().toISOString(), // This will be replaced by serverTimestamp in DataService
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
        
        // Hide the cart
        setTimeout(() => {
          const cartDiv = document.querySelector('#guest-cart-container');
          if (cartDiv) {
            cartDiv.classList.add('translate-y-full');
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
      placeOrderBtn.innerHTML = this.guestTableNumber ? 'Sifarişi Tamamla' : 'Masa Nömrəsini Daxil Et';
      this.updatePlaceOrderButtonState();
    }
  }

  promptForTableNumber() {
    // Remove any existing modals first
    const existingModal = document.querySelector('.table-prompt-modal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    const modal = createElement('div', {
        className: 'table-prompt-modal fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4'
    });

    modal.innerHTML = `
        <div class="ultra-modern-card p-6 sm:p-8 w-full max-w-md animate-scale-in">
            <div class="text-center mb-6">
                <div class="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6.5-5l2.5 5"></path>
                      </svg>
                    </div>
                <h2 class="text-2xl font-bold text-slate-800 mb-2">Masa Nömrəsi</h2>
                <p class="text-slate-600">Sifarişinizi tamamlamaq üçün masa nömrənizi daxil edin.</p>
            </div>
            
            <form id="table-prompt-form" class="space-y-4">
                <div>
                    <label for="modalTableNumberInput" class="sr-only">Masa Nömrəsi</label>
                    <input type="number" id="modalTableNumberInput" name="tableNumber" min="1" required 
                           class="ultra-modern-input w-full px-4 py-3 rounded-xl text-center text-2xl font-bold"
                           placeholder="Məs. 12">
                </div>
                
                <div class="flex space-x-3 pt-4">
                    <button type="button" id="cancel-table-prompt" class="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all duration-300">
                        Sonra
                    </button>
                    <button type="submit" class="flex-1 premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
                        Təsdiq Et və Sifariş Ver
                    </button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#modalTableNumberInput').focus();

    const closeModal = () => {
        if (modal.parentNode) {
            document.body.removeChild(modal);
        }
    };
    
    modal.querySelector('#cancel-table-prompt').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    modal.querySelector('#table-prompt-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const tableNumberInput = modal.querySelector('#modalTableNumberInput');
        const tableNumber = parseInt(tableNumberInput.value, 10);

        if (tableNumber > 0) {
            this.guestTableNumber = tableNumber;
            localStorage.setItem('guestTableNumber', tableNumber);
            closeModal();
            // Re-render table info and place the order
            this.renderLayout(document.querySelector('#guest-content-wrapper'));
            this.setupEventListeners(document.querySelector('#guest-section'));
            this.placeOrder();
        } else {
            NotificationService.show('Zəhmət olmasa düzgün masa nömrəsi daxil edin.', 'error');
            tableNumberInput.focus();
        }
    });
  }

  showSuccessAnimation() {
    // Create a simple success animation
    const successDiv = createElement('div', {
      className: 'fixed inset-0 flex items-center justify-center z-[100] pointer-events-none'
    });
    
    successDiv.innerHTML = `
      <div class="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-8 rounded-full shadow-2xl animate-bounce">
        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l14-14m-8 8l-7 7m14-14l-7 7"></path>
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