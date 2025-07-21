import { auth, db } from '../firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { signInGuestAnonymously } from '../firebase-config.js';
import { doc, setDoc } from 'firebase/firestore';

let currentUser = null;
let currentUserRole = null;

// Role mapping for different users
const userRoles = {
  'guest@restaurant.com': 'guest',
  'waiter@restaurant.com': 'waiter',
  'cashier@restaurant.com': 'cashier',
  'manager@restaurant.com': 'manager',
  'admin@restaurant.com': 'admin',
  'r.bagrv1@gmail.com': 'admin'
};

// Add admin user credentials validation
const isAdminUser = (email) => {
  const adminEmails = ['admin@restaurant.com', 'admin@restoran.com', 'r.bagrv1@gmail.com'];
  return adminEmails.includes(email);
};

export class AuthService {
  static async initAuth() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = user;
          if (user.isAnonymous) {
            currentUserRole = 'guest-anonymous';
          } else {
            currentUserRole = userRoles[user.email] || 'guest';
          }
          localStorage.setItem('currentUserRole', currentUserRole);
          resolve(true);
        } else {
          currentUser = null;
          currentUserRole = null;
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
      currentUserRole = userRoles[currentUser.email] || 'guest';
      localStorage.setItem('currentUserRole', currentUserRole);
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
      userRoles[email] = role; // Keep this for local consistency if needed
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
      currentUserRole = 'admin';
      localStorage.setItem('currentUserRole', currentUserRole);
      return { success: true, role: currentUserRole };
    } catch (error) {
      console.error("Admin login error:", error);
      let errorMessage = 'Giriş xətası.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu email ünvanı ilə istifadəçi tapılmadı.';
      } else if (error.code === 'auth/wrong-password') {
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
      userRoles[email] = 'admin';
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Admin registration error:", error);
      return { success: false, error: error.message };
    }
  }

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