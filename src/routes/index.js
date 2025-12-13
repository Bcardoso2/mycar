// routes/index.js
const express = require('express');
const router = express.Router();

// Importar rotas
const authRoutes = require('./authRoutes');
const veiculosRoutes = require('./veiculosRoutes');
const fotosRoutes = require('./fotosRoutes');
const favoritosRoutes = require('./favoritosRoutes');
const repassesRoutes = require('./repassesRoutes');

// Rota de health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Marketplace de Veículos API'
  });
});

// Rotas públicas
router.use('/auth', authRoutes);

// Rotas de veículos (algumas públicas, outras protegidas)
router.use('/veiculos', veiculosRoutes);

// Rotas de fotos
router.use('/fotos', fotosRoutes);

// Rotas de favoritos (protegidas)
router.use('/favoritos', favoritosRoutes);

// Rotas de repasse (apenas lojistas)
router.use('/repasses', repassesRoutes);

// Rota 404
router.use('*', (req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    mensagem: `A rota ${req.originalUrl} não existe`
  });
});

module.exports = router;