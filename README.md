# 🚗 MyCar Backend API

API REST do MyCar - Marketplace de Veículos

## 📋 Pré-requisitos

- Node.js 16+
- PostgreSQL 13+
- npm ou yarn

## 🚀 Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
NODE_ENV=development
PORT=3000

DB_USER=postgres
DB_HOST=localhost
DB_NAME=mycar_db
DB_PASSWORD=sua_senha
DB_PORT=5432

JWT_SECRET=seu_secret_super_secreto_aqui
JWT_EXPIRES_IN=7d
```

### 3. Criar pasta de uploads

```bash
mkdir uploads
```

### 4. Iniciar servidor

**Desenvolvimento (com nodemon):**
```bash
npm run dev
```

**Produção:**
```bash
npm start
```

## 📡 Rotas Disponíveis

### ✅ FASE 1 - Autenticação (IMPLEMENTADO)

#### POST `/api/auth/registro`
Registrar novo usuário

**Body:**
```json
{
  "nome": "João Silva",
  "email": "joao@email.com",
  "senha": "senha123",
  "telefone": "(11) 98888-1111",
  "tipo_usuario": "comum",
  "cidade": "São Paulo",
  "estado": "SP"
}
```

**Resposta:**
```json
{
  "mensagem": "Usuário criado com sucesso!",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "tipo_usuario": "comum"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST `/api/auth/login`
Login de usuário

**Body:**
```json
{
  "email": "joao@email.com",
  "senha": "senha123"
}
```

**Resposta:**
```json
{
  "mensagem": "Login realizado com sucesso!",
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### GET `/api/auth/me`
Buscar dados do usuário autenticado

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "usuario": {
    "id": 1,
    "nome": "João Silva",
    "email": "joao@email.com",
    "tipo_usuario": "comum",
    "cidade": "São Paulo",
    "estado": "SP"
  }
}
```

---

#### PUT `/api/auth/perfil`
Atualizar perfil do usuário

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "nome": "João Silva Santos",
  "telefone": "(11) 99999-9999",
  "cidade": "São Paulo",
  "estado": "SP"
}
```

---

#### PUT `/api/auth/senha`
Alterar senha do usuário

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "senha_atual": "senha123",
  "senha_nova": "novaSenha456"
}
```

---

### 🔜 PRÓXIMAS FASES (A IMPLEMENTAR)

#### FASE 2 - CRUD Veículos
- `GET /api/veiculos` - Listar veículos
- `GET /api/veiculos/:id` - Buscar veículo
- `POST /api/veiculos` - Criar veículo 🔒
- `PUT /api/veiculos/:id` - Atualizar veículo 🔒
- `DELETE /api/veiculos/:id` - Deletar veículo 🔒

#### FASE 3 - Upload de Fotos
- `POST /api/veiculos/:id/fotos` - Upload fotos 🔒
- `DELETE /api/veiculos/:id/fotos/:fotoId` - Deletar foto 🔒

#### FASE 4 - Favoritos
- `POST /api/favoritos/:veiculoId` - Adicionar favorito 🔒
- `DELETE /api/favoritos/:veiculoId` - Remover favorito 🔒
- `GET /api/favoritos` - Listar favoritos 🔒

---

## 🔐 Autenticação

A API usa **JWT (JSON Web Tokens)** para autenticação.

### Como usar:

1. Faça login na rota `/api/auth/login`
2. Copie o `token` retornado
3. Envie o token no header de todas as requisições protegidas:

```
Authorization: Bearer SEU_TOKEN_AQUI
```

### Exemplo com cURL:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Exemplo com JavaScript (fetch):

```javascript
fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js       # Conexão com PostgreSQL
│   ├── controllers/
│   │   └── authController.js # Lógica de autenticação
│   ├── middlewares/
│   │   └── auth.js           # Middlewares JWT
│   ├── routes/
│   │   └── auth.js           # Rotas de autenticação
│   ├── utils/
│   │   └── validators.js     # Validações
│   └── app.js                # Configuração do Express
├── uploads/                  # Pasta de uploads (criar)
├── .env                      # Variáveis de ambiente (criar)
├── .env.example              # Exemplo de variáveis
├── .gitignore
├── package.json
├── server.js                 # Entrada da aplicação
└── README.md
```

---

## 🧪 Testando a API

### Com cURL:

**Registro:**
```bash
curl -X POST http://localhost:3000/api/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Teste User",
    "email": "teste@email.com",
    "senha": "senha123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@email.com",
    "senha": "senha123"
  }'
```

### Com Postman:

1. Importe a collection (em breve)
2. Configure a variável `{{token}}`
3. Teste as rotas

---

## ⚠️ Erros Comuns

### Erro: "Token não fornecido"
- **Causa:** Faltou enviar o header `Authorization`
- **Solução:** Adicione `Authorization: Bearer {token}`

### Erro: "Email já cadastrado"
- **Causa:** Email já existe no banco
- **Solução:** Use outro email ou faça login

### Erro: "Credenciais inválidas"
- **Causa:** Email ou senha incorretos
- **Solução:** Verifique os dados

### Erro: "Conectado ao PostgreSQL"
- **Causa:** Banco de dados não está rodando
- **Solução:** Inicie o PostgreSQL: `sudo service postgresql start`

---

## 📝 Próximos Passos

- [x] ✅ Autenticação (registro, login, JWT)
- [ ] 🔄 CRUD de Veículos
- [ ] 📸 Upload de Fotos
- [ ] ⭐ Sistema de Favoritos
- [ ] 💬 Mensagens entre usuários
- [ ] 💰 Planos e Pagamentos
- [ ] 🔍 Sistema de Busca com Filtros
- [ ] 🤖 Integração com IA

---

## 🆘 Suporte

Dúvidas? Entre em contato!

---

**Backend em desenvolvimento! 🚀**