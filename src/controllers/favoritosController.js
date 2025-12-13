// controllers/favoritosController.js
const { query } = require('../config/database');

/**
 * POST /api/favoritos/:veiculoId
 * Adicionar veículo aos favoritos (AUTENTICADO)
 */
const adicionar = async (req, res) => {
  try {
    const { veiculoId } = req.params;
    const usuarioId = req.usuario.id;

    // Verificar se o veículo existe e está ativo
    const veiculo = await query(
      'SELECT id FROM veiculos WHERE id = $1 AND ativo = true',
      [veiculoId]
    );

    if (veiculo.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado'
      });
    }

    // Verificar se já está favoritado
    const jaFavoritado = await query(
      'SELECT id FROM favoritos WHERE usuario_id = $1 AND veiculo_id = $2',
      [usuarioId, veiculoId]
    );

    if (jaFavoritado.rows.length > 0) {
      return res.status(400).json({
        erro: 'Já favoritado',
        mensagem: 'Veículo já está nos seus favoritos'
      });
    }

    // Adicionar aos favoritos
    const resultado = await query(
      'INSERT INTO favoritos (usuario_id, veiculo_id) VALUES ($1, $2) RETURNING *',
      [usuarioId, veiculoId]
    );

    return res.status(201).json({
      mensagem: 'Veículo adicionado aos favoritos',
      favorito: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao adicionar aos favoritos'
    });
  }
};

/**
 * DELETE /api/favoritos/:veiculoId
 * Remover veículo dos favoritos (AUTENTICADO)
 */
const remover = async (req, res) => {
  try {
    const { veiculoId } = req.params;
    const usuarioId = req.usuario.id;

    const resultado = await query(
      'DELETE FROM favoritos WHERE usuario_id = $1 AND veiculo_id = $2 RETURNING *',
      [usuarioId, veiculoId]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Favorito não encontrado'
      });
    }

    return res.json({
      mensagem: 'Veículo removido dos favoritos'
    });

  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao remover dos favoritos'
    });
  }
};

/**
 * GET /api/favoritos
 * Listar meus favoritos (AUTENTICADO)
 */
const listar = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;

    const resultado = await query(
      `SELECT 
        f.*,
        v.*,
        u.nome as vendedor_nome,
        u.tipo_usuario as vendedor_tipo,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal,
        (SELECT COUNT(*) FROM fotos_veiculos WHERE veiculo_id = v.id) as total_fotos
      FROM favoritos f
      JOIN veiculos v ON f.veiculo_id = v.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE f.usuario_id = $1 AND v.ativo = true
      ORDER BY f.data_favoritado DESC`,
      [usuarioId]
    );

    return res.json({
      favoritos: resultado.rows,
      total: resultado.rows.length
    });

  } catch (error) {
    console.error('Erro ao listar favoritos:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao listar favoritos'
    });
  }
};

/**
 * GET /api/favoritos/verificar/:veiculoId
 * Verificar se veículo está favoritado (AUTENTICADO)
 */
const verificar = async (req, res) => {
  try {
    const { veiculoId } = req.params;
    const usuarioId = req.usuario.id;

    const resultado = await query(
      'SELECT id FROM favoritos WHERE usuario_id = $1 AND veiculo_id = $2',
      [usuarioId, veiculoId]
    );

    return res.json({
      favoritado: resultado.rows.length > 0
    });

  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao verificar favorito'
    });
  }
};

module.exports = {
  adicionar,
  remover,
  listar,
  verificar
};