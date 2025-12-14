// src/controllers/leilaoController.js

const pool = require('../../config/database');

// ============================================
// LISTAR TODOS OS LEILÕES DISPONÍVEIS
// ============================================
const listarLeiloes = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM propostas_leilao WHERE veiculo_id = l.id) as total_propostas
      FROM veiculos_leilao l
      WHERE visivel = true
    `;
    
    const params = [];
    
    // Filtrar por status
    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    
    // Ordenar por data de fim (mais próximos primeiro)
    query += ` ORDER BY data_fim_leilao ASC`;
    
    // Paginação
    params.push(limit);
    query += ` LIMIT $${params.length}`;
    
    params.push(offset);
    query += ` OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);
    
    res.json({
      total: result.rowCount,
      leiloes: result.rows
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar leilões:', error);
    res.status(500).json({
      erro: 'Erro ao listar leilões',
      mensagem: error.message
    });
  }
};

// ============================================
// BUSCAR LEILÃO POR ID
// ============================================
const buscarLeilaoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM propostas_leilao WHERE veiculo_id = l.id) as total_propostas,
        (SELECT MAX(lance_maximo) FROM propostas_leilao WHERE veiculo_id = l.id) as maior_proposta
      FROM veiculos_leilao l
      WHERE l.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: 'Leilão não encontrado'
      });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Erro ao buscar leilão:', error);
    res.status(500).json({
      erro: 'Erro ao buscar leilão',
      mensagem: error.message
    });
  }
};

// ============================================
// CRIAR LEILÃO (ADMIN)
// ============================================
const criarLeilao = async (req, res) => {
  try {
    const {
      marca,
      modelo,
      ano,
      cor,
      placa,
      lance_inicial,
      patio_cidade,
      patio_estado,
      data_fim_leilao,
      images,
      descricao
    } = req.body;
    
    // Validação básica
    if (!marca || !modelo || !ano || !lance_inicial || !data_fim_leilao) {
      return res.status(400).json({
        erro: 'Dados incompletos',
        mensagem: 'Marca, modelo, ano, lance inicial e data de fim são obrigatórios'
      });
    }
    
    const query = `
      INSERT INTO veiculos_leilao (
        marca, modelo, ano, cor, placa,
        lance_inicial, lance_atual,
        patio_cidade, patio_estado,
        data_fim_leilao, images, descricao
      ) VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      marca,
      modelo,
      ano,
      cor,
      placa,
      lance_inicial,
      patio_cidade,
      patio_estado,
      data_fim_leilao,
      JSON.stringify(images || []),
      descricao
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      mensagem: 'Leilão criado com sucesso',
      leilao: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao criar leilão:', error);
    res.status(500).json({
      erro: 'Erro ao criar leilão',
      mensagem: error.message
    });
  }
};

// ============================================
// FAZER PROPOSTA (USUÁRIO LOGADO)
// ============================================
const fazerProposta = async (req, res) => {
  try {
    const { veiculo_id, lance_maximo } = req.body;
    const usuario_id = req.usuario.id; // Do middleware de autenticação
    
    // Validação
    if (!veiculo_id || !lance_maximo) {
      return res.status(400).json({
        erro: 'Dados incompletos',
        mensagem: 'ID do veículo e lance máximo são obrigatórios'
      });
    }
    
    // Verificar se o leilão existe e está ativo
    const leilaoQuery = await pool.query(
      'SELECT * FROM veiculos_leilao WHERE id = $1 AND visivel = true',
      [veiculo_id]
    );
    
    if (leilaoQuery.rows.length === 0) {
      return res.status(404).json({
        erro: 'Leilão não encontrado'
      });
    }
    
    const leilao = leilaoQuery.rows[0];
    
    // Verificar se o leilão já terminou
    if (new Date(leilao.data_fim_leilao) < new Date()) {
      return res.status(400).json({
        erro: 'Leilão finalizado',
        mensagem: 'Este leilão já terminou'
      });
    }
    
    // Verificar se o lance é maior que o lance inicial
    if (lance_maximo < leilao.lance_inicial) {
      return res.status(400).json({
        erro: 'Lance muito baixo',
        mensagem: `O lance mínimo é R$ ${leilao.lance_inicial.toFixed(2)}`
      });
    }
    
    // Verificar se o usuário já tem proposta ativa para este veículo
    const propostaExistenteQuery = await pool.query(
      `SELECT * FROM propostas_leilao 
       WHERE veiculo_id = $1 AND usuario_id = $2 
       AND status IN ('aguardando', 'monitorando')`,
      [veiculo_id, usuario_id]
    );
    
    if (propostaExistenteQuery.rows.length > 0) {
      // Atualizar proposta existente
      const updateQuery = `
        UPDATE propostas_leilao 
        SET lance_maximo = $1, data_atualizacao = NOW()
        WHERE veiculo_id = $2 AND usuario_id = $3 
        AND status IN ('aguardando', 'monitorando')
        RETURNING *
      `;
      
      const result = await pool.query(updateQuery, [lance_maximo, veiculo_id, usuario_id]);
      
      return res.json({
        mensagem: 'Proposta atualizada com sucesso',
        proposta: result.rows[0]
      });
    }
    
    // Criar nova proposta
    const insertQuery = `
      INSERT INTO propostas_leilao (
        veiculo_id, usuario_id, lance_maximo, status
      ) VALUES ($1, $2, $3, 'aguardando')
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [veiculo_id, usuario_id, lance_maximo]);
    
    // Atualizar contador de propostas no veículo
    await pool.query(
      'UPDATE veiculos_leilao SET propostas_recebidas = propostas_recebidas + 1 WHERE id = $1',
      [veiculo_id]
    );
    
    res.status(201).json({
      mensagem: 'Proposta registrada com sucesso',
      proposta: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao fazer proposta:', error);
    res.status(500).json({
      erro: 'Erro ao fazer proposta',
      mensagem: error.message
    });
  }
};

// ============================================
// LISTAR MINHAS PROPOSTAS (USUÁRIO LOGADO)
// ============================================
const minhasPropostas = async (req, res) => {
  try {
    const usuario_id = req.usuario.id;
    const { status } = req.query;
    
    let query = `
      SELECT 
        p.*,
        l.marca,
        l.modelo,
        l.ano,
        l.cor,
        l.lance_atual,
        l.data_fim_leilao,
        l.status as status_leilao,
        l.images
      FROM propostas_leilao p
      INNER JOIN veiculos_leilao l ON p.veiculo_id = l.id
      WHERE p.usuario_id = $1
    `;
    
    const params = [usuario_id];
    
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    
    query += ` ORDER BY p.data_criacao DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      total: result.rowCount,
      propostas: result.rows
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar propostas:', error);
    res.status(500).json({
      erro: 'Erro ao listar propostas',
      mensagem: error.message
    });
  }
};

// ============================================
// ATUALIZAR STATUS DA PROPOSTA (ADMIN)
// ============================================
const atualizarStatusProposta = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, valor_final, observacoes } = req.body;
    const admin_id = req.usuario.id;
    
    // Validação
    const statusValidos = ['aguardando', 'monitorando', 'arrematado', 'superado', 'cancelado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        erro: 'Status inválido',
        mensagem: `Status deve ser um de: ${statusValidos.join(', ')}`
      });
    }
    
    // Atualizar proposta
    const query = `
      UPDATE propostas_leilao 
      SET 
        status = $1,
        valor_final = $2,
        observacoes = $3,
        data_atualizacao = NOW()
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, valor_final, observacoes, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: 'Proposta não encontrada'
      });
    }
    
    // TODO: Criar notificação para o usuário
    // TODO: Registrar no histórico
    
    res.json({
      mensagem: 'Status atualizado com sucesso',
      proposta: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error);
    res.status(500).json({
      erro: 'Erro ao atualizar status',
      mensagem: error.message
    });
  }
};

// ============================================
// CANCELAR PROPOSTA (USUÁRIO)
// ============================================
const cancelarProposta = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.usuario.id;
    
    const query = `
      UPDATE propostas_leilao 
      SET status = 'cancelado', data_atualizacao = NOW()
      WHERE id = $1 AND usuario_id = $2 
      AND status IN ('aguardando', 'monitorando')
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, usuario_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        erro: 'Proposta não encontrada ou não pode ser cancelada'
      });
    }
    
    res.json({
      mensagem: 'Proposta cancelada com sucesso',
      proposta: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erro ao cancelar proposta:', error);
    res.status(500).json({
      erro: 'Erro ao cancelar proposta',
      mensagem: error.message
    });
  }
};

module.exports = {
  listarLeiloes,
  buscarLeilaoPorId,
  criarLeilao,
  fazerProposta,
  minhasPropostas,
  atualizarStatusProposta,
  cancelarProposta
};
