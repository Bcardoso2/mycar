// src/routes/leilaoRoutes.js

const express = require('express');
const router = express.Router();
const leilaoController = require('../controllers/leilaoController');
const { autenticar } = require('../middlewares/authMiddleware');  // ✅ DESESTRUTURAÇÃO

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
router.post('/propostas', autenticar, leilaoController.fazerProposta);

// Listar minhas propostas
router.get('/propostas/minhas', autenticar, leilaoController.minhasPropostas);

// Cancelar proposta
router.delete('/propostas/:id', autenticar, leilaoController.cancelarProposta);

// ============================================
// ROTAS ADMIN (REQUER ADMIN)
// ============================================

// Criar leilão
router.post('/', autenticar, leilaoController.criarLeilao);

// Atualizar status da proposta
router.patch('/propostas/:id/status', autenticar, leilaoController.atualizarStatusProposta);

module.exports = router;
