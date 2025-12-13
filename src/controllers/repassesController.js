// controllers/repassesController.js
const { query } = require('../config/database');

/**
 * GET /api/repasses
 * Listar veículos de repasse (APENAS LOJISTAS)
 * Área exclusiva onde lojistas podem comercializar veículos entre si
 */
const listarRepasses = async (req, res) => {
  try {
    // Verificar se é lojista
    if (req.usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Apenas lojistas têm acesso à área de repasses'
      });
    }

    const {
      tipo_veiculo,
      marca,
      modelo,
      ano_min,
      ano_max,
      valor_min,
      valor_max,
      estado,
      cidade,
      busca,
      pagina = 1,
      limite = 20
    } = req.query;

    // Construir filtros
    const condicoes = ['vr.ativo = true', 'v.ativo = true'];
    const valores = [];
    let paramIndex = 1;

    if (tipo_veiculo) {
      condicoes.push(`v.tipo_veiculo = $${paramIndex}`);
      valores.push(tipo_veiculo);
      paramIndex++;
    }

    if (marca) {
      condicoes.push(`LOWER(v.marca) = LOWER($${paramIndex})`);
      valores.push(marca);
      paramIndex++;
    }

    if (modelo) {
      condicoes.push(`LOWER(v.modelo) LIKE LOWER($${paramIndex})`);
      valores.push(`%${modelo}%`);
      paramIndex++;
    }

    if (ano_min) {
      condicoes.push(`v.ano_modelo >= $${paramIndex}`);
      valores.push(parseInt(ano_min));
      paramIndex++;
    }

    if (ano_max) {
      condicoes.push(`v.ano_modelo <= $${paramIndex}`);
      valores.push(parseInt(ano_max));
      paramIndex++;
    }

    if (valor_min) {
      condicoes.push(`vr.valor_repasse >= $${paramIndex}`);
      valores.push(parseFloat(valor_min));
      paramIndex++;
    }

    if (valor_max) {
      condicoes.push(`vr.valor_repasse <= $${paramIndex}`);
      valores.push(parseFloat(valor_max));
      paramIndex++;
    }

    if (estado) {
      condicoes.push(`LOWER(v.localizacao_estado) = LOWER($${paramIndex})`);
      valores.push(estado);
      paramIndex++;
    }

    if (cidade) {
      condicoes.push(`LOWER(v.localizacao_cidade) = LOWER($${paramIndex})`);
      valores.push(cidade);
      paramIndex++;
    }

    if (busca) {
      condicoes.push(`(
        LOWER(v.marca) LIKE LOWER($${paramIndex}) OR 
        LOWER(v.modelo) LIKE LOWER($${paramIndex}) OR
        LOWER(vr.observacoes) LIKE LOWER($${paramIndex})
      )`);
      valores.push(`%${busca}%`);
      paramIndex++;
    }

    const whereClause = condicoes.join(' AND ');
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total
      FROM veiculos_repasse vr
      JOIN veiculos v ON vr.veiculo_id = v.id
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, valores);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const selectQuery = `
      SELECT 
        vr.*,
        v.*,
        u.nome as vendedor_nome,
        u.telefone as vendedor_telefone,
        u.email as vendedor_email,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal,
        (SELECT COUNT(*) FROM fotos_veiculos WHERE veiculo_id = v.id) as total_fotos
      FROM veiculos_repasse vr
      JOIN veiculos v ON vr.veiculo_id = v.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE ${whereClause}
      ORDER BY vr.data_cadastro DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    valores.push(parseInt(limite), offset);
    const resultado = await query(selectQuery, valores);

    return res.json({
      veiculos: resultado.rows,
      paginacao: {
        pagina_atual: parseInt(pagina),
        total_paginas: Math.ceil(total / parseInt(limite)),
        total_itens: total,
        itens_por_pagina: parseInt(limite)
      }
    });

  } catch (error) {
    console.error('Erro ao listar repasses:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao listar veículos de repasse'
    });
  }
};

/**
 * POST /api/repasses
 * Adicionar veículo à área de repasse (APENAS LOJISTAS - DONO DO VEÍCULO)
 */
const adicionarRepasse = async (req, res) => {
  try {
    const { veiculo_id, valor_repasse, observacoes } = req.body;

    // Verificar se é lojista
    if (req.usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Apenas lojistas podem adicionar veículos ao repasse'
      });
    }

    // Validações
    if (!veiculo_id || !valor_repasse) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Veículo e valor de repasse são obrigatórios'
      });
    }

    // Verificar se o veículo existe e pertence ao lojista
    const veiculo = await query(
      'SELECT * FROM veiculos WHERE id = $1 AND usuario_id = $2 AND ativo = true',
      [veiculo_id, req.usuario.id]
    );

    if (veiculo.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado ou você não tem permissão'
      });
    }

    // Verificar se já está no repasse
    const jaNoRepasse = await query(
      'SELECT id FROM veiculos_repasse WHERE veiculo_id = $1 AND ativo = true',
      [veiculo_id]
    );

    if (jaNoRepasse.rows.length > 0) {
      return res.status(400).json({
        erro: 'Já cadastrado',
        mensagem: 'Veículo já está na área de repasse'
      });
    }

    // Adicionar ao repasse
    const resultado = await query(
      `INSERT INTO veiculos_repasse (veiculo_id, valor_repasse, observacoes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [veiculo_id, valor_repasse, observacoes || null]
    );

    return res.status(201).json({
      mensagem: 'Veículo adicionado à área de repasse com sucesso',
      repasse: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao adicionar repasse:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao adicionar veículo ao repasse'
    });
  }
};

/**
 * PUT /api/repasses/:id
 * Atualizar informações de repasse (APENAS LOJISTA - DONO)
 */
const atualizarRepasse = async (req, res) => {
  try {
    const { id } = req.params;
    const { valor_repasse, observacoes, ativo } = req.body;

    // Verificar se o repasse existe e pertence ao lojista
    const repasse = await query(
      `SELECT vr.*, v.usuario_id
       FROM veiculos_repasse vr
       JOIN veiculos v ON vr.veiculo_id = v.id
       WHERE vr.id = $1`,
      [id]
    );

    if (repasse.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Repasse não encontrado'
      });
    }

    if (repasse.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para editar este repasse'
      });
    }

    const resultado = await query(
      `UPDATE veiculos_repasse 
       SET valor_repasse = COALESCE($1, valor_repasse),
           observacoes = COALESCE($2, observacoes),
           ativo = COALESCE($3, ativo)
       WHERE id = $4
       RETURNING *`,
      [valor_repasse, observacoes, ativo, id]
    );

    return res.json({
      mensagem: 'Repasse atualizado com sucesso',
      repasse: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar repasse:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao atualizar repasse'
    });
  }
};

/**
 * DELETE /api/repasses/:id
 * Remover veículo da área de repasse (APENAS LOJISTA - DONO)
 */
const removerRepasse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o repasse existe e pertence ao lojista
    const repasse = await query(
      `SELECT vr.*, v.usuario_id
       FROM veiculos_repasse vr
       JOIN veiculos v ON vr.veiculo_id = v.id
       WHERE vr.id = $1`,
      [id]
    );

    if (repasse.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Repasse não encontrado'
      });
    }

    if (repasse.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para remover este repasse'
      });
    }

    // Soft delete
    await query(
      'UPDATE veiculos_repasse SET ativo = false WHERE id = $1',
      [id]
    );

    return res.json({
      mensagem: 'Veículo removido da área de repasse'
    });

  } catch (error) {
    console.error('Erro ao remover repasse:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao remover repasse'
    });
  }
};

/**
 * GET /api/repasses/:id
 * Buscar detalhes de um repasse (APENAS LOJISTAS)
 */
const buscarRepasse = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se é lojista
    if (req.usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Apenas lojistas têm acesso à área de repasses'
      });
    }

    const resultado = await query(
      `SELECT 
        vr.*,
        v.*,
        u.nome as vendedor_nome,
        u.telefone as vendedor_telefone,
        u.email as vendedor_email,
        (SELECT json_agg(json_build_object(
          'id', f.id,
          'url_foto', f.url_foto,
          'principal', f.principal,
          'ordem', f.ordem
        ) ORDER BY f.ordem) FROM fotos_veiculos f WHERE f.veiculo_id = v.id) as fotos
      FROM veiculos_repasse vr
      JOIN veiculos v ON vr.veiculo_id = v.id
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE vr.id = $1 AND vr.ativo = true`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Repasse não encontrado'
      });
    }

    return res.json(resultado.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar repasse:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar repasse'
    });
  }
};

module.exports = {
  listarRepasses,
  adicionarRepasse,
  atualizarRepasse,
  removerRepasse,
  buscarRepasse
};