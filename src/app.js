// ============================================
// APP - CONFIGURAÇÃO DO EXPRESS
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compressão de respostas
app.use(compression());

// Logger (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limite de requisições
  message: {
    erro: 'Muitas requisições',
    mensagem: 'Você excedeu o limite de requisições. Tente novamente mais tarde.'
  }
});

app.use('/api/', limiter);

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// ============================================
// ROTAS
// ============================================

// Rota de health check
app.get('/', (req, res) => {
  res.json({
    nome: 'MyCar API',
    versao: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

app.get('/api', (req, res) => {
  res.json({
    mensagem: 'Bem-vindo à API do MyCar! 🚗',
    versao: '1.0.0',
    documentacao: '/api/docs',
    rotas_disponiveis: {
      autenticacao: '/api/auth',
      veiculos: '/api/veiculos',
      planos: '/api/planos'
    }
  });
});

// Importar e usar rotas
const authRoutes = require('./routes/authRoutes');

app.use('/api/auth', authRoutes);
// app.use('/api/veiculos', veiculosRoutes); // Próximo passo
// app.use('/api/planos', planosRoutes); // Próximo passo

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// Rota não encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    mensagem: `A rota ${req.method} ${req.url} não existe`,
    rotas_disponiveis: '/api'
  });
});

// Erro global
app.use((err, req, res, next) => {
  console.error('❌ Erro:', err);
  
  // Erro de validação do Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      erro: 'Arquivo muito grande',
      mensagem: 'O arquivo excede o tamanho máximo permitido'
    });
  }
  
  // Erro de validação do Multer
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      erro: 'Erro no upload',
      mensagem: 'Número máximo de arquivos excedido'
    });
  }
  
  // Erro genérico
  res.status(err.status || 500).json({
    erro: err.message || 'Erro no servidor',
    mensagem: process.env.NODE_ENV === 'development' ? err.stack : 'Ocorreu um erro inesperado'
  });
});

module.exports = app;