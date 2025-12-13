// middlewares/validationMiddleware.js

/**
 * Validar dados de registro
 */
const validarRegistro = (req, res, next) => {
  const { nome, email, senha, telefone, tipo_usuario } = req.body;

  // Validar nome
  if (!nome || nome.trim().length < 3) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Nome deve ter pelo menos 3 caracteres'
    });
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Email inválido'
    });
  }

  // Validar senha
  if (!senha || senha.length < 6) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Senha deve ter pelo menos 6 caracteres'
    });
  }

  // Validar telefone (opcional mas se fornecido deve ser válido)
  if (telefone) {
    const telefoneRegex = /^\+?[1-9]\d{1,14}$/;
    const telefoneLimpo = telefone.replace(/\D/g, '');
    
    if (telefoneLimpo.length < 10 || telefoneLimpo.length > 15) {
      return res.status(400).json({
        erro: 'Dados inválidos',
        mensagem: 'Telefone inválido'
      });
    }
  }

  // Validar tipo de usuário
  if (tipo_usuario && !['comum', 'lojista'].includes(tipo_usuario)) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Tipo de usuário inválido. Use "comum" ou "lojista"'
    });
  }

  next();
};

/**
 * Validar dados de login
 */
const validarLogin = (req, res, next) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Email e senha são obrigatórios'
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Email inválido'
    });
  }

  next();
};

/**
 * Validar dados de veículo
 */
const validarVeiculo = (req, res, next) => {
  const {
    modelo,
    marca,
    ano_modelo,
    tipo_veiculo,
    valor
  } = req.body;

  // Campos obrigatórios
  if (!modelo || !marca || !ano_modelo || !tipo_veiculo || !valor) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Modelo, marca, ano, tipo e valor são obrigatórios'
    });
  }

  // Validar modelo
  if (modelo.trim().length < 2) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Modelo deve ter pelo menos 2 caracteres'
    });
  }

  // Validar marca
  if (marca.trim().length < 2) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Marca deve ter pelo menos 2 caracteres'
    });
  }

  // Validar ano
  const anoAtual = new Date().getFullYear();
  const anoNumerico = parseInt(ano_modelo);
  
  if (isNaN(anoNumerico) || anoNumerico < 1900 || anoNumerico > anoAtual + 1) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: `Ano deve estar entre 1900 e ${anoAtual + 1}`
    });
  }

  // Validar tipo de veículo
  const tiposValidos = ['carro', 'moto', 'caminhao', 'onibus', 'utilitario', 'van'];
  if (!tiposValidos.includes(tipo_veiculo)) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Tipo de veículo inválido. Use: carro, moto, caminhao, onibus, utilitario ou van'
    });
  }

  // Validar valor
  const valorNumerico = parseFloat(valor);
  if (isNaN(valorNumerico) || valorNumerico <= 0) {
    return res.status(400).json({
      erro: 'Dados inválidos',
      mensagem: 'Valor deve ser um número positivo'
    });
  }

  next();
};

module.exports = {
  validarRegistro,
  validarLogin,
  validarVeiculo
};