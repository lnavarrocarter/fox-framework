import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();

// Health check route
router.get('/health', (req, res) => {
router.use('/user', new UserController().router);
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add your routes here

export default router;
