// routes/veiculosRoutes.js
const express = require('express');
const router = express.Router();
const veiculosController = require('../controllers/veiculosController');
const { autenticar, autenticarOpcional } = require('../middlewares/authMiddleware');
const { validarVeiculo } = require('../middlewares/validationMiddleware');

/**
 * ROTAS PÚBLICAS
 */

// GET /api/veiculos - Listar veículos com filtros
router.get('/', veiculosController.listar);

// GET /api/veiculos/verificados - Veículos verificados
router.get('/verificados', veiculosController.verificados);

// GET /api/veiculos/recomendados - Veículos recomendados pela IA
router.get('/recomendados', veiculosController.recomendados);

// GET /api/veiculos/:id - Buscar veículo por ID
router.get('/:id', autenticarOpcional, veiculosController.buscarPorId);

/**
 * ROTAS PROTEGIDAS (Requerem autenticação)
 */

// GET /api/veiculos/meus - Meus veículos
router.get('/usuario/meus', autenticar, veiculosController.meusVeiculos);

// POST /api/veiculos - Criar veículo
router.post('/', autenticar, validarVeiculo, veiculosController.criar);

// PUT /api/veiculos/:id - Atualizar veículo
router.put('/:id', autenticar, veiculosController.atualizar);

// DELETE /api/veiculos/:id - Deletar veículo
router.delete('/:id', autenticar, veiculosController.deletar);

module.exports = router;