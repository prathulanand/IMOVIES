import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getUserFavorites,
  toggleUserFavorite,
  removeUserFavorite,
} from '../controllers/user.controller.js';

const router = Router();

// Requires authentication
router.use(requireAuth);

router.get('/', getUserFavorites);
router.post('/', toggleUserFavorite);
router.post('/:movieId', toggleUserFavorite);
router.delete('/:movieId', removeUserFavorite);

export default router;
