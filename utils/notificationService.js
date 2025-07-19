// Create a simple fallback notification if the fancy one fails
window.showSimpleNotification = function(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
};

export class NotificationService {
    static show(message, type = 'info', duration = 3000) {
        try {
            // Remove any existing notifications of the same type
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notification => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });
            
            const notification = document.createElement('div');
            notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg transition-all duration-500 transform translate-x-full opacity-0 max-w-sm`;
            
            const typeClasses = {
                success: 'bg-green-500 text-white',
                error: 'bg-red-500 text-white',
                info: 'bg-blue-500 text-white',
                warning: 'bg-amber-500 text-white'
            };
            
            notification.classList.add(...(typeClasses[type] || typeClasses['info']).split(' '));
            
            const iconMap = {
                success: '✓',
                error: '✕',
                info: 'ℹ',
                warning: '⚠'
            };
            
            notification.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="text-lg font-bold">${iconMap[type] || iconMap['info']}</span>
                    <span class="flex-1">${message}</span>
                    <button class="close-notification ml-2 text-white/80 hover:text-white">✕</button>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Animate in
            setTimeout(() => {
                notification.classList.remove('translate-x-full', 'opacity-0');
                notification.classList.add('translate-x-0', 'opacity-100');
            }, 100);
            
            // Close button functionality
            notification.querySelector('.close-notification').onclick = () => {
                notification.classList.add('translate-x-full', 'opacity-0');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            };
            
            // Auto remove
            if (duration > 0) {
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.classList.add('translate-x-full', 'opacity-0');
                        setTimeout(() => {
                            if (notification.parentNode) {
                                notification.parentNode.removeChild(notification);
                            }
                        }, 500);
                    }
                }, duration);
            }
            
            return notification;
        } catch (error) {
            console.error('Notification error:', error);
            // Fallback to simple notification
            if (window.showSimpleNotification) {
                window.showSimpleNotification(message, type);
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        }
    }
    
    static showLoading(message = 'Yüklənir...') {
        try {
            const loading = document.createElement('div');
            loading.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50';
            loading.innerHTML = `
                <div class="ultra-modern-card p-8 flex flex-col items-center space-y-4">
                    <div class="loading-spinner"></div>
                    <p class="text-slate-700 font-medium">${message}</p>
                </div>
            `;
            document.body.appendChild(loading);
            return loading;
        } catch (error) {
            console.error('Loading notification error:', error);
            return null;
        }
    }
    
    static hideLoading(element) {
        try {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        } catch (error) {
            console.error('Hide loading error:', error);
        }
    }
}