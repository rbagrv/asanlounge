import { StatusUtils } from './utils/statusUtils.js';

export const createElement = (tag, attributes = {}, children = []) => {
    const element = document.createElement(tag);
    for (const key in attributes) {
        if (key === 'className') {
            element.className = attributes[key];
        } else if (key === 'style') {
            Object.assign(element.style, attributes[key]);
        } else if (key === 'dataset') {
            for (const dataKey in attributes[key]) {
                element.dataset[dataKey] = attributes[key][dataKey];
            }
        } else {
            element.setAttribute(key, attributes[key]);
        }
    }
    
    const childrenArray = Array.isArray(children) ? children : (children !== undefined && children !== null ? [children] : []);
    
    childrenArray.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    return element;
};

export const createProductCard = (product, actions = true) => {
    const card = createElement('div', { 
        className: 'product-card p-4 sm:p-6 group cursor-pointer float-animation', 
        dataset: { productId: product.id } 
    });
    
    const imgContainer = createElement('div', { className: 'relative mb-4 sm:mb-6 overflow-hidden rounded-2xl' });
    const img = createElement('img', { 
        src: product.imageUrl, 
        alt: product.name,
        className: 'w-full h-40 sm:h-56 object-cover transition-all duration-500 group-hover:scale-115'
    });
    
    // Add error handling for images
    img.onerror = function() {
        this.src = 'https://placehold.co/400x300/e0f2fe/0284c7?text=No+Image';
    };
    
    imgContainer.appendChild(img);
    
    // Enhanced overlay gradient
    const overlay = createElement('div', { 
        className: 'absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500' 
    });
    imgContainer.appendChild(overlay);
    
    if (product.discountPercentage > 0) {
        const discountBadge = createElement('span', { 
            className: 'absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-red-500 via-red-600 to-pink-500 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-xl animate-pulse' 
        }, [`-${product.discountPercentage}%`]);
        imgContainer.appendChild(discountBadge);
    }
    
    card.appendChild(imgContainer);
    
    const info = createElement('div', { className: 'space-y-3 sm:space-y-4' });
    
    // Enhanced product title
    const title = createElement('h3', { 
        className: 'text-lg sm:text-xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text text-transparent transition-all duration-400' 
    }, [product.name]);
    info.appendChild(title);
    
    // Enhanced description
    const description = createElement('p', { 
        className: 'text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2 group-hover:text-slate-700 transition-colors duration-300' 
    }, [product.description]);
    info.appendChild(description);

    // Enhanced price section
    const priceSection = createElement('div', { className: 'flex items-center justify-between' });
    const priceContainer = createElement('div', { className: 'space-y-1' });
    
    if (product.discountPercentage > 0) {
        const originalPrice = product.price.toFixed(2);
        const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);
        
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xs sm:text-sm text-slate-400 line-through' 
        }, [`${originalPrice} AZN`]));
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-500 via-red-600 to-pink-500 bg-clip-text text-transparent animate-pulse' 
        }, [`${discountedPrice} AZN`]));
    } else {
        priceContainer.appendChild(createElement('span', { 
            className: 'text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 via-primary-600 to-accent-600 bg-clip-text text-transparent' 
        }, [`${product.price.toFixed(2)} AZN`]));
    }
    
    priceSection.appendChild(priceContainer);

    // Enhanced stock info
    const stockInfo = createElement('div', { className: 'text-right' });
    const stockQuantity = product.stock !== undefined && product.stock !== null ? product.stock : 0;
    const stockStatus = stockQuantity > 10 ? 'var' : stockQuantity > 0 ? 'az' : 'bitib';
    const stockColor = stockStatus === 'var' ? 'text-green-600' : stockStatus === 'az' ? 'text-amber-600' : 'text-red-600';
    const stockText = stockStatus === 'var' ? `Stokda: ${stockQuantity}` : stockStatus === 'az' ? `Az qalıb: ${stockQuantity}` : 'Stokda yoxdur';
    
    stockInfo.appendChild(createElement('span', { className: `text-xs sm:text-sm font-semibold ${stockColor} bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm`}, [stockText]));
    priceSection.appendChild(stockInfo);

    info.appendChild(priceSection);
    card.appendChild(info);

    if (actions && stockQuantity > 0) {
        const actionsDiv = createElement('div', { className: 'mt-4 sm:mt-6 space-y-3 sm:space-y-4' });
        
        // Enhanced quantity selector
        const quantityDiv = createElement('div', { className: 'flex items-center justify-center space-x-3 sm:space-x-4' });
        const minusBtn = createElement('button', { 
            className: 'quantity-minus-btn w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 flex items-center justify-center transition-all duration-300 hover:scale-125 shadow-lg hover:shadow-xl' 
        });
        minusBtn.innerHTML = '<span class="text-lg font-bold">−</span>';
        
        const quantityInput = createElement('input', {
            type: 'number',
            value: '1',
            min: '1',
            max: stockQuantity.toString(),
            className: 'w-12 sm:w-16 text-center bg-gradient-to-r from-white to-slate-50 border-2 border-slate-200 rounded-xl py-2 focus:outline-none focus:border-primary-500 focus:bg-white focus:shadow-lg transition-all duration-300 text-sm sm:text-base font-semibold'
        });
        
        const plusBtn = createElement('button', { 
            className: 'quantity-plus-btn w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 flex items-center justify-center transition-all duration-300 hover:scale-125 shadow-lg hover:shadow-xl' 
        });
        plusBtn.innerHTML = '<span class="text-lg font-bold">+</span>';
        
        quantityDiv.appendChild(minusBtn);
        quantityDiv.appendChild(quantityInput);
        quantityDiv.appendChild(plusBtn);
        actionsDiv.appendChild(quantityDiv);
        
        // Enhanced add to cart button
        const addButton = createElement('button', { 
            className: 'add-to-cart-btn w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-400 transform hover:scale-105 hover:-rotate-1' 
        });
        addButton.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l2.5 5M9.99 17.93l3.76 1.83"></path>
                </svg>
                <span>Səbətə əlavə et</span>
            </span>
        `;
        actionsDiv.appendChild(addButton);
        card.appendChild(actionsDiv);
    } else if (actions && stockQuantity <= 0) {
        const outOfStockDiv = createElement('div', { className: 'mt-4 sm:mt-6' });
        const outOfStockBtn = createElement('button', { 
            className: 'w-full bg-slate-300 text-slate-500 px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold cursor-not-allowed',
            disabled: true
        });
        outOfStockBtn.innerHTML = 'Stokda yoxdur';
        outOfStockDiv.appendChild(outOfStockBtn);
        card.appendChild(outOfStockDiv);
    }

    return card;
};

export const createAdminProductForm = (product = null, categories = []) => {
    const form = createElement('form', { 
        id: product ? `edit-product-form-${product.id}` : 'add-product-form',
        className: 'modern-form p-8 space-y-6'
    });
    
    form.innerHTML = `
        <input type="hidden" name="id" value="${product ? product.id : ''}">
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="name" class="block text-sm font-bold text-slate-700 mb-3">Məhsul adı</label>
                <input type="text" id="name" name="name" value="${product ? product.name : ''}" required 
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="Məs. Burger">
            </div>
            
            <div>
                <label for="price" class="block text-sm font-bold text-slate-700 mb-3">Qiymət (AZN)</label>
                <input type="number" id="price" name="price" step="0.01" value="${product ? product.price : ''}" required 
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0.00">
            </div>
        </div>
        
        <div>
            <label for="description" class="block text-sm font-bold text-slate-700 mb-3">Təsvir</label>
            <textarea id="description" name="description" required rows="4"
                      class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 resize-none"
                      placeholder="Məhsul haqqında məlumat...">${product ? product.description : ''}</textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="imageUrl" class="block text-sm font-bold text-slate-700 mb-3">Şəkil URL</label>
                <input type="text" id="imageUrl" name="imageUrl" value="${product ? product.imageUrl : ''}" required 
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="https://...">
            </div>
            
            <div>
                <label for="category" class="block text-sm font-bold text-slate-700 mb-3">Kateqoriya</label>
                <select id="category" name="category" required
                        class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200">
                    <option value="">Kateqoriya seçin</option>
                    ${categories.map(cat => `
                        <option value="${cat.name}" ${product && product.category === cat.name ? 'selected' : ''}>${cat.name}</option>
                    `).join('')}
                </select>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label for="discountPercentage" class="block text-sm font-bold text-slate-700 mb-3">Endirim (%)</label>
                <input type="number" id="discountPercentage" name="discountPercentage" min="0" max="100" value="${product ? product.discountPercentage : 0}"
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0">
            </div>
            
            <div>
                <label for="stock" class="block text-sm font-bold text-slate-700 mb-3">Stok Miqdarı</label>
                <input type="number" id="stock" name="stock" min="0" value="${product ? product.stock : 0}" required 
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0">
            </div>
        </div>
        
        <div class="flex items-center space-x-3 pt-8">
            <input type="checkbox" id="isCampaignItem" name="isCampaignItem" ${product && product.isCampaignItem ? 'checked' : ''}
                   class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2">
            <label for="isCampaignItem" class="text-sm font-bold text-slate-700">Kampaniya məhsulu</label>
        </div>
        
        <div class="flex space-x-4 pt-4">
            <button type="submit" 
                    class="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-rotate-1">
                <span class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>${product ? 'Yadda saxla' : 'Əlavə et'}</span>
                </span>
            </button>
        </div>
    `;
    
    return form;
};

export const createOrderCard = (order) => {
    const card = createElement('div', { 
        className: 'order-card p-4 sm:p-6 group cursor-pointer float-animation' 
    });
    
    const orderInfo = createElement('div', { className: 'space-y-3 sm:space-y-4' });
    
    // Enhanced order title
    const title = createElement('h3', { 
        className: 'text-lg sm:text-xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text text-transparent transition-all duration-400' 
    }, [order.orderId]);
    orderInfo.appendChild(title);
    
    // Enhanced order status
    const status = createElement('p', { 
        className: 'text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2 group-hover:text-slate-700 transition-colors duration-300' 
    }, [order.status]);
    orderInfo.appendChild(status);

    // Enhanced price section
    const priceSection = createElement('div', { className: 'flex items-center justify-between' });
    const priceContainer = createElement('div', { className: 'space-y-1' });
    
    priceContainer.appendChild(createElement('span', { 
        className: 'text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 via-primary-600 to-accent-600 bg-clip-text text-transparent' 
    }, [`${order.totalPrice.toFixed(2)} AZN`]));
    priceSection.appendChild(priceContainer);

    // Enhanced stock info
    const stockInfo = createElement('div', { className: 'text-right' });
    const stockQuantity = order.stock !== undefined && order.stock !== null ? order.stock : 0;
    const stockStatus = stockQuantity > 10 ? 'var' : stockQuantity > 0 ? 'az' : 'bitib';
    const stockColor = stockStatus === 'var' ? 'text-green-600' : stockStatus === 'az' ? 'text-amber-600' : 'text-red-600';
    const stockText = stockStatus === 'var' ? `Stokda: ${stockQuantity}` : stockStatus === 'az' ? `Az qalıb: ${stockQuantity}` : 'Stokda yoxdur';
    
    stockInfo.appendChild(createElement('span', { className: `text-xs sm:text-sm font-semibold ${stockColor} bg-white/60 px-2 py-1 rounded-full backdrop-blur-sm`}, [stockText]));
    priceSection.appendChild(stockInfo);

    orderInfo.appendChild(priceSection);
    card.appendChild(orderInfo);

    return card;
};

export const createKitchenOrderCard = (order) => {
    const nextStatus = StatusUtils.getNextStatus(order.status);

    const card = createElement('div', {
        className: `kitchen-card p-3 sm:p-4 rounded-2xl shadow-lg animate-fade-in ${StatusUtils.getKitchenStatusBorder(order.status)}`,
        dataset: { 
            orderId: order.id,
            tableNumber: order.tableNumber,
            timestamp: JSON.stringify(order.createdAt)
        }
    });

    // Header
    const header = createElement('div', { className: 'flex justify-between items-center mb-3' });
    const tableInfo = createElement('div', { className: 'font-bold text-slate-800 text-base sm:text-lg' }, [`Masa ${order.tableNumber}`]);
    const timerInfo = createElement('div', { className: 'flex items-center text-xs sm:text-sm' });
    const timerIcon = createElement('svg', { className: 'order-timer-icon w-4 h-4 mr-1 text-slate-500', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' });
    timerIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c1.104 0 2.104.448 2.828 1.172a4 4 0 015.657 5.656l-9.192 9.192a1 1 0 01-1.414 0l-9.192-9.192a4 4 0 015.657-5.656A4.004 4.004 0 0112 8zm0 0v.01"></path>`;
    const timerText = createElement('span', { className: 'order-timer font-medium text-slate-500' }, ['...']);
    timerInfo.appendChild(timerIcon);
    timerInfo.appendChild(timerText);
    header.appendChild(tableInfo);
    header.appendChild(timerInfo);
    card.appendChild(header);

    // Items list
    const itemsList = createElement('ul', { className: 'space-y-2 mb-4 border-t border-b border-slate-200 py-3' });
    order.items.forEach(item => {
        const listItem = createElement('li', { className: 'flex justify-between items-center text-sm' });
        const itemName = createElement('span', { className: 'text-slate-700 flex-1' }, [item.name]);
        const itemQuantity = createElement('span', { className: 'font-semibold text-slate-800 ml-2' }, [`x${item.quantity}`]);
        listItem.appendChild(itemName);
        listItem.appendChild(itemQuantity);
        itemsList.appendChild(listItem);
    });
    card.appendChild(itemsList);
    
    // Footer with action button
    const footer = createElement('div', { className: 'mt-2' });
    if (nextStatus && order.status !== 'ready') {
        const actionButton = createElement('button', {
            className: 'kitchen-status-btn w-full premium-gradient-btn text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105',
            dataset: { status: nextStatus.key }
        });
        actionButton.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <span>${nextStatus.text}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                </svg>
            </span>
        `;
        footer.appendChild(actionButton);
    } else {
        const statusBadge = createElement('div', {
            className: `px-3 py-1.5 rounded-full text-center text-sm font-semibold ${StatusUtils.getKitchenStatusBadgeColor(order.status)}`
        }, [StatusUtils.getStatusText(order.status)]);
        footer.appendChild(statusBadge);
    }
    
    if (order.status === 'ready') {
        const serveButton = createElement('button', {
            className: 'kitchen-status-btn w-full mt-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 transform hover:scale-105',
            dataset: { status: 'served' }
        });
         serveButton.innerHTML = `
            <span class="flex items-center justify-center space-x-2">
                <span>Servis Et</span>
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </span>
        `;
        footer.appendChild(serveButton);
    }
    
    card.appendChild(footer);

    return card;
};

export const createAnalyticsCard = (title, value, trend, color) => {
    const card = createElement('div', { className: `admin-stat-card p-6 relative overflow-hidden` });
    
    const colors = {
        blue: 'from-blue-500 to-sky-500',
        green: 'from-green-500 to-emerald-500',
        purple: 'from-purple-500 to-violet-500',
        orange: 'from-orange-500 to-amber-500'
    };

    const iconColors = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600'
    };

    const trendHtml = trend ? `
        <span class="text-xs font-semibold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}">
            ${trend}
        </span>
    ` : '';

    const iconSvg = {
        blue: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13l4 4L19 7"></path></svg>`,
        green: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13l4 4L19 7"></path></svg>`,
        purple: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13l4 4L19 7"></path></svg>`,
        orange: `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13l4 4L19 7"></path></svg>`
    };

    card.innerHTML = `
        <div class="flex items-start justify-between">
            <div>
                <h4 class="text-sm font-semibold text-slate-500 uppercase">${title}</h4>
                <p class="text-3xl font-bold text-slate-800 mt-2">${value}</p>
                <div class="mt-2">${trendHtml}</div>
            </div>
            <div class="p-3 rounded-full ${iconColors[color] || iconColors.blue}">
                ${iconSvg[color] || iconSvg.blue}
            </div>
        </div>
    `;
    
    return card;
};

export const createPOSProductCard = (product) => {
    const card = createElement('div', {
        className: 'pos-product-card transition-all duration-200 ease-in-out',
        dataset: { productId: product.id }
    });
    
    const isOutOfStock = product.stock !== undefined && product.stock <= 0;
    if (isOutOfStock) {
        card.classList.add('out-of-stock');
    }

    card.innerHTML = `
        <div class="relative">
            <img src="${product.imageUrl}" alt="${product.name}" class="w-full h-24 object-cover" onerror="this.src='https://placehold.co/200x150/e0f2fe/0284c7?text=No+Image'">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <span class="product-name absolute bottom-1 left-2 text-white text-xs font-semibold p-1">${product.name}</span>
            <span class="product-price absolute top-1 right-1 bg-primary-500 text-white text-xs font-bold px-2 py-1 rounded-full">${product.price.toFixed(2)} AZN</span>
            ${isOutOfStock ? `<div class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">STOKDA YOXDUR</div>` : ''}
        </div>
    `;
    return card;
};

export const createPOSCartItem = (item, index) => {
    const itemEl = createElement('div', {
        className: 'pos-cart-item flex items-center space-x-2 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors',
        dataset: { index: index }
    });

    itemEl.innerHTML = `
        <div class="flex-1">
            <p class="text-sm font-semibold text-slate-800">${item.name}</p>
            <p class="text-xs text-slate-500">${item.priceAtOrder.toFixed(2)} AZN</p>
        </div>
        <div class="flex items-center space-x-1">
            <button data-action="decrease" class="cart-quantity-btn">-</button>
            <input type="number" value="${item.quantity}" class="w-10 text-center font-semibold bg-transparent border-0" min="0">
            <button data-action="increase" class="cart-quantity-btn">+</button>
        </div>
        <span class="w-20 text-right font-bold text-slate-800 text-sm">${(item.priceAtOrder * item.quantity).toFixed(2)} AZN</span>
        <button data-action="remove" class="cart-remove-btn">&times;</button>
    `;
    return itemEl;
};

export const createPOSOrderListItem = (order, isSelected = false) => {
    const itemEl = createElement('div', {
        className: `pos-order-list-item p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${isSelected ? 'bg-primary-100 border-primary-500' : 'bg-white hover:bg-slate-50 border-transparent'}`,
        dataset: { orderId: order.id }
    });

    const statusText = StatusUtils.getStatusText(order.status);
    const statusColor = StatusUtils.getStatusColor(order.status);

    itemEl.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="font-bold text-slate-700">Masa ${order.tableNumber}</span>
            <span class="text-sm font-semibold text-green-600">${order.total.toFixed(2)} AZN</span>
        </div>
        <div class="flex justify-between items-center mt-1 text-xs">
            <span class="${statusColor} px-2 py-1 rounded-full font-medium">${statusText}</span>
            <span class="text-slate-500">${new Date(order.createdAt.seconds * 1000).toLocaleTimeString()}</span>
        </div>
    `;
    return itemEl;
};

export const createTableCard = (table) => {
    const card = createElement('div', { className: 'ultra-modern-card p-4' });
    card.innerHTML = `
        <h4 class="font-bold">Masa ${table.number}</h4>
        <p>Tutum: ${table.capacity}</p>
        <p>Status: ${table.isOccupied ? 'Dolu' : 'Boş'}</p>
        <button class="edit-table-btn" data-table-id="${table.id}">Redaktə Et</button>
        <button class="delete-table-btn" data-table-id="${table.id}">Sil</button>
    `;
    return card;
};

export const createTableForm = (table = null) => {
    const form = createElement('form', {});
    form.innerHTML = `
        <input type="hidden" name="id" value="${table ? table.id : ''}">
        <div>
            <label>Masa Nömrəsi</label>
            <input type="number" name="number" value="${table ? table.number : ''}" required>
        </div>
        <div>
            <label>Tutum</label>
            <input type="number" name="capacity" value="${table ? table.capacity : ''}" required>
        </div>
        <div>
            <label>
                <input type="checkbox" name="isOccupied" ${table && table.isOccupied ? 'checked' : ''}>
                Dolu
            </label>
        </div>
        <button type="submit">${table ? 'Yenilə' : 'Əlavə et'}</button>
    `;
    return form;
};

export const createCategoryForm = (category = null) => {
    const form = createElement('form', {});
    form.innerHTML = `
        <input type="hidden" name="id" value="${category ? category.id : ''}">
        <div>
            <label for="name">Kateqoriya Adı</label>
            <input type="text" id="name" name="name" value="${category ? category.name : ''}" required class="ultra-modern-input w-full mt-1 px-3 py-2 rounded-lg">
        </div>
        <button type="submit" class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold mt-4">
            ${category ? 'Yadda Saxla' : 'Əlavə Et'}
        </button>
    `;
    return form;
};

export const createDiscountForm = (discount = null) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Discount form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createInventoryItemForm = (item = null, products = [], suppliers = []) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Inventory form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createPurchaseForm = (purchase = null, inventoryItems = []) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Purchase form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createEmployeeForm = (user = null) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Employee form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createRecipeForm = (recipe = null, products = [], inventoryItems = []) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Recipe form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createSupplierForm = (supplier = null) => {
    const form = createElement('form', {});
    form.innerHTML = `<p>Supplier form placeholder.</p><button type="submit">Save</button>`;
    return form;
};

export const createUserCard = (user) => {
    const card = createElement('div', { className: 'ultra-modern-card p-4' });
    card.innerHTML = `
        <h4 class="font-bold">${user.name || user.email}</h4>
        <p>Email: ${user.email}</p>
        <p>Rol: ${user.role || 'Qonaq'}</p>
    `;
    return card;
};

export const createSalesTableRow = (sale) => {
    const row = createElement('tr', { className: 'bg-white border-b hover:bg-slate-50' });
    row.innerHTML = `
        <td class="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">${sale.id.substring(0, 8)}...</td>
        <td class="px-6 py-4">${sale.tableNumber}</td>
        <td class="px-6 py-4">${sale.date}</td>
        <td class="px-6 py-4 max-w-xs truncate" title="${sale.items}">${sale.items}</td>
        <td class="px-6 py-4">${sale.employee}</td>
        <td class="px-6 py-4 capitalize">${sale.paymentType}</td>
        <td class="px-6 py-4 font-bold text-green-600">${sale.total.toFixed(2)} AZN</td>
    `;
    return row;
};

export const createPOSCategoryCard = (category) => {
    const card = createElement('div', {
        className: 'pos-category-card',
        dataset: { categoryId: category.id }
    });
    card.textContent = category.name;
    return card;
};