// Import and re-export from the modular service
import { AuthService } from './services/authService.js';

export const initAuth = AuthService.initAuth.bind(AuthService);
export const login = AuthService.login.bind(AuthService);
export const loginAsGuest = AuthService.loginAsGuest.bind(AuthService);
export const logout = AuthService.logout.bind(AuthService);
export const getCurrentRole = AuthService.getCurrentRole.bind(AuthService);
export const getCurrentUser = AuthService.getCurrentUser.bind(AuthService);
export const registerUser = AuthService.registerUser.bind(AuthService);
export const loginAdmin = AuthService.loginAdmin.bind(AuthService);
export const createAdminUser = AuthService.createAdminUser.bind(AuthService);
export const isAdmin = AuthService.isAdmin.bind(AuthService);
export const isManager = AuthService.isManager.bind(AuthService);
export const isCashier = AuthService.isCashier.bind(AuthService);
export const requireAdmin = AuthService.requireAdmin.bind(AuthService);

// Export the AuthService class itself for direct import
export { AuthService };

