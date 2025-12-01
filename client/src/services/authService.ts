/**
 * Authentication Service
 * Handles authentication API calls to the server
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://amora-server-production.up.railway.app';

export interface User {
  id: string;
  email: string;
  name: string;
  is_premium: boolean;
  created_at: Date;
  updated_at: Date;
  selected_voice?: string;
}

export interface AuthResponse {
  user: User;
}

/**
 * Check if email exists
 */
export async function checkEmail(email: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/auth/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to check email');
    }

    const data = await response.json();
    return data.exists === true;
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
}

/**
 * Sign up - Create new user
 */
export async function signUp(email: string, pin: string, name: string): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pin, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create account');
    }

    const data: AuthResponse = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

/**
 * Sign in - Authenticate user
 */
export async function signIn(email: string, pin: string): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pin }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to authenticate');
    }

    const data: AuthResponse = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
}

/**
 * Get user with preferences
 */
export async function getUser(userId: string): Promise<User> {
  try {
    const response = await fetch(`${API_URL}/api/auth/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user');
    }

    const data: AuthResponse = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

