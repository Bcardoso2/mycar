// src/routes/leilaoRoutes.js

const express = require('express');
const router = express.Router();
const leilaoController = require('../controllers/leilaoController');
const authMiddleware = require('../middlewares/authMiddleware');

// ============================================
// ROTAS PÚBLICAS
// ============================================

// Listar todos os leilões
router.get('/', leilaoController.listarLeiloes);

// Buscar leilão por ID
router.get('/:id', leilaoController.buscarLeilaoPorId);

// ============================================
// ROTAS PROTEGIDAS (REQUER LOGIN)
// ============================================

// Fazer proposta
router.post('/propostas', authMiddleware, leilaoController.fazerProposta);

// Listar minhas propostas
router.get('/propostas/minhas', authMiddleware, leilaoController.minhasPropostas);

// Cancelar proposta
router.delete('/propostas/:id', authMiddleware, leilaoController.cancelarProposta);

// ============================================
// ROTAS ADMIN (REQUER ADMIN)
// ============================================

// Criar leilão
router.post('/', authMiddleware, leilaoController.criarLeilao);

// Atualizar status da proposta
router.patch('/propostas/:id/status', authMiddleware, leilaoController.atualizarStatusProposta);

module.exports = router;
