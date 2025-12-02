/**
 * Authentication Routes
 * Handles user signup, signin, and email verification
 */

import { Router, Request, Response } from 'express';
import { userRepository } from '../../../shared/dist/src/repositories/userRepository.js';
import { preferencesRepository } from '../../../shared/dist/src/repositories/preferencesRepository.js';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Check if email exists
 */
router.post('/check-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    const exists = await userRepository.emailExists(email);
    res.json({ exists });
  } catch (error) {
    const email = (req.body as { email?: string })?.email;
    logger.error(
      'Error checking email',
      { email: email || 'unknown' },
      error instanceof Error ? error : undefined
    );
    res.status(500).json({ error: "We couldn't verify your email. Please try again." });
  }
});

/**
 * Sign up - Create new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, pin, name } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN is required' });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if email already exists
    const emailExists = await userRepository.emailExists(email);
    if (emailExists) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Create user
    const user = await userRepository.createUser(email, pin, name);

    // Initialize preferences
    try {
      await preferencesRepository.initializePreferences(user.id);
    } catch (prefError) {
      logger.warn(
        'Failed to initialize preferences',
        { userId: user.id },
        prefError instanceof Error ? prefError : undefined
      );
      // Continue even if preferences fail
    }

    // Get user with preferences
    const userWithPrefs = await userRepository.getUserWithPreferences(user.id);

    logger.info('User signed up successfully', { userId: user.id, email: email });
    res.json({ user: userWithPrefs || user });
  } catch (error) {
    const emailFromBody = (req.body as { email?: string })?.email;
    logger.error(
      'Error signing up',
      { email: emailFromBody || 'unknown' },
      error instanceof Error ? error : undefined
    );
    res.status(500).json({ error: "We couldn't create your account. Please try again." });
  }
});

/**
 * Sign in - Authenticate user
 */
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Authenticate user
    const user = await userRepository.authenticateUser(email, pin);

    if (!user) {
      // Check if email exists to provide better error message
      const emailExists = await userRepository.emailExists(email);
      if (!emailExists) {
        return res.status(404).json({ error: 'No account found with this email' });
      }
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    // Get user with preferences
    const userWithPrefs = await userRepository.getUserWithPreferences(user.id);

    logger.info('User signed in successfully', { userId: user.id, email: email });
    res.json({ user: userWithPrefs || user });
  } catch (error) {
    const emailFromBody = (req.body as { email?: string })?.email;
    logger.error(
      'Error signing in',
      { email: emailFromBody || 'unknown' },
      error instanceof Error ? error : undefined
    );
    res
      .status(500)
      .json({ error: "We couldn't sign you in. Please check your email and PIN and try again." });
  }
});

/**
 * Get user with preferences
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await userRepository.getUserWithPreferences(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    const userId = req.params.userId;
    logger.error(
      'Error getting user',
      { userId: userId || 'unknown' },
      error instanceof Error ? error : undefined
    );
    res.status(500).json({ error: "We couldn't load your account information. Please try again." });
  }
});

export { router as authRoutes };
