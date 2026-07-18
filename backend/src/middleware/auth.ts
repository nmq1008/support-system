import { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../utils/httpError';
import { loadAuthUser, verifyToken } from '../modules/auth/auth.service';

/** Require a valid JWT; attaches the full AuthUser to req.user. */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized('Thiếu access token');

    const payload = verifyToken(token);
    const user = await loadAuthUser(payload.sub);
    if (!user) throw unauthorized('Người dùng không tồn tại hoặc đã bị khoá');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
