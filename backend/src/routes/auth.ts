import argon2 from 'argon2';
import { Router } from 'express';
import { HTTP_STATUS } from '../constants/httpStatus.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  createUser,
  findUserByEmail,
  findUserByEmailOrUsername,
  findUserById
} from '../services/authService.js';
import {
  consumeRefreshToken,
  createRefreshToken,
  signAccessToken
} from '../services/jwt.js';
import {
  loginSchema,
  refreshSchema,
  registerSchema
} from '../validators/authValidators.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const { pseudo, username, email, password, avatar } = req.body;

    const existing = await findUserByEmailOrUsername(email, username);
    if (existing.rowCount) {
      return res.status(HTTP_STATUS.CONFLICT).json({ error: 'Email or username already used' });
    }

    const passwordHash = await argon2.hash(password);
    const inserted = await createUser({
      pseudo,
      username,
      email,
      passwordHash,
      avatar: avatar || null
    });

    const user = inserted.rows[0];
    const accessToken = signAccessToken({ sub: user.id, email, pseudo, role: user.role });
    const refreshToken = await createRefreshToken(user.id);

    return res.status(HTTP_STATUS.CREATED).json({ accessToken, refreshToken });
  })
);

authRouter.post(
  '/login',
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await findUserByEmail(email);

    const user = result.rows[0];
    if (!user || !(await argon2.verify(user.password_hash, password))) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      pseudo: user.pseudo,
      role: user.role
    });
    const refreshToken = await createRefreshToken(user.id);
    return res.json({ accessToken, refreshToken });
  })
);

authRouter.post(
  '/refresh',
  validateBody(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const userId = await consumeRefreshToken(refreshToken);

    if (!userId) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid refresh token' });
    }

    const userResult = await findUserById(userId);
    if (!userResult.rowCount) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      pseudo: user.pseudo,
      role: user.role
    });
    const nextRefreshToken = await createRefreshToken(user.id);

    return res.json({ accessToken, refreshToken: nextRefreshToken });
  })
);
