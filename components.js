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
        className: 'text-lg sm:text-xl font-bold text-slate-800 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-accent-600 group-hover:bg-clip-text transition-all duration-400' 
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
            className: 'add-to-cart-btn w-full bg-gradient-to-r from-primary-500 via-primary-600 to-accent-600 hover:from-primary-600 hover:via-accent-600 hover:to-accent-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-400 transform hover:scale-105 hover:-rotate-1' 
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
                    class="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <span class="flex items-center justify-center space-x-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6a2 2 0 00-2 2m0 0V9a2 2 0 002 2h2a2 2 0 002-2m0 0h2m6-4h4m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4"></path>
                    </svg>
                    <span>${product ? 'Yenilə' : 'Əlavə et'}</span>
                </span>
            </button>
        </div>
    `;
    return form;
};

export const createOrderCard = (order) => {
    const card = createElement('div', { 
        className: 'bg-white rounded-2xl shadow-lg p-6 card-hover', 
        dataset: { orderId: order.id } 
    });
    
    const header = createElement('div', { className: 'flex justify-between items-start mb-4' });
    header.appendChild(createElement('h3', { className: 'text-xl font-bold text-gray-800' }, [`Sifariş #${order.id.substring(0, 8)}`]));
    header.appendChild(createElement('span', { className: `px-3 py-1 rounded-full text-sm font-semibold ${StatusUtils.getStatusColor(order.status)}` }, [StatusUtils.getStatusText(order.status)]));
    card.appendChild(header);
    
    card.appendChild(createElement('p', { className: 'text-gray-600 mb-2' }, [`Stol: #${order.tableNumber}`]));
    card.appendChild(createElement('p', { className: 'text-gray-500 text-sm mb-4' }, [new Date(order.createdAt.seconds * 1000).toLocaleString()]));

    const itemsList = createElement('div', { className: 'space-y-2 mb-4' });
    order.items.forEach(item => {
        const itemDiv = createElement('div', { className: 'flex justify-between items-center text-sm' });
        itemDiv.appendChild(createElement('span', { className: 'text-gray-700' }, [`${item.name} x${item.quantity}`]));
        itemDiv.appendChild(createElement('span', { className: 'font-semibold text-gray-800' }, [`${(item.priceAtOrder * item.quantity).toFixed(2)} AZN`]));
        itemsList.appendChild(itemDiv);
    });
    card.appendChild(itemsList);

    const total = order.items.reduce((sum, item) => sum + (item.priceAtOrder * item.quantity), 0);
    card.appendChild(createElement('p', { className: 'text-xl font-bold text-gray-800 mb-4' }, [`Ümumi: ${total.toFixed(2)} AZN`]));

    if (order.status !== 'paid') {
        const actionsDiv = createElement('div', { className: 'flex space-x-2' });
        const nextStatus = StatusUtils.getNextStatus(order.status);
        if (nextStatus) {
            actionsDiv.appendChild(createElement('button', { 
                className: 'flex-1 gradient-btn text-white px-4 py-2 rounded-lg font-semibold transition duration-300 update-status-btn', 
                dataset: { status: nextStatus.key } 
            }, [nextStatus.text]));
        }
        card.appendChild(actionsDiv);
    }

    return card;
};

export const createTableCard = (table) => {
    const card = createElement('div', { 
        className: `bg-white rounded-2xl shadow-lg p-6 card-hover ${table.isOccupied ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`, 
        dataset: { tableId: table.id } 
    });
    
    card.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-800">Masa ${table.number}</h3>
            <span class="px-3 py-1 rounded-full text-sm font-semibold ${table.isOccupied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                ${table.isOccupied ? 'Məşğul' : 'Boş'}
            </span>
        </div>
        <p class="text-gray-600 mb-4">Tutum: ${table.capacity} nəfər</p>
        <div class="flex space-x-2">
            <button class="flex-1 bg-blue-500 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-600 transition qr-code-btn" data-table-id="${table.id}">
                QR Kod
            </button>
            <button class="flex-1 bg-gray-500 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-600 transition edit-table-btn" data-table-id="${table.id}">
                Redaktə
            </button>
        </div>
    `;
    
    return card;
};

export const createAnalyticsCard = (title, value, subtitle = '', color = 'blue') => {
    const card = createElement('div', { className: 'admin-stat-card p-6' });
    
    const iconMap = {
        'blue': `<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2m0 0V9a2 2 0 002 2h2a2 2 0 002-2m0 0h2m6-4h4m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4"></path>
                 </svg>`,
        'green': `<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v6m0 0v6m0-6h6m-6 0H6a2 2 0 00-2 2m0 0V9a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 002-2V9a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z"></path>
                 </svg>`,
        'purple': `<svg class="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"></path>
                   </svg>`,
        'orange': `<svg class="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                   </svg>`
    };
    
    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex-1">
                <div class="flex items-center space-x-3 mb-2">
                    ${iconMap[color] || iconMap['blue']}
                    <h3 class="text-sm font-bold text-slate-600 uppercase tracking-wide">${title}</h3>
                </div>
                <p class="text-3xl font-bold bg-gradient-to-r from-${color}-500 to-${color}-600 bg-clip-text text-transparent">${value}</p>
                ${subtitle ? `<p class="text-sm text-slate-500 mt-1">${subtitle}</p>` : ''}
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-${color}-100 to-${color}-200 rounded-full flex items-center justify-center">
                ${iconMap[color] || iconMap['blue']}
            </div>
        </div>
    `;
    
    return card;
};

export const createKitchenOrderCard = (order) => {
    const card = createElement('div', { 
        className: `kitchen-card p-4 sm:p-5 ${StatusUtils.getKitchenStatusBorder(order.status)} hover:shadow-2xl transition-all duration-400`, 
        dataset: { 
            orderId: order.id,
            timestamp: JSON.stringify(order.createdAt),
            tableNumber: order.tableNumber
        } 
    });
    
    let timeElapsed = '...';
    let urgencyClass = 'text-green-500';
    
    if (order.createdAt && order.createdAt.seconds) {
        const orderTimestamp = new Date(order.createdAt.seconds * 1000 + (order.createdAt.nanoseconds / 1000000));
        timeElapsed = Math.floor((new Date() - orderTimestamp) / 1000 / 60);
        
        if (timeElapsed > 15) {
            urgencyClass = 'text-red-500 animate-pulse';
            card.classList.add('urgent');
        } else if (timeElapsed > 10) {
            urgencyClass = 'text-amber-500';
        }
    }
    
    card.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start mb-4 sm:mb-5 space-y-2 sm:space-y-0">
            <div class="space-y-1">
                <h3 class="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Masa ${order.tableNumber}</h3>
                <p class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full inline-block">Sifariş #${order.id.substring(0, 6)}</p>
            </div>
            <div class="flex items-center space-x-2 bg-white/60 backdrop-blur-sm px-3 py-2 rounded-full">
                <svg class="order-timer-icon w-4 h-4 ${urgencyClass}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="order-timer text-sm font-bold ${urgencyClass}">${timeElapsed} dəqiqə</p>
            </div>
        </div>
        
        <div class="space-y-2 mb-4 sm:mb-5">
            ${order.items.map(item => `
                <div class="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                    <span class="font-semibold text-slate-700 text-sm">${item.name}</span>
                    <span class="bg-gradient-to-r from-primary-500 to-accent-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">×${item.quantity}</span>
                </div>
            `).join('')}
        </div>
        
        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            ${order.status === 'pending' ? `
                <button class="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white px-3 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 kitchen-status-btn text-sm" data-status="in-prep">
                    <span class="flex items-center justify-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6a2 2 0 00-2 2m0 0V9a2 2 0 002 2h2a2 2 0 002-2m0 0h2m6-4h4m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4m6-4h2m6 0h4"></path>
                        </svg>
                        <span>Hazırlamaya başla</span>
                    </span>
                </button>
            ` : ''}
            ${order.status === 'in-prep' ? `
                <button class="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-3 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 kitchen-status-btn text-sm" data-status="ready">
                    <span class="flex items-center justify-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        <span>Hazırdır</span>
                    </span>
                </button>
            ` : ''}
            ${order.status === 'ready' ? `
                <div class="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-3 rounded-xl font-semibold shadow-lg text-center text-sm flex items-center justify-center space-x-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Servisə hazır</span>
                </div>
            ` : ''}
        </div>
    `;
    
    return card;
};

export const createDiscountForm = (discount = null) => {
    const form = createElement('form', {
        id: discount ? `edit-discount-form-${discount.id}` : 'add-discount-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${discount ? discount.id : ''}">
        <div>
            <label for="discountName" class="block text-sm font-bold text-slate-700 mb-2">Endirim adı</label>
            <input type="text" id="discountName" name="name" value="${discount ? discount.name : ''}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. Yay Endirimi">
        </div>
        <div>
            <label for="discountDescription" class="block text-sm font-bold text-slate-700 mb-2">Təsvir</label>
            <textarea id="discountDescription" name="description" rows="3"
                      class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 resize-none"
                      placeholder="Endirim haqqında qısa məlumat...">${discount ? discount.description : ''}</textarea>
        </div>
        <div>
            <label for="discountPercentage" class="block text-sm font-bold text-slate-700 mb-2">Endirim Faizi (%)</label>
            <input type="number" id="discountPercentage" name="percentage" min="0" max="100" value="${discount ? discount.percentage : 0}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="0">
        </div>
        <div class="flex items-center space-x-2">
            <input type="checkbox" id="discountIsActive" name="isActive" ${discount === null || discount.isActive ? 'checked' : ''}
                   class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2">
            <label for="discountIsActive" class="text-sm font-bold text-slate-700">Aktivdir</label>
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${discount ? 'Endirimi Yenilə' : 'Endirim Əlavə Et'}
        </button>
    `;
    return form;
};

export const createTableForm = (table = null) => {
    const form = createElement('form', {
        id: table ? `edit-table-form-${table.id}` : 'add-table-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${table ? table.id : ''}">
        <div>
            <label for="tableNumber" class="block text-sm font-bold text-slate-700 mb-2">Masa Nömrəsi</label>
            <input type="number" id="tableNumber" name="number" value="${table ? table.number : ''}" required min="1"
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. 5">
        </div>
        <div>
            <label for="tableCapacity" class="block text-sm font-bold text-slate-700 mb-2">Tutum (nəfər)</label>
            <input type="number" id="tableCapacity" name="capacity" value="${table ? table.capacity : ''}" required min="1"
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. 4">
        </div>
        <div class="flex items-center space-x-2">
            <input type="checkbox" id="tableIsOccupied" name="isOccupied" ${table && table.isOccupied ? 'checked' : ''}
                   class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 focus:ring-2">
            <label for="tableIsOccupied" class="text-sm font-bold text-slate-700">Məşğuldur</label>
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${table ? 'Masayı Yenilə' : 'Masa Əlavə Et'}
        </button>
    `;
    return form;
};

export const createInventoryItemForm = (item = null) => {
    const form = createElement('form', {
        id: item ? `edit-inventory-item-form-${item.id}` : 'add-inventory-item-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${item ? item.id : ''}">
        <div>
            <label for="itemName" class="block text-sm font-bold text-slate-700 mb-2">Məhsul adı</label>
            <input type="text" id="itemName" name="name" value="${item ? item.name : ''}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. Pomidor">
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="itemQuantity" class="block text-sm font-bold text-slate-700 mb-2">Miqdar</label>
                <input type="number" id="itemQuantity" name="quantity" value="${item ? item.quantity : 0}" required min="0" step="0.01"
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0">
            </div>
            <div>
                <label for="itemUnit" class="block text-sm font-bold text-slate-700 mb-2">Vahid</label>
                <input type="text" id="itemUnit" name="unit" value="${item ? item.unit : ''}" required
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="Məs. kq, litr, ədəd">
            </div>
        </div>
        <div>
            <label for="lowStockThreshold" class="block text-sm font-bold text-slate-700 mb-2">Minimum Stok Həddi</label>
            <input type="number" id="lowStockThreshold" name="lowStockThreshold" value="${item ? item.lowStockThreshold : 0}" min="0" step="0.01"
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="10">
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${item ? 'Məhsulu Yenilə' : 'Məhsul Əlavə Et'}
        </button>
    `;
    return form;
};

export const createPurchaseForm = (purchase = null) => {
    const form = createElement('form', {
        id: purchase ? `edit-purchase-form-${purchase.id}` : 'add-purchase-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${purchase ? purchase.id : ''}">
        <div>
            <label for="purchaseItemName" class="block text-sm font-bold text-slate-700 mb-2">Məhsul adı</label>
            <input type="text" id="purchaseItemName" name="itemName" value="${purchase ? purchase.itemName : ''}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. Un">
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="purchaseQuantity" class="block text-sm font-bold text-slate-700 mb-2">Miqdar</label>
                <input type="number" id="purchaseQuantity" name="quantity" value="${purchase ? purchase.quantity : 0}" required min="0" step="0.01"
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0">
            </div>
            <div>
                <label for="purchaseUnitCost" class="block text-sm font-bold text-slate-700 mb-2">Vahid Qiyməti (AZN)</label>
                <input type="number" id="purchaseUnitCost" name="unitCost" value="${purchase ? purchase.unitCost : 0}" required min="0" step="0.01"
                       class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                       placeholder="0.00">
            </div>
        </div>
        <div>
            <label for="purchaseSupplier" class="block text-sm font-bold text-slate-700 mb-2">Təchizatçı</label>
            <input type="text" id="purchaseSupplier" name="supplier" value="${purchase ? purchase.supplier : ''}"
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. Market X">
        </div>
        <div>
            <label for="purchaseNotes" class="block text-sm font-bold text-slate-700 mb-2">Qeydlər</label>
            <textarea id="purchaseNotes" name="notes" rows="3"
                      class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200 resize-none"
                      placeholder="Əlavə qeydlər...">${purchase ? purchase.notes : ''}</textarea>
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${purchase ? 'Alışı Yenilə' : 'Alış Əlavə Et'}
        </button>
    `;
    return form;
};

export const createEmployeeForm = (employee = null) => {
    const form = createElement('form', {
        id: employee ? `edit-employee-form-${employee.id}` : 'add-employee-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${employee ? employee.id : ''}">
        <div>
            <label for="employeeEmail" class="block text-sm font-bold text-slate-700 mb-2">Email</label>
            <input type="email" id="employeeEmail" name="email" value="${employee ? employee.email : ''}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="işçi@restoran.com">
        </div>
        <div>
            <label for="employeePassword" class="block text-sm font-bold text-slate-700 mb-2">Şifrə</label>
            <input type="password" id="employeePassword" name="password" ${employee ? '' : 'required'}
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="${employee ? 'Dəyişmək üçün yeni şifrə daxil edin' : '••••••••'}">
        </div>
        <div>
            <label for="employeeRole" class="block text-sm font-bold text-slate-700 mb-2">Rol</label>
            <select id="employeeRole" name="role" required
                    class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200">
                <option value="">Rol seçin</option>
                <option value="waiter" ${employee && employee.role === 'waiter' ? 'selected' : ''}>Ofisant</option>
                <option value="cashier" ${employee && employee.role === 'cashier' ? 'selected' : ''}>Kassir</option>
                <option value="manager" ${employee && employee.role === 'manager' ? 'selected' : ''}>Menecer</option>
                <option value="admin" ${employee && employee.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${employee ? 'İşçini Yenilə' : 'İşçi Əlavə Et'}
        </button>
    `;
    return form;
};

export const createCategoryForm = (category = null) => {
    const form = createElement('form', {
        id: category ? `edit-category-form-${category.id}` : 'add-category-form',
        className: 'modern-form p-6 space-y-4'
    });

    form.innerHTML = `
        <input type="hidden" name="id" value="${category ? category.id : ''}">
        <div>
            <label for="categoryName" class="block text-sm font-bold text-slate-700 mb-2">Kateqoriya adı</label>
            <input type="text" id="categoryName" name="name" value="${category ? category.name : ''}" required
                   class="w-full px-4 py-3 rounded-xl focus:outline-none transition-all duration-200"
                   placeholder="Məs. Səhər Yeməkləri">
        </div>
        <button type="submit" 
                class="w-full premium-gradient-btn text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105">
            ${category ? 'Kateqoriyanı Yenilə' : 'Kateqoriya Əlavə Et'}
        </button>
    `;
    return form;
};