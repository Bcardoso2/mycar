require('dotenv').config();

console.log('🔍 Verificando configuração do Cloudinary...\n');

console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configurado' : '❌ NÃO configurado');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Configurado' : '❌ NÃO configurado');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Configurado' : '❌ NÃO configurado');

if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.log('\n❌ Cloudinary NÃO está configurado!');
  console.log('\n📝 Adicione no arquivo .env:');
  console.log(`
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
  `);
  process.exit(1);
}

console.log('\n✅ Cloudinary configurado!');

// Testar conexão
const cloudinary = require('./src/config/cloudinary');

console.log('\n🧪 Testando conexão...');

cloudinary.api.ping()
  .then(result => {
    console.log('✅ SUCESSO! Cloudinary está funcionando!');
    console.log('Response:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ ERRO ao conectar no Cloudinary:', error.message);
    process.exit(1);
  });