// controllers/veiculosController.js
const { query } = require('../config/database');

/**
 * GET /api/veiculos
 * Listar veículos com filtros e paginação (PÚBLICO)
 */
const listar = async (req, res) => {
  try {
    const {
      // Filtros básicos
      tipo_veiculo,
      marca,
      modelo,
      ano_modelo_min,
      ano_modelo_max,
      cambio,
      combustivel,
      cor,
      
      // Filtros de valor
      valor_min,
      valor_max,
      
      // Filtros técnicos
      quilometragem_max,
      portas,
      lugares,
      
      // Filtros de localização
      estado,
      cidade,
      
      // Filtros booleanos
      ar_condicionado,
      direcao_eletrica,
      direcao_hidraulica,
      recomendado_ia,
      impulsionado,
      
      // Busca
      busca,
      
      // Paginação
      pagina = 1,
      limite = 20,
      
      // Ordenação
      ordenar_por = 'data_criacao',
      ordem = 'DESC'
    } = req.query;

    // Construir WHERE dinamicamente
    const condicoes = ['v.ativo = true'];
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

    if (ano_modelo_min) {
      condicoes.push(`v.ano_modelo >= $${paramIndex}`);
      valores.push(parseInt(ano_modelo_min));
      paramIndex++;
    }

    if (ano_modelo_max) {
      condicoes.push(`v.ano_modelo <= $${paramIndex}`);
      valores.push(parseInt(ano_modelo_max));
      paramIndex++;
    }

    if (cambio) {
      condicoes.push(`v.cambio = $${paramIndex}`);
      valores.push(cambio);
      paramIndex++;
    }

    if (combustivel) {
      condicoes.push(`v.combustivel = $${paramIndex}`);
      valores.push(combustivel);
      paramIndex++;
    }

    if (cor) {
      condicoes.push(`LOWER(v.cor) = LOWER($${paramIndex})`);
      valores.push(cor);
      paramIndex++;
    }

    if (valor_min) {
      condicoes.push(`v.valor >= $${paramIndex}`);
      valores.push(parseFloat(valor_min));
      paramIndex++;
    }

    if (valor_max) {
      condicoes.push(`v.valor <= $${paramIndex}`);
      valores.push(parseFloat(valor_max));
      paramIndex++;
    }

    if (quilometragem_max) {
      condicoes.push(`v.quilometragem <= $${paramIndex}`);
      valores.push(parseInt(quilometragem_max));
      paramIndex++;
    }

    if (portas) {
      condicoes.push(`v.portas = $${paramIndex}`);
      valores.push(parseInt(portas));
      paramIndex++;
    }

    if (lugares) {
      condicoes.push(`v.lugares = $${paramIndex}`);
      valores.push(parseInt(lugares));
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

    if (ar_condicionado === 'true') {
      condicoes.push(`v.ar_condicionado = true`);
    }

    if (direcao_eletrica === 'true') {
      condicoes.push(`v.direcao_eletrica = true`);
    }

    if (direcao_hidraulica === 'true') {
      condicoes.push(`v.direcao_hidraulica = true`);
    }

    if (recomendado_ia === 'true') {
      condicoes.push(`v.recomendado_ia = true`);
    }

    if (impulsionado === 'true') {
      condicoes.push(`v.impulsionado = true`);
    }

    // Busca textual
    if (busca) {
      condicoes.push(`(
        LOWER(v.marca) LIKE LOWER($${paramIndex}) OR 
        LOWER(v.modelo) LIKE LOWER($${paramIndex}) OR 
        LOWER(v.versao) LIKE LOWER($${paramIndex}) OR
        LOWER(v.descricao) LIKE LOWER($${paramIndex})
      )`);
      valores.push(`%${busca}%`);
      paramIndex++;
    }

    const whereClause = condicoes.join(' AND ');

    // Validar ordenação
    const colunasPermitidas = ['data_criacao', 'valor', 'quilometragem', 'ano_modelo', 'marca', 'modelo'];
    const colunaOrdenacao = colunasPermitidas.includes(ordenar_por) ? ordenar_por : 'data_criacao';
    const direcaoOrdem = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Calcular offset
    const offset = (parseInt(pagina) - 1) * parseInt(limite);

    // Query de contagem
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM veiculos v 
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, valores);
    const total = parseInt(countResult.rows[0].total);

    // Query principal
    const selectQuery = `
      SELECT 
        v.*,
        u.nome as vendedor_nome,
        u.email as vendedor_email,
        u.telefone as vendedor_telefone,
        u.tipo_usuario as vendedor_tipo,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal,
        (SELECT COUNT(*) FROM fotos_veiculos WHERE veiculo_id = v.id) as total_fotos,
        (SELECT COUNT(*) FROM favoritos WHERE veiculo_id = v.id) as total_favoritos
      FROM veiculos v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE ${whereClause}
      ORDER BY v.${colunaOrdenacao} ${direcaoOrdem}
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
    console.error('Erro ao listar veículos:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar veículos'
    });
  }
};

/**
 * GET /api/veiculos/:id
 * Buscar veículo por ID (PÚBLICO)
 */
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await query(
      `SELECT 
        v.*,
        u.nome as vendedor_nome,
        u.email as vendedor_email,
        u.telefone as vendedor_telefone,
        u.tipo_usuario as vendedor_tipo,
        u.data_criacao as vendedor_membro_desde,
        (SELECT COUNT(*) FROM veiculos WHERE usuario_id = u.id AND ativo = true) as vendedor_total_anuncios,
        (SELECT json_agg(json_build_object(
          'id', f.id,
          'url_foto', f.url_foto,
          'principal', f.principal,
          'ordem', f.ordem
        ) ORDER BY f.ordem) FROM fotos_veiculos f WHERE f.veiculo_id = v.id) as fotos,
        EXISTS(SELECT 1 FROM favoritos WHERE veiculo_id = v.id AND usuario_id = $2) as favoritado_por_usuario
      FROM veiculos v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = $1 AND v.ativo = true`,
      [id, req.usuario?.id || null]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado'
      });
    }

    // Incrementar visualizações
    await query(
      'UPDATE veiculos SET visualizacoes = visualizacoes + 1 WHERE id = $1',
      [id]
    );

    return res.json(resultado.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar veículo'
    });
  }
};

/**
 * POST /api/veiculos
 * Criar novo veículo (AUTENTICADO)
 */
const criar = async (req, res) => {
  try {
    const {
      modelo,
      marca,
      versao,
      ano_modelo,
      ano_fabricacao,
      tipo_veiculo,
      cambio,
      cor,
      quilometragem,
      combustivel,
      portas,
      lugares,
      ar_condicionado,
      direcao,
      direcao_eletrica,
      direcao_hidraulica,
      cilindrada,
      potencia,
      localizacao_estado,
      localizacao_cidade,
      localizacao_cep,
      localizacao_bairro,
      valor,
      valor_negociavel,
      aceita_troca,
      descricao,
      opcionais,
      placa,
      renavam,
      impulsionado,
      destaque
    } = req.body;

    // Validações básicas
    if (!modelo || !marca || !ano_modelo || !tipo_veiculo || !valor) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Modelo, marca, ano, tipo e valor são obrigatórios'
      });
    }

    const resultado = await query(
      `INSERT INTO veiculos (
        usuario_id, modelo, marca, versao, ano_modelo, ano_fabricacao,
        tipo_veiculo, cambio, cor, quilometragem, combustivel, portas,
        lugares, ar_condicionado, direcao, direcao_eletrica, direcao_hidraulica,
        cilindrada, potencia, localizacao_estado, localizacao_cidade,
        localizacao_cep, localizacao_bairro, valor, valor_negociavel, aceita_troca,
        descricao, opcionais, placa, renavam, impulsionado, destaque, recomendado_ia
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, false
      ) RETURNING *`,
      [
        req.usuario.id,
        modelo,
        marca,
        versao || null,
        ano_modelo,
        ano_fabricacao || ano_modelo,
        tipo_veiculo,
        cambio || null,
        cor || null,
        quilometragem || null,
        combustivel || null,
        portas || null,
        lugares || null,
        ar_condicionado || false,
        direcao || null,
        direcao_eletrica || false,
        direcao_hidraulica || false,
        cilindrada || null,
        potencia || null,
        localizacao_estado || null,
        localizacao_cidade || null,
        localizacao_cep || null,
        localizacao_bairro || null,
        valor,
        valor_negociavel || false,
        aceita_troca || false,
        descricao || null,
        opcionais || null,
        placa || null,
        renavam || null,
        impulsionado || false,
        destaque || false
      ]
    );

    return res.status(201).json({
      mensagem: 'Veículo criado com sucesso',
      veiculo: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao criar veículo'
    });
  }
};

/**
 * PUT /api/veiculos/:id
 * Atualizar veículo (AUTENTICADO - Dono ou Admin)
 */
const atualizar = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o veículo existe e pertence ao usuário
    const verificacao = await query(
      'SELECT * FROM veiculos WHERE id = $1',
      [id]
    );

    if (verificacao.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado'
      });
    }

    // Apenas o dono ou lojista pode editar
    if (verificacao.rows[0].usuario_id !== req.usuario.id && req.usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para editar este veículo'
      });
    }

    const {
      modelo, marca, versao, ano_modelo, ano_fabricacao, tipo_veiculo,
      cambio, cor, quilometragem, combustivel, portas, lugares,
      ar_condicionado, direcao_eletrica, direcao_hidraulica,
      cilindrada, potencia, localizacao_estado, localizacao_cidade,
      localizacao_bairro, valor, descricao, opcionais,
      impulsionado, ativo
    } = req.body;

    const resultado = await query(
      `UPDATE veiculos SET
        modelo = COALESCE($1, modelo),
        marca = COALESCE($2, marca),
        versao = COALESCE($3, versao),
        ano_modelo = COALESCE($4, ano_modelo),
        ano_fabricacao = COALESCE($5, ano_fabricacao),
        tipo_veiculo = COALESCE($6, tipo_veiculo),
        cambio = COALESCE($7, cambio),
        cor = COALESCE($8, cor),
        quilometragem = COALESCE($9, quilometragem),
        combustivel = COALESCE($10, combustivel),
        portas = COALESCE($11, portas),
        lugares = COALESCE($12, lugares),
        ar_condicionado = COALESCE($13, ar_condicionado),
        direcao_eletrica = COALESCE($14, direcao_eletrica),
        direcao_hidraulica = COALESCE($15, direcao_hidraulica),
        cilindrada = COALESCE($16, cilindrada),
        potencia = COALESCE($17, potencia),
        localizacao_estado = COALESCE($18, localizacao_estado),
        localizacao_cidade = COALESCE($19, localizacao_cidade),
        localizacao_bairro = COALESCE($20, localizacao_bairro),
        valor = COALESCE($21, valor),
        descricao = COALESCE($22, descricao),
        opcionais = COALESCE($23, opcionais),
        impulsionado = COALESCE($24, impulsionado),
        ativo = COALESCE($25, ativo),
        data_atualizacao = CURRENT_TIMESTAMP
      WHERE id = $26
      RETURNING *`,
      [
        modelo, marca, versao, ano_modelo, ano_fabricacao, tipo_veiculo,
        cambio, cor, quilometragem, combustivel, portas, lugares,
        ar_condicionado, direcao_eletrica, direcao_hidraulica,
        cilindrada, potencia, localizacao_estado, localizacao_cidade,
        localizacao_bairro, valor, descricao, opcionais,
        impulsionado, ativo, id
      ]
    );

    return res.json({
      mensagem: 'Veículo atualizado com sucesso',
      veiculo: resultado.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao atualizar veículo'
    });
  }
};

/**
 * DELETE /api/veiculos/:id
 * Deletar veículo (AUTENTICADO - Dono ou Admin)
 */
const deletar = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o veículo existe e pertence ao usuário
    const verificacao = await query(
      'SELECT * FROM veiculos WHERE id = $1',
      [id]
    );

    if (verificacao.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado'
      });
    }

    if (verificacao.rows[0].usuario_id !== req.usuario.id && req.usuario.tipo_usuario !== 'lojista') {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para deletar este veículo'
      });
    }

    // Soft delete
    await query(
      'UPDATE veiculos SET ativo = false, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    return res.json({
      mensagem: 'Veículo removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar veículo:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao deletar veículo'
    });
  }
};

/**
 * GET /api/veiculos/usuario/meus
 * Listar meus veículos (AUTENTICADO)
 */
const meusVeiculos = async (req, res) => {
  try {
    const resultado = await query(
      `SELECT 
        v.*,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal,
        (SELECT COUNT(*) FROM fotos_veiculos WHERE veiculo_id = v.id) as total_fotos,
        (SELECT COUNT(*) FROM favoritos WHERE veiculo_id = v.id) as total_favoritos
      FROM veiculos v
      WHERE v.usuario_id = $1
      ORDER BY v.data_criacao DESC`,
      [req.usuario.id]
    );

    return res.json({
      veiculos: resultado.rows,
      total: resultado.rows.length
    });

  } catch (error) {
    console.error('Erro ao buscar meus veículos:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar seus veículos'
    });
  }
};

/**
 * GET /api/veiculos/verificados
 * Buscar veículos verificados (PÚBLICO)
 */
const verificados = async (req, res) => {
  try {
    const resultado = await query(
      `SELECT 
        v.*,
        u.nome as vendedor_nome,
        u.telefone as vendedor_telefone,
        u.tipo_usuario as vendedor_tipo,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal,
        (SELECT COUNT(*) FROM fotos_veiculos WHERE veiculo_id = v.id) as total_fotos,
        (SELECT COUNT(*) FROM favoritos WHERE veiculo_id = v.id) as total_favoritos
      FROM veiculos v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.ativo = true 
        AND v.recomendado_ia = true
      ORDER BY v.data_criacao DESC
      LIMIT 6`
    );

    return res.json({
      total: resultado.rows.length,
      veiculos: resultado.rows
    });

  } catch (error) {
    console.error('Erro ao buscar verificados:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar veículos verificados'
    });
  }
};

/**
 * GET /api/veiculos/recomendados
 * Buscar veículos recomendados pela IA (PÚBLICO)
 */
const recomendados = async (req, res) => {
  try {
    const resultado = await query(
      `SELECT 
        v.*,
        u.nome as vendedor_nome,
        u.tipo_usuario as vendedor_tipo,
        (SELECT url_foto FROM fotos_veiculos WHERE veiculo_id = v.id AND principal = true LIMIT 1) as foto_principal
      FROM veiculos v
      JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.recomendado_ia = true AND v.ativo = true
      ORDER BY v.data_criacao DESC
      LIMIT 20`
    );

    return res.json(resultado.rows);

  } catch (error) {
    console.error('Erro ao buscar recomendados:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao buscar veículos recomendados'
    });
  }
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  meusVeiculos,
  verificados,
  recomendados
};