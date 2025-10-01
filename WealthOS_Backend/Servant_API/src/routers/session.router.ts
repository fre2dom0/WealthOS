import { checkSessionController, createSessionController, getSessionController, nonceController } from "../controllers/session.controller.js";
import { Router } from "express";

const router = Router();

router.post('/create_session', createSessionController);
router.get('/check_session', checkSessionController);
router.get('/nonce', nonceController);
router.get('/fetch_session', getSessionController)

export default router;