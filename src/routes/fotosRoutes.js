const express = require('express')
const multer = require('multer')
const cloudinary = require('../config/cloudinary')
const { query } = require('../config/database')
const router = express.Router()

// Configurar multer
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas imagens são permitidas'))
    }
  }
})

// =============================================================================
// POST /api/fotos/upload/:vehicleId - Upload de foto
// =============================================================================
router.post('/upload/:vehicleId', upload.single('photo'), async (req, res) => {
  try {
    const { vehicleId } = req.params
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        erro: 'Nenhuma imagem enviada' 
      })
    }
    
    console.log(`📤 Upload de foto para veículo: ${vehicleId}`)
    
    // Upload para Cloudinary
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mycar/veiculos/${vehicleId}`,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 900, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('❌ Erro Cloudinary:', error)
            reject(error)
          } else {
            console.log('✅ Upload concluído:', result.secure_url)
            resolve(result)
          }
        }
      )
      uploadStream.end(req.file.buffer)
    })
    
    const result = await uploadPromise
    
    // Buscar veículo atual (CORRIGIDO: veiculos)
    const vehicleResult = await query(
      'SELECT images FROM veiculos WHERE id = $1',
      [vehicleId]
    )
    
    if (vehicleResult.rows.length === 0) {
      // Deletar do Cloudinary se veículo não existe
      await cloudinary.uploader.destroy(result.public_id).catch(console.error)
      
      return res.status(404).json({ 
        success: false, 
        erro: 'Veículo não encontrado' 
      })
    }
    
    // Adicionar nova imagem
    const currentImages = vehicleResult.rows[0].images || []
    const newImage = {
      url: result.secure_url,
      order: currentImages.length,
      cloudinary_id: result.public_id,
      uploaded_at: new Date().toISOString()
    }
    
    const updatedImages = [...currentImages, newImage]
    
    // Atualizar no banco (CORRIGIDO: veiculos)
    await query(
      'UPDATE veiculos SET images = $1, data_atualizacao = NOW() WHERE id = $2',
      [JSON.stringify(updatedImages), vehicleId]
    )
    
    console.log(`✅ Imagem salva (total: ${updatedImages.length})`)
    
    res.json({
      success: true,
      mensagem: 'Foto enviada com sucesso',
      data: {
        image: { url: result.secure_url, order: newImage.order },
        total_images: updatedImages.length
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao fazer upload:', error)
    res.status(500).json({ 
      success: false, 
      erro: 'Erro ao fazer upload',
      mensagem: error.message 
    })
  }
})

// =============================================================================
// DELETE /api/fotos/:vehicleId/:imageIndex - Deletar foto
// =============================================================================
router.delete('/:vehicleId/:imageIndex', async (req, res) => {
  try {
    const { vehicleId, imageIndex } = req.params
    const index = parseInt(imageIndex)
    
    if (isNaN(index)) {
      return res.status(400).json({ 
        success: false, 
        erro: 'Índice inválido' 
      })
    }
    
    console.log(`🗑️ Deletando foto ${index} do veículo: ${vehicleId}`)
    
    // Buscar veículo (CORRIGIDO: veiculos)
    const vehicleResult = await query(
      'SELECT images FROM veiculos WHERE id = $1',
      [vehicleId]
    )
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        erro: 'Veículo não encontrado' 
      })
    }
    
    const images = vehicleResult.rows[0].images || []
    
    if (index < 0 || index >= images.length) {
      return res.status(400).json({ 
        success: false, 
        erro: 'Índice fora do intervalo',
        mensagem: `Índice deve estar entre 0 e ${images.length - 1}`
      })
    }
    
    const imageToDelete = images[index]
    
    // Deletar do Cloudinary
    if (imageToDelete.cloudinary_id) {
      try {
        await cloudinary.uploader.destroy(imageToDelete.cloudinary_id)
        console.log('✅ Deletado do Cloudinary')
      } catch (error) {
        console.error('⚠️ Erro ao deletar do Cloudinary:', error)
      }
    }
    
    // Remover do array
    images.splice(index, 1)
    images.forEach((img, idx) => { img.order = idx })
    
    // Atualizar no banco (CORRIGIDO: veiculos)
    await query(
      'UPDATE veiculos SET images = $1, data_atualizacao = NOW() WHERE id = $2',
      [JSON.stringify(images), vehicleId]
    )
    
    console.log(`✅ Imagem removida (restam ${images.length})`)
    
    res.json({
      success: true,
      mensagem: 'Foto deletada com sucesso',
      data: { total_images: images.length }
    })
    
  } catch (error) {
    console.error('❌ Erro ao deletar:', error)
    res.status(500).json({ 
      success: false, 
      erro: 'Erro ao deletar',
      mensagem: error.message 
    })
  }
})

// =============================================================================
// GET /api/fotos/:vehicleId - Listar fotos
// =============================================================================
router.get('/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params
    
    // CORRIGIDO: veiculos
    const vehicleResult = await query(
      'SELECT images FROM veiculos WHERE id = $1',
      [vehicleId]
    )
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        erro: 'Veículo não encontrado' 
      })
    }
    
    const images = vehicleResult.rows[0].images || []
    
    res.json({
      success: true,
      data: { images, total: images.length }
    })
    
  } catch (error) {
    console.error('❌ Erro ao listar:', error)
    res.status(500).json({ 
      success: false, 
      erro: 'Erro ao listar fotos',
      mensagem: error.message 
    })
  }
})

// =============================================================================
// PUT /api/fotos/:vehicleId/reorder - Reordenar fotos
// =============================================================================
router.put('/:vehicleId/reorder', async (req, res) => {
  try {
    const { vehicleId } = req.params
    const { newOrder } = req.body
    
    if (!Array.isArray(newOrder)) {
      return res.status(400).json({ 
        success: false, 
        erro: 'newOrder deve ser um array' 
      })
    }
    
    console.log(`🔄 Reordenando fotos do veículo: ${vehicleId}`)
    
    // CORRIGIDO: veiculos
    const vehicleResult = await query(
      'SELECT images FROM veiculos WHERE id = $1',
      [vehicleId]
    )
    
    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        erro: 'Veículo não encontrado' 
      })
    }
    
    const images = vehicleResult.rows[0].images || []
    
    if (newOrder.length !== images.length) {
      return res.status(400).json({ 
        success: false, 
        erro: 'Array deve ter mesmo tamanho que número de imagens' 
      })
    }
    
    // Reordenar
    const reorderedImages = newOrder.map((oldIndex, newIndex) => {
      if (oldIndex < 0 || oldIndex >= images.length) {
        throw new Error(`Índice ${oldIndex} inválido`)
      }
      return { ...images[oldIndex], order: newIndex }
    })
    
    // Atualizar (CORRIGIDO: veiculos)
    await query(
      'UPDATE veiculos SET images = $1, data_atualizacao = NOW() WHERE id = $2',
      [JSON.stringify(reorderedImages), vehicleId]
    )
    
    console.log('✅ Fotos reordenadas')
    
    res.json({
      success: true,
      mensagem: 'Fotos reordenadas com sucesso',
      data: { images: reorderedImages }
    })
    
  } catch (error) {
    console.error('❌ Erro ao reordenar:', error)
    res.status(500).json({ 
      success: false, 
      erro: 'Erro ao reordenar',
      mensagem: error.message 
    })
  }
})

module.exports = router