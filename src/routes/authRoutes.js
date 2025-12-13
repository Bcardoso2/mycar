// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar } = require('../middlewares/authMiddleware');
const { validarRegistro, validarLogin } = require('../middlewares/validationMiddleware');

/**
 * ROTAS PÚBLICAS
 */

// POST /api/auth/registro - Registrar novo usuário
router.post('/registro', validarRegistro, authController.registro);

// POST /api/auth/login - Login
router.post('/login', validarLogin, authController.login);

/**
 * ROTAS PROTEGIDAS
 */

// GET /api/auth/perfil - Buscar meu perfil
router.get('/perfil', autenticar, authController.perfil);

// PUT /api/auth/perfil - Atualizar meu perfil
router.put('/perfil', autenticar, authController.atualizarPerfil);

// PUT /api/auth/senha - Alterar senha
router.put('/senha', autenticar, authController.alterarSenha);

// POST /api/auth/refresh - Refresh token (implementar depois se necessário)
// router.post('/refresh', authController.refreshToken);

module.exports = router;