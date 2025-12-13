// ============================================
// CONFIG - BANCO DE DADOS
// ============================================

const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool
// Suporta tanto DATABASE_URL (Render/Heroku) quanto variáveis separadas
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false  // IMPORTANTE: Render exige SSL
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: false,  // Local sem SSL
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

// Teste de conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
  if (process.env.NODE_ENV === 'development') {
    console.log(`📍 Modo: ${process.env.DATABASE_URL ? 'DATABASE_URL (Remoto)' : 'Variáveis locais'}`);
  }
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no PostgreSQL:', err);
  process.exit(-1);
});

// Verificar conexão ao iniciar
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Erro ao conectar no banco:', err.message);
    console.error('💡 Dica: Verifique se DATABASE_URL está correto no .env');
  } else {
    console.log('✅ Banco de dados conectado com sucesso!');
    console.log(`🕐 Timestamp do servidor: ${res.rows[0].now}`);
  }
});

// Função helper para queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executada:', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''), 
        duration: `${duration}ms`, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error.message);
    console.error('📝 Query:', text);
    console.error('📦 Params:', params);
    throw error;
  }
};

// Função para obter um cliente do pool (para transações)
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Set timeout para evitar deadlocks
  const timeout = setTimeout(() => {
    console.error('⚠️ Cliente não foi liberado após 5s!');
  }, 5000);
  
  // Sobrescrever release para limpar timeout
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };
  
  return client;
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⏳ Encerrando pool de conexões...');
  await pool.end();
  console.log('✅ Pool encerrado com sucesso!');
  process.exit(0);
});

module.exports = {
  pool,
  query,
  getClient
};