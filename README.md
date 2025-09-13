# OAuth 2.0 JSON Backend API

Bu layihə OAuth 2.0 protokolunun necə işlədiyini anlamaq üçün hazırlanmış sadə bir backend API-dir. Tamamilə JSON response-lar verir və frontend hissəsi yoxdur.

## İçindəkilər

- [Quraşdırım](#quraşdırım)
- [OAuth Prosesi](#oauth-prosesi)
- [Test İstifadəçiləri](#test-istifadəçiləri)
- [API Endpoint-ləri](#api-endpoint-ləri)
- [OAuth Flow Addımları](#oauth-flow-addımları)
- [Postman Testləri](#postman-testləri)
- [cURL Nümunələri](#curl-nümunələri)
- [Xəta Kodları](#xəta-kodları)
- [Token İdarəetməsi](#token-idarəetməsi)

## Quraşdırım

### Tələblər
- Node.js (v14 və ya daha yeni)
- npm

### Quraşdırım Addımları

1. Layihəni yükləyin və qovluğa keçin:
```bash
mkdir oauth-backend
cd oauth-backend
```

2. package.json faylını yaradın:
```bash
npm init -y
```

3. Lazımi paketləri quraşdırın:
```bash
npm install express cors nodemon
```

4. server.js faylını yaradın və kodu əlavə edin

5. Serveri işə salın:
```bash
npm run dev
```

Server http://localhost:3000 ünvanında işləyəcək.

## OAuth Prosesi

OAuth 2.0 Authorization Code Flow aşağıdakı addımlardan ibarətdir:

1. **Authorization Request** - İstifadəçi icazə verir
2. **Authorization Grant** - Authorization code alınır
3. **Access Token Request** - Code token-ə çevrilir
4. **Protected Resource Access** - Token ilə API istifadəsi

## Test İstifadəçiləri

Sistem 3 test istifadəçisi ilə hazırlanıb:

| İstifadəçi adı | Parol | Email | Ad |
|----------------|-------|-------|-----|
| john | password123 | john@example.com | John Doe |
| jane | mypassword | jane@example.com | Jane Smith |
| admin | admin123 | admin@example.com | Admin User |

## API Endpoint-ləri

### Ana Səhifə
```
GET /
```
API siyahısı və ümumi məlumat qaytarır.

### Test İstifadəçiləri
```
GET /users
```
Mövcud test istifadəçilərinin siyahısını göstərir.

### OAuth Authorization
```
POST /oauth/authorize
```
İstifadəçini doğrulayır və authorization code generasiya edir.

**Request Body:**
```json
{
  "response_type": "code",
  "client_id": "my_app_12345",
  "redirect_uri": "http://localhost:3000/callback",
  "scope": "read_profile",
  "state": "xyz123",
  "username": "john",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authorization code uğurla generasiya edildi",
  "authorization_code": "a1b2c3d4...",
  "state": "xyz123",
  "expires_in": 600,
  "next_step": "Bu code-u /oauth/token endpoint-ində istifadə edin"
}
```

### OAuth Token
```
POST /oauth/token
```
Authorization code-u access token-ə çevirir.

**Request Body:**
```json
{
  "grant_type": "authorization_code",
  "code": "a1b2c3d4...",
  "client_id": "my_app_12345",
  "client_secret": "super_secret_key_67890",
  "redirect_uri": "http://localhost:3000/callback"
}
```

**Response:**
```json
{
  "access_token": "x1y2z3w4...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "r1s2t3u4...",
  "scope": "read_profile",
  "user_info": {
    "user_id": 1,
    "username": "john"
  }
}
```

### Qorunan Profil API
```
GET /api/profile
```
Access token ilə istifadəçi profil məlumatlarını qaytarır.

**Header:**
```
Authorization: Bearer x1y2z3w4...
```

**Response:**
```json
{
  "message": "Profil məlumatları uğurla alındı",
  "profile": {
    "user_id": 1,
    "username": "john",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "token_info": {
    "scope": "read_profile",
    "client_id": "my_app_12345",
    "issued_at": "2024-01-01T10:00:00.000Z",
    "expires_at": "2024-01-01T11:00:00.000Z",
    "remaining_seconds": 3456
  }
}
```

### Token Yeniləmə
```
POST /api/refresh
```
Refresh token ilə yeni access token alır.

**Request Body:**
```json
{
  "refresh_token": "r1s2t3u4...",
  "client_id": "my_app_12345",
  "client_secret": "super_secret_key_67890"
}
```

### Server Statusu
```
GET /status
```
Server və OAuth statistikalarını göstərir.

## OAuth Flow Addımları

### Addım 1: Authorization Code Alın

İlk olaraq istifadəçi məlumatları ilə authorization code alın:

```bash
curl -X POST http://localhost:3000/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "code",
    "client_id": "my_app_12345",
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "read_profile",
    "state": "abc123",
    "username": "john",
    "password": "password123"
  }'
```

Cavab olaraq authorization code alacaqsınız.

### Addım 2: Access Token Alın

Authorization code ilə access token alın:

```bash
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "BURAYA_CODE_YAZIN",
    "client_id": "my_app_12345",
    "client_secret": "super_secret_key_67890",
    "redirect_uri": "http://localhost:3000/callback"
  }'
```

### Addım 3: API İstifadəsi

Access token ilə qorunan API-yə giriş:

```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer BURAYA_TOKEN_YAZIN"
```

## Postman Testləri

### Collection İmport

Postman-da yeni collection yaradın və aşağıdakı request-ləri əlavə edin:

#### 1. Get Authorization Code
- Method: POST
- URL: `http://localhost:3000/oauth/authorize`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "response_type": "code",
  "client_id": "my_app_12345",
  "redirect_uri": "http://localhost:3000/callback",
  "scope": "read_profile",
  "state": "test123",
  "username": "john",
  "password": "password123"
}
```

#### 2. Get Access Token
- Method: POST
- URL: `http://localhost:3000/oauth/token`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "grant_type": "authorization_code",
  "code": "{{authorization_code}}",
  "client_id": "my_app_12345",
  "client_secret": "super_secret_key_67890",
  "redirect_uri": "http://localhost:3000/callback"
}
```

#### 3. Get Profile
- Method: GET
- URL: `http://localhost:3000/api/profile`
- Headers: `Authorization: Bearer {{access_token}}`

### Environment Variables

Postman-da environment yaradın və aşağıdakı variable-ları əlavə edin:
- `base_url`: `http://localhost:3000`
- `client_id`: `my_app_12345`
- `client_secret`: `super_secret_key_67890`
- `authorization_code`: (response-dan əl ilə kopyalayın)
- `access_token`: (response-dan əl ilə kopyalayın)

## cURL Nümunələri

### Tam OAuth Test

```bash
# 1. Authorization code al
RESPONSE=$(curl -s -X POST http://localhost:3000/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{
    "response_type": "code",
    "client_id": "my_app_12345", 
    "redirect_uri": "http://localhost:3000/callback",
    "scope": "read_profile",
    "state": "test123",
    "username": "john",
    "password": "password123"
  }')

echo "Authorization Response:"
echo $RESPONSE | jq

# 2. Code-u çıxarın (jq lazımdır)
CODE=$(echo $RESPONSE | jq -r '.authorization_code')

# 3. Access token al
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d "{
    \"grant_type\": \"authorization_code\",
    \"code\": \"$CODE\",
    \"client_id\": \"my_app_12345\",
    \"client_secret\": \"super_secret_key_67890\",
    \"redirect_uri\": \"http://localhost:3000/callback\"
  }")

echo "Token Response:"
echo $TOKEN_RESPONSE | jq

# 4. Access token-i çıxarın
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.access_token')

# 5. Profil məlumatlarını alın
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq
```

## Xəta Kodları

### Authorization Xətaları
| Xəta | Açıqlama |
|------|----------|
| `invalid_request` | Request parametrləri yanlışdır |
| `invalid_client` | Client ID yanlışdır |
| `access_denied` | İstifadəçi adı və ya parol yanlışdır |

### Token Xətaları
| Xəta | Açıqlama |
|------|----------|
| `invalid_grant` | Authorization code yanlış və ya vaxtı keçib |
| `unsupported_grant_type` | Grant type dəstəklənmir |
| `invalid_client` | Client məlumatları yanlışdır |

### API Xətaları
| Xəta | Açıqlama |
|------|----------|
| `invalid_token` | Access token yanlış və ya vaxtı keçib |
| `invalid_request` | Authorization header yoxdur |

## Token İdarəetməsi

### Token Müddətləri
- **Authorization Code**: 10 dəqiqə
- **Access Token**: 1 saat
- **Refresh Token**: 7 gün

### Token Yeniləmə
Access token vaxtı keçdikdə, refresh token istifadə edərək yeni token ala bilərsiniz:

```bash
curl -X POST http://localhost:3000/api/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "REFRESH_TOKEN_BURAYA",
    "client_id": "my_app_12345",
    "client_secret": "super_secret_key_67890"
  }'
```

## OAuth Konfiqurasiyası

Layihədə istifadə edilən sabit dəyərlər:

| Parametr | Dəyər |
|----------|-------|
| Client ID | my_app_12345 |
| Client Secret | super_secret_key_67890 |
| Redirect URI | http://localhost:3000/callback |
| Authorization Code TTL | 10 dəqiqə |
| Access Token TTL | 1 saat |
| Refresh Token TTL | 7 gün |

## Məhdudiyyətlər

- Bu layihə yalnız öyrənmə məqsədlədir
- Real istehsalda istifadə etməyin
- HTTPS dəstəyi yoxdur
- Database yox, yaddaşda saxlanılır
- Parollar hash edilməyib
- Rate limiting yoxdur

## Gələcək İnkişaf

- HTTPS dəstəyi
- Database inteqrasiyası
- Parol hash-lənməsi
- Rate limiting
- JWT token dəstəyi
- Scope-based permissions
- Client qeydiyyatı sistemi

## License

Bu layihə təhsil məqsədlədir və açıq mənbədir.
