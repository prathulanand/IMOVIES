import { Router } from 'express';
import {
  getMovies,
  getMovieById,
  getMovieShows,
  getCities,
  getShowSeats,
} from '../controllers/public.controller.js';

const router = Router();

router.get('/movies', getMovies);
router.get('/movies/:id', getMovieById);
router.get('/movies/:id/shows', getMovieShows);
router.get('/cities', getCities);
router.get('/shows/:id/seats', getShowSeats);

export default router;
