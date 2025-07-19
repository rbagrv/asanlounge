import { createElement, createKitchenOrderCard } from './components.js';
import { db } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { NotificationService } from './utils/notificationService.js';
import { StatusUtils } from './utils/statusUtils.js';

let audioContext;
let newOrderSoundBuffer;
let intervalId;
let knownOrderIds = new Set();

const initAudio = async () => {
    try {
        // Create AudioContext after a user interaction
        // This event listener ensures the context is resumed/created when the user interacts.
        document.body.addEventListener('click', async () => {
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            // Decode audio data only once and after context is ready
            if (!newOrderSoundBuffer) {
                const response = await fetch('new_order_alert.mp3');
                const arrayBuffer = await response.arrayBuffer();
                newOrderSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
            }
        }, { once: true });

        // If audio context exists and isn't suspended, pre-decode the audio
        if (audioContext && audioContext.state !== 'suspended' && !newOrderSoundBuffer) {
            const response = await fetch('new_order_alert.mp3');
            const arrayBuffer = await response.arrayBuffer();
            newOrderSoundBuffer = await audioContext.decodeAudioData(arrayBuffer);
        }
    } catch (error) {
        console.warn('Could not initialize audio for notifications.', error);
    }
};

const playNewOrderSound = () => {
    if (!audioContext || !newOrderSoundBuffer) {
        console.warn('Audio not ready to play or not decoded.');
        // Attempt to resume audio context if suspended, for later playback
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed after user interaction.');
            }).catch(e => console.error('Failed to resume AudioContext:', e));
        }
        return;
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            const source = audioContext.createBufferSource();
            source.buffer = newOrderSoundBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        }).catch(e => console.error('Failed to resume AudioContext for playback:', e));
    } else {
        const source = audioContext.createBufferSource();
        source.buffer = newOrderSoundBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
};

const updateTimers = () => {
    const orderCards = document.querySelectorAll('.kitchen-card[data-order-id]');
    orderCards.forEach(card => {
        const timestampStr = card.dataset.timestamp;
        if (!timestampStr) return;

        try {
            const timestamp = JSON.parse(timestampStr);
            if (!timestamp || !timestamp.seconds) return;

            const orderTimestamp = new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds / 1000000));
            const timeElapsed = Math.floor((new Date() - orderTimestamp) / 1000 / 60);
            
            let urgencyClass = 'text-green-500';
            if (timeElapsed > 15) {
                urgencyClass = 'text-red-500';
            } else if (timeElapsed > 10) {
                urgencyClass = 'text-amber-500';
            }

            const timerEl = card.querySelector('.order-timer');
            const timerIconEl = card.querySelector('.order-timer-icon');

            if (timerEl) {
                timerEl.textContent = `${timeElapsed} dəqiqə`;
                timerEl.className = `order-timer text-sm font-medium ${urgencyClass}`;
            }
            if (timerIconEl) {
                timerIconEl.className = `order-timer-icon w-4 h-4 ${urgencyClass}`;
            }
        } catch(e) {
            console.error('Error parsing timestamp from dataset', e);
        }
    });
};

const renderWaiterSection = (container) => {
    container.innerHTML = `
        <div class="max-w-7xl mx-auto animate-slide-in">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-10 space-y-4 lg:space-y-0">
                <div class="space-y-2">
                    <h2 class="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">🍽️ Mətbəx Paneli</h2>
                    <p class="text-slate-600 text-sm sm:text-base">Real-time sifariş izləmə və statusları yeniləmə</p>
                </div>
                <div class="flex flex-wrap gap-2 sm:gap-4">
                    <div class="ultra-modern-card px-4 py-2 sm:px-6 sm:py-4">
                        <div class="flex items-center space-x-2 sm:space-x-3">
                            <div class="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span class="text-xs sm:text-sm font-medium text-slate-600">Yeni: </span>
                            <span id="pending-orders-count" class="font-bold text-yellow-600 text-sm sm:text-lg">0</span>
                        </div>
                    </div>
                    <div class="ultra-modern-card px-4 py-2 sm:px-6 sm:py-4">
                        <div class="flex items-center space-x-2 sm:space-x-3">
                            <div class="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <span class="text-xs sm:text-sm font-medium text-slate-600">Hazırlanır: </span>
                            <span id="inprep-orders-count" class="font-bold text-blue-600 text-sm sm:text-lg">0</span>
                        </div>
                    </div>
                    <div class="ultra-modern-card px-4 py-2 sm:px-6 sm:py-4">
                        <div class="flex items-center space-x-2 sm:space-x-3">
                            <div class="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span class="text-xs sm:text-sm font-medium text-slate-600">Hazır: </span>
                            <span id="ready-orders-count" class="font-bold text-green-600 text-sm sm:text-lg">0</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                <div class="ultra-modern-card p-4 sm:p-6">
                    <div class="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                            <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-slate-700">Yeni Sifarişlər</h3>
                            <p class="text-xs sm:text-sm text-slate-500">Hazırlamaya başlamaq üçün</p>
                        </div>
                    </div>
                    <div id="pending-orders" class="space-y-3 sm:space-y-4">
                        <!-- Pending orders -->
                    </div>
                </div>
                
                <div class="ultra-modern-card p-4 sm:p-6">
                    <div class="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                            <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-slate-700">Hazırlanır</h3>
                            <p class="text-xs sm:text-sm text-slate-500">Aktiv olaraq hazırlanır</p>
                        </div>
                    </div>
                    <div id="inprep-orders" class="space-y-3 sm:space-y-4">
                        <!-- In-prep orders -->
                    </div>
                </div>
                
                <div class="ultra-modern-card p-4 sm:p-6">
                    <div class="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                        <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                            <svg class="w-4 h-4 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-slate-700">Hazırdır</h3>
                            <p class="text-xs sm:text-sm text-slate-500">Servisa hazır</p>
                        </div>
                    </div>
                    <div id="ready-orders" class="space-y-3 sm:space-y-4">
                        <!-- Ready orders -->
                    </div>
                </div>
            </div>
        </div>
    `;

    initAudio();

    const pendingOrders = container.querySelector('#pending-orders');
    const inprepOrders = container.querySelector('#inprep-orders');
    const readyOrders = container.querySelector('#ready-orders');
    const pendingOrdersCount = container.querySelector('#pending-orders-count');
    const inprepOrdersCount = container.querySelector('#inprep-orders-count');
    const readyOrdersCount = container.querySelector('#ready-orders-count');

    // Real-time listener for orders
    const ordersColRef = collection(db, 'orders');
    const q = query(ordersColRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let isFirstLoad = knownOrderIds.size === 0;
        const newKnownOrderIds = new Set();

        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                                    .filter(order => order && ['pending', 'in-prep', 'ready'].includes(order.status));
        
        // Clear containers
        pendingOrders.innerHTML = '';
        inprepOrders.innerHTML = '';
        readyOrders.innerHTML = '';
        
        // Sort orders by status
        const pending = orders.filter(order => order.status === 'pending');
        const inprep = orders.filter(order => order.status === 'in-prep');
        const ready = orders.filter(order => order.status === 'ready');
        
        // Update counts
        pendingOrdersCount.textContent = pending.length;
        inprepOrdersCount.textContent = inprep.length;
        readyOrdersCount.textContent = ready.length;
        
        // Render orders in respective columns
        pending.forEach(order => {
            if (!isFirstLoad && !knownOrderIds.has(order.id)) {
                playNewOrderSound();
                NotificationService.show(`Yeni sifariş: Masa ${order.tableNumber}`, 'info');
            }
            newKnownOrderIds.add(order.id);
            pendingOrders.appendChild(createKitchenOrderCard(order));
        });
        
        inprep.forEach(order => {
            newKnownOrderIds.add(order.id);
            inprepOrders.appendChild(createKitchenOrderCard(order));
        });
        
        ready.forEach(order => {
            newKnownOrderIds.add(order.id);
            readyOrders.appendChild(createKitchenOrderCard(order));
        });
        
        knownOrderIds = newKnownOrderIds;

        // Add empty states
        if (pending.length === 0) {
            const emptyState = createElement('div', { className: 'text-center py-8 sm:py-12' });
            emptyState.innerHTML = `
                <div class="text-slate-400 mb-4">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <p class="text-slate-500 text-sm sm:text-base">Yeni sifariş yoxdur</p>
            `;
            pendingOrders.appendChild(emptyState);
        }
        
        if (inprep.length === 0) {
            const emptyState = createElement('div', { className: 'text-center py-8 sm:py-12' });
            emptyState.innerHTML = `
                <div class="text-slate-400 mb-4">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                    </svg>
                </div>
                <p class="text-slate-500 text-sm sm:text-base">Hazırlanan sifariş yoxdur</p>
            `;
            inprepOrders.appendChild(emptyState);
        }
        
        if (ready.length === 0) {
            const emptyState = createElement('div', { className: 'text-center py-8 sm:py-12' });
            emptyState.innerHTML = `
                <div class="text-slate-400 mb-4">
                    <svg class="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <p class="text-slate-500 text-sm sm:text-base">Hazır sifariş yoxdur</p>
            `;
            readyOrders.appendChild(emptyState);
        }
        updateTimers();
    }, (error) => {
        console.error("Error listening to orders: ", error);
        NotificationService.show('Sifarişləri yükləyərkən xəta baş verdi!', 'error');
    });

    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(updateTimers, 60000); // Update timers every minute

    // Handle status updates
    container.addEventListener('click', async (event) => {
        const target = event.target.closest('.kitchen-status-btn');
        if (target) {
            const orderCard = target.closest('[data-order-id]');
            const orderId = orderCard.dataset.orderId;
            const newStatus = target.dataset.status;

            try {
                // Disable button during update
                target.disabled = true;
                const originalContent = target.innerHTML;
                target.innerHTML = `
                    <span class="flex items-center justify-center space-x-2">
                        <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Yenilənir...</span>
                    </span>
                `;

                const orderRef = doc(db, 'orders', orderId);
                await updateDoc(orderRef, { 
                    status: newStatus
                });
                
                // Show success notification
                const statusText = newStatus === 'in-prep' ? 'Hazırlamaya başlandı' : 
                                  newStatus === 'ready' ? 'Hazırdır' : 'Status yeniləndi';
                                  
                NotificationService.show(`Masa ${orderCard.dataset.tableNumber}: ${statusText}`, 'success');
                
            } catch (error) {
                console.error("Error updating order status:", error);
                NotificationService.show('❌ Status yenilənərkən xəta baş verdi!', 'error');
                
                // Re-enable button
                target.disabled = false;
                target.innerHTML = originalContent;
            }
        }
    });

    // Cleanup function
    return () => {
        if (unsubscribe) unsubscribe();
        if (intervalId) clearInterval(intervalId);
    };
};

export { renderWaiterSection };