// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';

/**
 * Middleware de autenticação obrigatória
 * Verifica se o token JWT é válido
 */
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    // Buscar usuário no banco
    const resultado = await query(
      'SELECT id, nome, email, telefone, tipo_usuario FROM usuarios WHERE id = $1 AND ativo = true',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Usuário não encontrado'
      });
    }

    req.usuario = resultado.rows[0];
    next();
  } catch (error) {
    console.error('Erro ao verificar token:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token expirado'
      });
    }

    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao verificar autenticação'
    });
  }
};

/**
 * Middleware de autenticação opcional
 * Tenta autenticar, mas permite continuar mesmo sem token
 * Útil para rotas que mostram conteúdo diferente para usuários logados
 */
const autenticarOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Se não tem token, continua sem autenticar
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.usuario = null;
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const resultado = await query(
        'SELECT id, nome, email, telefone, tipo_usuario FROM usuarios WHERE id = $1 AND ativo = true',
        [decoded.id]
      );

      if (resultado.rows.length > 0) {
        req.usuario = resultado.rows[0];
      } else {
        req.usuario = null;
      }
    } catch (err) {
      req.usuario = null;
    }

    next();
  } catch (error) {
    console.error('Erro no middleware de autenticação opcional:', error);
    req.usuario = null;
    next();
  }
};

/**
 * Middleware que verifica se o usuário é lojista
 * Deve ser usado APÓS o middleware autenticar
 */
const autenticarLojista = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token não fornecido'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const resultado = await query(
      'SELECT id, nome, email, telefone, tipo_usuario FROM usuarios WHERE id = $1 AND ativo = true',
      [decoded.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Usuário não encontrado'
      });
    }

    const usuario = resultado.rows[0];

    // Verificar se é lojista
    if (usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Apenas lojistas têm acesso a esta funcionalidade'
      });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Erro ao verificar lojista:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token inválido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Não autorizado',
        mensagem: 'Token expirado'
      });
    }

    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao verificar autenticação'
    });
  }
};

module.exports = { 
  autenticar,
  autenticarOpcional,
  autenticarLojista
};