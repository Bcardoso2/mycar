// ============================================
// UTILS - VALIDADORES E HELPERS
// ============================================

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para verificar erros de validação
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Os dados enviados contêm erros',
      erros: errors.array().map(err => ({
        campo: err.path,
        mensagem: err.msg
      }))
    });
  }
  
  next();
};

/**
 * Validações para autenticação
 */
const authValidation = {
  registro: [
    body('nome')
      .trim()
      .notEmpty().withMessage('Nome é obrigatório')
      .isLength({ min: 3 }).withMessage('Nome deve ter no mínimo 3 caracteres'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email é obrigatório')
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    
    body('senha')
      .notEmpty().withMessage('Senha é obrigatória')
      .isLength({ min: 6 }).withMessage('Senha deve ter no mínimo 6 caracteres'),
    
    body('telefone')
      .optional()
      .matches(/^\([0-9]{2}\)\s?[0-9]{4,5}-?[0-9]{4}$/).withMessage('Telefone inválido'),
    
    body('tipo_usuario')
      .optional()
      .isIn(['comum', 'lojista']).withMessage('Tipo de usuário inválido'),
    
    validate
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email é obrigatório')
      .isEmail().withMessage('Email inválido')
      .normalizeEmail(),
    
    body('senha')
      .notEmpty().withMessage('Senha é obrigatória'),
    
    validate
  ]
};

/**
 * Validações para veículos
 */
const veiculoValidation = {
  criar: [
    body('modelo')
      .trim()
      .notEmpty().withMessage('Modelo é obrigatório')
      .isLength({ max: 100 }).withMessage('Modelo muito longo'),
    
    body('marca')
      .trim()
      .notEmpty().withMessage('Marca é obrigatória')
      .isLength({ max: 100 }).withMessage('Marca muito longa'),
    
    body('ano_modelo')
      .notEmpty().withMessage('Ano do modelo é obrigatório')
      .isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Ano do modelo inválido'),
    
    body('ano_fabricacao')
      .notEmpty().withMessage('Ano de fabricação é obrigatório')
      .isInt({ min: 1900, max: new Date().getFullYear() }).withMessage('Ano de fabricação inválido'),
    
    body('tipo_veiculo')
      .notEmpty().withMessage('Tipo de veículo é obrigatório')
      .isIn(['carro', 'moto', 'caminhao', 'onibus', 'utilitario', 'van']).withMessage('Tipo de veículo inválido'),
    
    body('valor')
      .notEmpty().withMessage('Valor é obrigatório')
      .isFloat({ min: 0 }).withMessage('Valor deve ser maior que zero'),
    
    body('cambio')
      .optional()
      .isIn(['manual', 'automatico', 'automatizado', 'cvt']).withMessage('Câmbio inválido'),
    
    body('combustivel')
      .optional()
      .isIn(['gasolina', 'etanol', 'flex', 'diesel', 'eletrico', 'hibrido', 'gnv']).withMessage('Combustível inválido'),
    
    body('quilometragem')
      .optional()
      .isInt({ min: 0 }).withMessage('Quilometragem inválida'),
    
    validate
  ],
  
  atualizar: [
    param('id').isInt().withMessage('ID inválido'),
    
    body('modelo')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Modelo muito longo'),
    
    body('marca')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Marca muito longa'),
    
    body('valor')
      .optional()
      .isFloat({ min: 0 }).withMessage('Valor deve ser maior que zero'),
    
    body('quilometragem')
      .optional()
      .isInt({ min: 0 }).withMessage('Quilometragem inválida'),
    
    validate
  ],
  
  buscar: [
    param('id').isInt().withMessage('ID inválido'),
    validate
  ]
};

/**
 * Validações para queries (filtros)
 */
const queryValidation = {
  listarVeiculos: [
    query('tipo')
      .optional()
      .isIn(['carro', 'moto', 'caminhao', 'onibus', 'utilitario', 'van']).withMessage('Tipo inválido'),
    
    query('preco_min')
      .optional()
      .isFloat({ min: 0 }).withMessage('Preço mínimo inválido'),
    
    query('preco_max')
      .optional()
      .isFloat({ min: 0 }).withMessage('Preço máximo inválido'),
    
    query('ano_min')
      .optional()
      .isInt({ min: 1900 }).withMessage('Ano mínimo inválido'),
    
    query('ano_max')
      .optional()
      .isInt({ max: new Date().getFullYear() + 1 }).withMessage('Ano máximo inválido'),
    
    query('pagina')
      .optional()
      .isInt({ min: 1 }).withMessage('Página inválida'),
    
    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limite inválido'),
    
    validate
  ]
};

/**
 * Função para sanitizar dados de entrada
 */
const sanitize = (data) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

/**
 * Função para gerar slug
 */
const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/**
 * Função para formatar valores monetários
 */
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Função para validar placa de veículo
 */
const validarPlaca = (placa) => {
  // Mercosul: ABC1D23 ou ABC-1D23
  // Antiga: ABC-1234
  const mercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  const antiga = /^[A-Z]{3}-?[0-9]{4}$/;
  
  const placaLimpa = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  
  return mercosul.test(placaLimpa) || antiga.test(placaLimpa);
};

/**
 * Função para paginar resultados
 */
const paginate = (totalItems, currentPage = 1, pageSize = 20) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  
  return {
    total: totalItems,
    pagina_atual: parseInt(currentPage),
    total_paginas: totalPages,
    itens_por_pagina: parseInt(pageSize),
    tem_proxima: currentPage < totalPages,
    tem_anterior: currentPage > 1
  };
};

/**
 * Função para remover campos sensíveis de um objeto usuário
 */
const sanitizeUser = (user) => {
  const { senha_hash, ...userSemSenha } = user;
  return userSemSenha;
};

module.exports = {
  validate,
  authValidation,
  veiculoValidation,
  queryValidation,
  sanitize,
  generateSlug,
  formatCurrency,
  validarPlaca,
  paginate,
  sanitizeUser
};