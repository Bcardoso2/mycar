// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/registro
 * Registrar novo usuário
 */
const registro = async (req, res) => {
  try {
    const { nome, email, senha, telefone, tipo_usuario } = req.body;

    // Verificar se email já existe
    const usuarioExistente = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );

    if (usuarioExistente.rows.length > 0) {
      return res.status(400).json({
        erro: 'Email já cadastrado',
        mensagem: 'Este email já está em uso'
      });
    }

    // Hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Criar usuário - ✅ CORRIGIDO: senha ao invés de senha_hash
    const resultado = await query(
      `INSERT INTO usuarios (nome, email, senha, telefone, tipo_usuario, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, uuid, nome, email, telefone, tipo_usuario, data_criacao`,
      [nome, email, senhaHash, telefone || null, tipo_usuario || 'comum', true]
    );

    const usuario = resultado.rows[0];

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id,
        uuid: usuario.uuid,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      mensagem: 'Usuário criado com sucesso',
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        tipo_usuario: usuario.tipo_usuario,
        data_criacao: usuario.data_criacao
      },
      token
    });

  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao criar usuário'
    });
  }
};

/**
 * POST /api/auth/login
 * Login de usuário
 */
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Buscar usuário - ✅ CORRIGIDO: senha ao invés de senha_hash
    const resultado = await query(
      'SELECT id, uuid, nome, email, senha, telefone, tipo_usuario, ativo, data_criacao FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        erro: 'Credenciais inválidas',
        mensagem: 'Email ou senha incorretos'
      });
    }

    const usuario = resultado.rows[0];

    // Verificar senha - ✅ CORRIGIDO: usuario.senha ao invés de usuario.senha_hash
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'Credenciais inválidas',
        mensagem: 'Email ou senha incorretos'
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { 
        id: usuario.id,
        uuid: usuario.uuid,
        email: usuario.email,
        tipo_usuario: usuario.tipo_usuario
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      mensagem: 'Login realizado com sucesso',
      usuario: {
        id: usuario.id,
        uuid: usuario.uuid,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
        tipo_usuario: usuario.tipo_usuario,
        data_criacao: usuario.data_criacao
      },
      token
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao realizar login'
    });
  }
};

/**
 * GET /api/auth/perfil
 * Buscar perfil do usuário logado
 */
const perfil = async (req, res) => {
  try {
    const resultado = await query(
      `SELECT 
        id, uuid, nome, email, telefone, tipo_usuario, data_criacao,
        (SELECT COUNT(*) FROM veiculos WHERE usuario_id = $1 AND ativo = true) as total_veiculos,
        (SELECT COUNT(*) FROM favoritos WHERE usuario_id = $1) as total_favoritos
       FROM usuarios 
       WHERE id = $1 AND ativo = true`,
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Usuário não encontrado'
      });
    }

    return res.json(resultado.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar perfil'
    });
  }
};

/**
 * PUT /api/auth/perfil
 * Atualizar perfil do usuário
 */
const atualizarPerfil = async (req, res) => {
  try {
    const { nome, telefone } = req.body;

    // Validações
    if (nome && nome.trim().length < 3) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Nome deve ter pelo menos 3 caracteres'
      });
    }

    const resultado = await query(
      `UPDATE usuarios 
       SET nome = COALESCE($1, nome),
           telefone = COALESCE($2, telefone)
       WHERE id = $3 AND ativo = true
       RETURNING id, uuid, nome, email, telefone, tipo_usuario, data_criacao`,
      [nome, telefone, req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Usuário não encontrado'
      });
    }

    return res.json({
      mensagem: 'Perfil atualizado com sucesso',
      usuario: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao atualizar perfil'
    });
  }
};

/**
 * PUT /api/auth/senha
 * Alterar senha do usuário
 */
const alterarSenha = async (req, res) => {
  try {
    const { senha_atual, senha_nova } = req.body;

    // Validações
    if (!senha_atual || !senha_nova) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Senha atual e nova senha são obrigatórias'
      });
    }

    if (senha_nova.length < 6) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Nova senha deve ter pelo menos 6 caracteres'
      });
    }

    // Buscar usuário - ✅ CORRIGIDO: senha ao invés de senha_hash
    const resultado = await query(
      'SELECT senha FROM usuarios WHERE id = $1 AND ativo = true',
      [req.usuario.id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Usuário não encontrado'
      });
    }

    const usuario = resultado.rows[0];

    // Verificar senha atual - ✅ CORRIGIDO: usuario.senha ao invés de usuario.senha_hash
    const senhaValida = await bcrypt.compare(senha_atual, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'Senha incorreta',
        mensagem: 'Senha atual está incorreta'
      });
    }

    // Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(senha_nova, 10);

    // Atualizar senha - ✅ CORRIGIDO: senha ao invés de senha_hash
    await query(
      'UPDATE usuarios SET senha = $1 WHERE id = $2',
      [novaSenhaHash, req.usuario.id]
    );

    return res.json({
      mensagem: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao alterar senha'
    });
  }
};

// ⚠️ IMPORTANTE: Exportar TODAS as funções
module.exports = {
  registro,
  login,
  perfil,
  atualizarPerfil,
  alterarSenha
};