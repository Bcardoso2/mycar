// controllers/fotosController.js
const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/veiculos');
    
    // Criar diretório se não existir
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório:', error);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'veiculo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

/**
 * POST /api/veiculos/:id/fotos
 * Upload de fotos para um veículo (AUTENTICADO - Dono)
 */
const uploadFotos = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o veículo existe e pertence ao usuário
    const veiculo = await query(
      'SELECT * FROM veiculos WHERE id = $1 AND usuario_id = $2',
      [id, req.usuario.id]
    );

    if (veiculo.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Veículo não encontrado ou você não tem permissão'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Nenhuma foto foi enviada'
      });
    }

    // Verificar quantas fotos já existem
    const fotosExistentes = await query(
      'SELECT COUNT(*) as total FROM fotos_veiculos WHERE veiculo_id = $1',
      [id]
    );

    const totalAtual = parseInt(fotosExistentes.rows[0].total);
    const maxFotos = 20;

    if (totalAtual + req.files.length > maxFotos) {
      // Deletar arquivos enviados
      for (const file of req.files) {
        await fs.unlink(file.path).catch(err => console.error('Erro ao deletar arquivo:', err));
      }
      
      return res.status(400).json({
        erro: 'Limite excedido',
        mensagem: `Máximo de ${maxFotos} fotos por veículo. Você tem ${totalAtual} fotos.`
      });
    }

    // Inserir fotos no banco
    const fotosInseridas = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const urlFoto = `/uploads/veiculos/${file.filename}`;
      const ordem = totalAtual + i + 1;
      const principal = totalAtual === 0 && i === 0; // Primeira foto é principal se não houver fotos

      const resultado = await query(
        `INSERT INTO fotos_veiculos (veiculo_id, url_foto, principal, ordem)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [id, urlFoto, principal, ordem]
      );

      fotosInseridas.push(resultado.rows[0]);
    }

    return res.status(201).json({
      mensagem: 'Fotos enviadas com sucesso',
      fotos: fotosInseridas
    });

  } catch (error) {
    console.error('Erro ao fazer upload de fotos:', error);
    
    // Limpar arquivos em caso de erro
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(err => console.error('Erro ao deletar arquivo:', err));
      }
    }
    
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao fazer upload das fotos'
    });
  }
};

/**
 * GET /api/veiculos/:id/fotos
 * Listar fotos de um veículo (PÚBLICO)
 */
const listarFotos = async (req, res) => {
  try {
    const { id } = req.params;

    const resultado = await query(
      `SELECT * FROM fotos_veiculos 
       WHERE veiculo_id = $1 
       ORDER BY principal DESC, ordem ASC`,
      [id]
    );

    return res.json(resultado.rows);

  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao listar fotos'
    });
  }
};

/**
 * PUT /api/fotos/:fotoId/principal
 * Definir foto como principal (AUTENTICADO - Dono)
 */
const definirPrincipal = async (req, res) => {
  try {
    const { fotoId } = req.params;

    // Verificar se a foto existe e se o usuário é dono do veículo
    const foto = await query(
      `SELECT f.*, v.usuario_id 
       FROM fotos_veiculos f
       JOIN veiculos v ON f.veiculo_id = v.id
       WHERE f.id = $1`,
      [fotoId]
    );

    if (foto.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Foto não encontrada'
      });
    }

    if (foto.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para editar esta foto'
      });
    }

    const veiculoId = foto.rows[0].veiculo_id;

    // Remover principal de todas as fotos do veículo
    await query(
      'UPDATE fotos_veiculos SET principal = false WHERE veiculo_id = $1',
      [veiculoId]
    );

    // Definir esta foto como principal
    await query(
      'UPDATE fotos_veiculos SET principal = true WHERE id = $1',
      [fotoId]
    );

    return res.json({
      mensagem: 'Foto principal definida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao definir foto principal:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao definir foto principal'
    });
  }
};

/**
 * PUT /api/fotos/:fotoId/ordem
 * Atualizar ordem da foto (AUTENTICADO - Dono)
 */
const atualizarOrdem = async (req, res) => {
  try {
    const { fotoId } = req.params;
    const { ordem } = req.body;

    if (!ordem || ordem < 1) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Ordem deve ser um número maior que 0'
      });
    }

    // Verificar se a foto existe e se o usuário é dono
    const foto = await query(
      `SELECT f.*, v.usuario_id 
       FROM fotos_veiculos f
       JOIN veiculos v ON f.veiculo_id = v.id
       WHERE f.id = $1`,
      [fotoId]
    );

    if (foto.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Foto não encontrada'
      });
    }

    if (foto.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para editar esta foto'
      });
    }

    await query(
      'UPDATE fotos_veiculos SET ordem = $1 WHERE id = $2',
      [ordem, fotoId]
    );

    return res.json({
      mensagem: 'Ordem atualizada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar ordem:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao atualizar ordem'
    });
  }
};

/**
 * DELETE /api/fotos/:fotoId
 * Deletar foto (AUTENTICADO - Dono)
 */
const deletarFoto = async (req, res) => {
  try {
    const { fotoId } = req.params;

    // Verificar se a foto existe e se o usuário é dono
    const foto = await query(
      `SELECT f.*, v.usuario_id 
       FROM fotos_veiculos f
       JOIN veiculos v ON f.veiculo_id = v.id
       WHERE f.id = $1`,
      [fotoId]
    );

    if (foto.rows.length === 0) {
      return res.status(404).json({
        erro: 'Não encontrado',
        mensagem: 'Foto não encontrada'
      });
    }

    if (foto.rows[0].usuario_id !== req.usuario.id) {
      return res.status(403).json({
        erro: 'Acesso negado',
        mensagem: 'Você não tem permissão para deletar esta foto'
      });
    }

    const fotoData = foto.rows[0];

    // Deletar arquivo físico
    const filePath = path.join(__dirname, '../..', fotoData.url_foto);
    await fs.unlink(filePath).catch(err => console.error('Erro ao deletar arquivo:', err));

    // Deletar do banco
    await query('DELETE FROM fotos_veiculos WHERE id = $1', [fotoId]);

    // Se era a foto principal, definir outra como principal
    if (fotoData.principal) {
      const proximaFoto = await query(
        `SELECT id FROM fotos_veiculos 
         WHERE veiculo_id = $1 
         ORDER BY ordem ASC 
         LIMIT 1`,
        [fotoData.veiculo_id]
      );

      if (proximaFoto.rows.length > 0) {
        await query(
          'UPDATE fotos_veiculos SET principal = true WHERE id = $1',
          [proximaFoto.rows[0].id]
        );
      }
    }

    return res.json({
      mensagem: 'Foto deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    return res.status(500).json({
      erro: 'Erro no servidor',
      mensagem: 'Erro ao deletar foto'
    });
  }
};

module.exports = {
  upload,
  uploadFotos,
  listarFotos,
  definirPrincipal,
  atualizarOrdem,
  deletarFoto
};