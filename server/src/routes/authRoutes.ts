import { Router } from 'express';
import { register, login, getProfile, updateProfile, changePassword } from '../controllers/authController';
import { verifyToken } from '../middleware/auth';

const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.get('/profile', verifyToken, getProfile);
authRouter.put('/profile', verifyToken, updateProfile);
authRouter.put('/password', verifyToken, changePassword);  // ← new route

export default authRouter;