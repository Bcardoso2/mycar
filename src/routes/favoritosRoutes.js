// routes/favoritosRoutes.js
const express = require('express');
const router = express.Router();
const favoritosController = require('../controllers/favoritosController');
const { autenticar } = require('../middlewares/authMiddleware');

/**
 * TODAS AS ROTAS REQUEREM AUTENTICAÇÃO
 */

// GET /api/favoritos - Listar meus favoritos
router.get('/', autenticar, favoritosController.listar);

// GET /api/favoritos/verificar/:veiculoId - Verificar se está favoritado
router.get('/verificar/:veiculoId', autenticar, favoritosController.verificar);

// POST /api/favoritos/:veiculoId - Adicionar aos favoritos
router.post('/:veiculoId', autenticar, favoritosController.adicionar);

// DELETE /api/favoritos/:veiculoId - Remover dos favoritos
router.delete('/:veiculoId', autenticar, favoritosController.remover);

module.exports = router;