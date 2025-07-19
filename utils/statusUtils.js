import { ORDER_STATUSES } from '../constants/initialData.js';

export class StatusUtils {
  static getStatusText(status) {
    const statusMap = {
      [ORDER_STATUSES.PENDING]: 'Gözləmədə',
      'in-prep': 'Hazırlanır',
      [ORDER_STATUSES.READY]: 'Hazırdır',
      [ORDER_STATUSES.SERVED]: 'Servis edildi',
      [ORDER_STATUSES.PAID]: 'Ödənildi',
      [ORDER_STATUSES.CANCELLED]: 'Ləğv edildi'
    };
    return statusMap[status] || status;
  }

  static getNextStatus(currentStatus) {
    const nextStatusMap = {
      [ORDER_STATUSES.PENDING]: { key: 'in-prep', text: 'Hazırlamaya başla' },
      'in-prep': { key: ORDER_STATUSES.READY, text: 'Hazırdır' },
      [ORDER_STATUSES.READY]: { key: ORDER_STATUSES.SERVED, text: 'Servis et' },
      [ORDER_STATUSES.SERVED]: { key: ORDER_STATUSES.PAID, text: 'Ödə' }
    };
    return nextStatusMap[currentStatus] || null;
  }

  static getStatusColor(status) {
    const colorMap = {
      [ORDER_STATUSES.PENDING]: 'bg-yellow-100 text-yellow-800',
      'in-prep': 'bg-blue-100 text-blue-800',
      [ORDER_STATUSES.READY]: 'bg-green-100 text-green-800',
      [ORDER_STATUSES.SERVED]: 'bg-gray-100 text-gray-800',
      [ORDER_STATUSES.PAID]: 'bg-teal-100 text-teal-800',
      [ORDER_STATUSES.CANCELLED]: 'bg-red-100 text-red-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  static getKitchenStatusBorder(status) {
    const borderMap = {
      [ORDER_STATUSES.PENDING]: 'border-l-4 border-yellow-400',
      'in-prep': 'border-l-4 border-blue-400',
      [ORDER_STATUSES.READY]: 'border-l-4 border-green-400',
      [ORDER_STATUSES.SERVED]: 'border-l-4 border-purple-400',
      [ORDER_STATUSES.CANCELLED]: 'border-l-4 border-red-400'
    };
    return borderMap[status] || 'border-l-4 border-gray-400';
  }

  static getKitchenStatusBadgeColor(status) {
    const badgeMap = {
      [ORDER_STATUSES.PENDING]: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800',
      'in-prep': 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800',
      [ORDER_STATUSES.READY]: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800',
      [ORDER_STATUSES.SERVED]: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800',
      [ORDER_STATUSES.CANCELLED]: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
    };
    return badgeMap[status] || 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800';
  }
}