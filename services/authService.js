import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { signInGuestAnonymously, auth, db } from '../firebase-config.js'; // Import 'db' here
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { DataService } from './dataService.js'; // Import DataService

let currentUser = null;
let currentUserRole = null;
let _currentRolePermissions = {}; // Store permissions for the current role

// Role mapping for different users (mostly for demo accounts)
const userRoles = {
  // This object is now deprecated in favor of Firestore roles, but kept for reference
  // during any transition period or for a very specific, isolated fallback.
  // Best practice is to remove it entirely.
  // 'guest@restaurant.com': 'guest',
  // 'waiter@restaurant.com': 'waiter',
  // 'cashier@restaurant.com': 'cashier',
  // 'manager@restaurant.com': 'manager',
  // 'admin@restaurant.com': 'admin',
  // 'r.bagrv1@gmail.com': 'admin'
};

// Add admin user credentials validation
const isAdminUser = (email) => {
  const adminEmails = ['admin@restaurant.com', 'admin@restoran.com', 'r.bagrv1@gmail.com'];
  return adminEmails.includes(email);
};

export class AuthService {
  static async initAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          currentUser = user;
          if (user.isAnonymous) {
            currentUserRole = 'guest-anonymous';
          } else {
            // Attempt to get role from Firestore user document first
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists() && userDocSnap.data().role) {
                currentUserRole = userDocSnap.data().role;
            } else {
                // Fallback to a default role if not specified in Firestore
                currentUserRole = 'guest'; 
            }
          }
          localStorage.setItem('currentUserRole', currentUserRole);
          await AuthService.loadPermissionsForRole(currentUserRole); // Load permissions
          resolve(true);
        } else {
          currentUser = null;
          currentUserRole = null;
          _currentRolePermissions = {}; // Clear permissions
          localStorage.removeItem('currentUserRole');
          resolve(false);
        }
      });
    });
  }

  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      currentUser = userCredential.user;
      
      // Fetch role from Firestore user document
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().role) {
          currentUserRole = userDocSnap.data().role;
      } else {
          // Fallback to 'guest' if role is not set, or create the document.
          currentUserRole = 'guest';
          if (!userDocSnap.exists()) {
              await setDoc(userDocRef, { email: currentUser.email, role: currentUserRole, createdAt: new Date() });
          }
      }

      localStorage.setItem('currentUserRole', currentUserRole);
      await AuthService.loadPermissionsForRole(currentUserRole); // Load permissions
      return { success: true, role: currentUserRole };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  }

  static async loginAsGuest() {
    try {
      const result = await signInGuestAnonymously();
      currentUser = result.user;
      currentUserRole = 'guest-anonymous';
      localStorage.setItem('currentUserRole', currentUserRole);
      await AuthService.loadPermissionsForRole(currentUserRole); // Load permissions
      return { success: true, role: currentUserRole };
    } catch (error) {
      console.error("Guest login error:", error);
      return { success: false, error: error.message };
    }
  }

  static async logout() {
    try {
      await signOut(auth);
      currentUser = null;
      currentUserRole = null;
      _currentRolePermissions = {}; // Clear permissions
      localStorage.removeItem('currentUserRole');
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    }
  }

  static getCurrentRole() {
    return localStorage.getItem('currentUserRole');
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static async registerUser(email, password, role) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Add user to the 'users' collection in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          role: role,
          createdAt: new Date()
      });
      // Do not update userRoles object here, it's for demo mapping, real roles are in Firestore
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Registration error:", error);
      let errorMessage = "Qeydiyyat zamanı xəta baş verdi.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Bu email artıq istifadə olunur.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Şifrə ən az 6 simvoldan ibarət olmalıdır.";
      }
      return { success: false, error: errorMessage };
    }
  }

  static async loginAdmin(email, password) {
    try {
      // Check if email is admin before attempting login
      if (!isAdminUser(email)) {
        return { success: false, error: 'Bu email admin hesabı deyil.' };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      currentUser = userCredential.user;
      currentUserRole = 'admin'; // Force role to admin if logging in via admin form with admin email
      localStorage.setItem('currentUserRole', currentUserRole);
      await AuthService.loadPermissionsForRole(currentUserRole); // Load permissions
      return { success: true, role: currentUserRole };
    } catch (error) {
      console.error("Admin login error:", error);
      let errorMessage = 'Giriş xətası.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') { // Firebase v10+ uses invalid-credential for wrong password/user not found
        errorMessage = 'Düzgün email və ya şifrə daxil edin.';
      } else if (error.code === 'auth/wrong-password') { // Older Firebase versions
        errorMessage = 'Yanlış şifrə.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Düzgün email ünvanı daxil edin.';
      }
      return { success: false, error: errorMessage };
    }
  }

  static async createAdminUser(email, password) {
    try {
      if (!isAdminUser(email)) {
        return { success: false, error: 'Bu email admin hesabı deyil.' };
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
          email: email,
          role: 'admin',
          createdAt: new Date()
      });
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Admin registration error:", error);
      return { success: false, error: error.message };
    }
  }

  static async loadPermissionsForRole(role) {
      try {
          const allPermissions = await DataService.getPermissions();
          _currentRolePermissions = allPermissions[role] || {};
          console.log(`Permissions loaded for role ${role}:`, _currentRolePermissions);
      } catch (error) {
          console.error("Error loading permissions for role:", role, error);
          _currentRolePermissions = {}; // Default to no permissions on error
      }
  }

  static hasPermission(permissionKey) {
    // If no specific permissions loaded, check if the role implies the permission
    // For simplicity, 'admin' role has all permissions implicitly if not explicitly denied.
    // In a real app, you might want to explicitly list all admin permissions.
    if (AuthService.getCurrentRole() === 'admin') {
        // If a specific permission is looked up, and it's not explicitly false for admin, assume true
        return _currentRolePermissions[permissionKey] !== false;
    }
    // For other roles, check if the permission key is true
    return _currentRolePermissions[permissionKey] === true;
  }

  // Helper methods for specific role checks, can be replaced by hasPermission if preferred
  static isAdmin() {
    return currentUserRole === 'admin';
  }

  static isManager() {
    return currentUserRole === 'manager';
  }

  static isCashier() {
    return currentUserRole === 'cashier';
  }

  static requireAdmin(callback) {
    if (!this.isAdmin()) {
      throw new Error('Admin yetkisi tələb olunur.');
    }
    return callback();
  }
}