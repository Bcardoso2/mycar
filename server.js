// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Importar rotas
const routes = require('./src/routes');

// ============================================
// MIDDLEWARES GLOBAIS
// ============================================

// Segurança
app.use(helmet());

// CORS - Permitir TODAS as requisições
app.use(cors({
  origin: '*',  // ✅ Aceita QUALQUER origem
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// ROTAS
// ============================================

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    nome: 'Marketplace de Veículos API',
    versao: '1.0.0',
    status: 'online',
    documentacao: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      veiculos: '/api/veiculos',
      fotos: '/api/fotos',
      favoritos: '/api/favoritos',
      repasses: '/api/repasses'
    }
  });
});

// Rotas da API
app.use('/api', routes);

// ============================================
// TRATAMENTO DE ERROS
// ============================================

// 404 - Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    mensagem: `A rota ${req.method} ${req.originalUrl} não existe`,
    timestamp: new Date().toISOString()
  });
});

// Erro geral
app.use((error, req, res, next) => {
  console.error('Erro na aplicação:', error);

  // Erro de validação do Multer (upload)
  if (error.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        erro: 'Arquivo muito grande',
        mensagem: 'O arquivo deve ter no máximo 5MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        erro: 'Muitos arquivos',
        mensagem: 'Você pode enviar no máximo 10 fotos por vez'
      });
    }
  }

  // Erro padrão
  res.status(error.status || 500).json({
    erro: error.name || 'Erro no servidor',
    mensagem: error.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║                                            ║');
  console.log('║   🚗 MARKETPLACE DE VEÍCULOS API 🚗       ║');
  console.log('║                                            ║');
  console.log('╚════════════════════════════════════════════╝\n');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 Logs: ${process.env.NODE_ENV === 'production' ? 'combined' : 'dev'}`);
  console.log(`✅ CORS: Todas as origens permitidas (*)`);
  console.log(`☁️  Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado ✅' : 'NÃO configurado ❌'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Conectado ✅' : 'NÃO configurado ❌'}`);
  console.log('\n📚 Endpoints disponíveis:');
  console.log(`   - GET    /                          - Info da API`);
  console.log(`   - GET    /api/health                - Health check`);
  console.log(`   - POST   /api/auth/registro         - Registrar usuário`);
  console.log(`   - POST   /api/auth/login            - Login`);
  console.log(`   - GET    /api/veiculos              - Listar veículos`);
  console.log(`   - POST   /api/veiculos              - Criar veículo`);
  console.log(`   - POST   /api/fotos/upload/:id      - Upload de foto`);
  console.log(`   - DELETE /api/fotos/:id/:index      - Deletar foto`);
  console.log(`   - GET    /api/favoritos             - Meus favoritos`);
  console.log(`   - GET    /api/repasses              - Área de repasse`);
  console.log('\n✅ Servidor pronto para receber requisições!\n');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
