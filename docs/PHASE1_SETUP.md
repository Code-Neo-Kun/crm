# 🚀 Phase 1 - System Core: Setup Guide

**Status:** Foundation Implementation  
**Created:** 2025-12-31  
**Version:** 1.0.0

---

## 📦 What's Implemented

**Phase 1 - System Core includes:**

✅ **Authentication System**

- JWT-based token authentication
- Password hashing with bcryptjs
- Login/Logout/Refresh endpoints
- Token verification middleware

✅ **Database Layer**

- MySQL connection pooling
- Transaction support
- Query builder
- Schema migrations

✅ **User Management**

- User authentication
- User-zone mapping (many-to-many)
- User capabilities loading
- Primary zone tracking

✅ **Zone System**

- Zone hierarchy (root → region → branch → team)
- User-zone associations with roles
- Zone-based access control

✅ **Permissions & Authorization**

- Role-based permission validator
- Capability checking system
- Zone-based access rules
- Super Admin / Zone Admin detection

✅ **Audit Logging**

- Comprehensive audit trail
- Action logging (create, read, update, delete, assign)
- Access denial logging (security monitoring)
- Entity-level audit history

✅ **API Framework**

- Express.js server
- Helmet security headers
- CORS support
- Request ID tracking
- Morgan logging
- Global error handling

---

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
# Copy example to .env
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

**Required settings:**

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=crm_user
DB_PASSWORD=securePassword123
DB_NAME=crm_db
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Create Database

```bash
# Using MySQL CLI
mysql -u root -p

# In MySQL:
CREATE DATABASE crm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'crm_user'@'localhost' IDENTIFIED BY 'securePassword123';
GRANT ALL PRIVILEGES ON crm_db.* TO 'crm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Run Migrations

```bash
npm run migrate
```

This will:

- Create all required tables
- Insert default roles
- Insert default capabilities
- Verify table structure

### 5. Seed Initial Data (Manual)

```bash
# Start MySQL
mysql -u crm_user -p crm_db

# Insert Super Admin role and root zone
INSERT INTO zones (code, name, level) VALUES ('ROOT', 'Root', 'root');
INSERT INTO users (username, email, password_hash, first_name, is_active)
VALUES ('admin@crm.local', 'admin@crm.local', '$2a$10$...', 'Admin', TRUE);
INSERT INTO user_zones (user_id, zone_id, role, is_primary)
VALUES (1, 1, 'super_admin', TRUE);
```

---

## 🚀 Running the Server

### Development Mode

```bash
# With auto-reload
npm run dev:watch

# One-time start
npm run dev
```

Server will start on `http://localhost:3000`

### Production Mode

```bash
# Build TypeScript
npm run build

# Start server
npm start
```

---

## 🧪 Testing Authentication

### 1. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@crm.local",
    "password": "initialPassword123"
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin@crm.local",
      "email": "admin@crm.local",
      "firstName": "Admin",
      "zones": [
        {
          "id": 1,
          "userId": 1,
          "zoneId": 1,
          "zoneName": "Root",
          "role": "super_admin",
          "isPrimary": true
        }
      ],
      "capabilities": [...]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "expiresIn": 86400
  },
  "meta": {
    "timestamp": "2025-12-31T10:30:45.123Z",
    "requestId": "uuid-here"
  }
}
```

### 2. Get Current User

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer {token}"
```

### 3. Refresh Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refreshToken}"
  }'
```

### 4. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer {token}"
```

---

## 📁 Project Structure

```
src/
├── core/                          (Core modules)
│   ├── auth/
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   └── jwt.service.ts
│   │   ├── middleware/
│   │   │   └── authenticate.ts
│   │   └── controllers/
│   │       └── auth.controller.ts
│   │
│   ├── permissions/
│   │   └── services/
│   │       └── permission-validator.ts
│   │
│   └── audit/
│       └── services/
│           └── audit.service.ts
│
├── services/
│   ├── database.service.ts
│   └── (shared services)
│
├── types/
│   └── index.ts               (All TypeScript interfaces)
│
├── utils/
│   └── logger.ts
│
├── app.ts                      (Express app setup)
└── server.ts                   (Entry point)

database/
├── schema.sql                  (Database schema)
└── migrations/
```

---

## 🔐 Security Features

1. **Password Hashing** - bcryptjs with 10 rounds
2. **JWT Tokens** - Signed with secret, expiring tokens
3. **CORS** - Configurable allowed origins
4. **Helmet** - Security headers
5. **Zone Isolation** - Cross-zone access denied
6. **Audit Logging** - All actions logged
7. **Request Validation** - Input validation on all endpoints
8. **Rate Limiting** - (Ready for phase 2)

---

## 📊 Database Schema Highlights

### Core Tables

- `zones` - Zone hierarchy
- `users` - User accounts
- `user_zones` - User-zone mapping with roles
- `roles` - Role definitions
- `capabilities` - Permission definitions
- `role_capabilities` - Role-capability mapping
- `audit_logs` - Audit trail
- `sessions` - Session management

All designed for zone-based multi-tenancy.

---

## 🐛 Troubleshooting

### Database Connection Failed

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:**

- Check MySQL is running
- Verify DB credentials in .env
- Check database exists

### Token Verification Failed

```
Error: Invalid or expired token
```

**Solution:**

- Token may have expired (valid for 24h)
- Use refresh token to get new token
- Check JWT_SECRET matches server

### Migration Failed

```
Error: Table 'crm_db.users' already exists
```

**Solution:**

- This is expected if running migrations twice
- Tables won't be recreated
- Data is preserved

---

## 📋 Next Steps

After Phase 1 is confirmed working:

1. **Phase 2** - Lead Management (CRUD, status lifecycle, activity timeline)
2. **Phase 3** - Pipelines & Projects (Kanban, stage transitions)
3. **Phase 4** - Tasks & Assignments (Task list, notifications)
4. **Phase 5** - Meetings & Calendar (Scheduling, invitations)
5. **Phase 6** - Pricing (Zone-wise price lists, audit trail)
6. **Phase 7** - Reporting (KPIs, daily closing, exports)

---

## ✅ Verification Checklist

- [ ] npm dependencies installed
- [ ] .env file configured with DB credentials
- [ ] Database created and user granted privileges
- [ ] Migrations run successfully
- [ ] Server starts without errors
- [ ] Login endpoint returns valid token
- [ ] Auth/me endpoint returns user with zones
- [ ] Token validation working
- [ ] Logs created in logs/ directory

---

## 📞 Support

For issues or questions:

1. Check logs in `logs/app.log`
2. Review error messages in console
3. Verify database state
4. Check environment variables
