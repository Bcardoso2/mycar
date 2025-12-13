// routes/repassesRoutes.js
const express = require('express');
const router = express.Router();
const repassesController = require('../controllers/repassesController');
const { autenticar, autenticarLojista } = require('../middlewares/authMiddleware');

/**
 * TODAS AS ROTAS REQUEREM AUTENTICAÇÃO DE LOJISTA
 */

// GET /api/repasses - Listar veículos de repasse
router.get('/', autenticarLojista, repassesController.listarRepasses);

// GET /api/repasses/:id - Buscar detalhes de um repasse
router.get('/:id', autenticarLojista, repassesController.buscarRepasse);

// POST /api/repasses - Adicionar veículo ao repasse
router.post('/', autenticarLojista, repassesController.adicionarRepasse);

// PUT /api/repasses/:id - Atualizar repasse
router.put('/:id', autenticarLojista, repassesController.atualizarRepasse);

// DELETE /api/repasses/:id - Remover do repasse
router.delete('/:id', autenticarLojista, repassesController.removerRepasse);

module.exports = router;