const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

const users = new Map([
    ['john', { id: 1, username: 'john', password: 'password123', email: 'john@example.com', name: 'John Doe' }],
    ['jane', { id: 2, username: 'jane', password: 'mypassword', email: 'jane@example.com', name: 'Jane Smith' }],
    ['admin', { id: 3, username: 'admin', password: 'admin123', email: 'admin@example.com', name: 'Admin User' }]
]);

const authorizationCodes = new Map();
const accessTokens = new Map();
const refreshTokens = new Map();

const OAUTH_CONFIG = {
    CLIENT_ID: 'my_app_12345',
    CLIENT_SECRET: 'super_secret_key_67890',
    REDIRECT_URI: 'http://localhost:3000/callback',
    AUTHORIZATION_CODE_EXPIRY: 10 * 60 * 1000, // 10 dəqiqə
    ACCESS_TOKEN_EXPIRY: 60 * 60 * 1000,       // 1 saat
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000 // 7 gün
};

app.get('/', (req, res) => {
    res.json({
        message: "OAuth 2.0 JSON Backend API",
        version: "1.0.0",
        endpoints: {
            "GET /": "Bu səhifə - API siyahısı",
            "GET /users": "Test istifadəçiləri",
            "POST /oauth/authorize": "Authorization başlat",
            "POST /oauth/token": "Access token al",
            "GET /oauth/callback": "OAuth callback",
            "GET /api/profile": "Qorunan profil məlumatı",
            "POST /api/refresh": "Token yenilə",
            "GET /status": "Server statusu"
        },
        oauth_flow: [
            "1. POST /oauth/authorize - Authorization code al",
            "2. POST /oauth/token - Access token al", 
            "3. GET /api/profile - API istifadə et"
        ],
        test_users: [
            { username: "john", password: "password123" },
            { username: "jane", password: "mypassword" },
            { username: "admin", password: "admin123" }
        ]
    });
});

app.get('/users', (req, res) => {
    const userList = Array.from(users.values()).map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name
    }));

    res.json({
        message: "Test istifadəçiləri",
        users: userList,
        note: "Bu istifadəçilərlə OAuth testi edə bilərsiniz"
    });
});

app.post('/oauth/authorize', (req, res) => {
    const { 
        response_type, 
        client_id, 
        redirect_uri, 
        scope, 
        state,
        username,
        password 
    } = req.body;

    if (!response_type || response_type !== 'code') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'response_type "code" olmalıdır'
        });
    }

    if (!client_id || client_id !== OAUTH_CONFIG.CLIENT_ID) {
        return res.status(400).json({
            error: 'invalid_client',
            error_description: 'Yanlış client_id'
        });
    }

    if (!redirect_uri || redirect_uri !== OAUTH_CONFIG.REDIRECT_URI) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Yanlış redirect_uri'
        });
    }

    if (!username || !password) {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'username və password tələb olunur'
        });
    }

    const user = users.get(username);
    if (!user || user.password !== password) {
        return res.status(401).json({
            error: 'access_denied',
            error_description: 'Yanlış istifadəçi adı və ya parol'
        });
    }

    const authCode = crypto.randomBytes(32).toString('hex');
    
    authorizationCodes.set(authCode, {
        user_id: user.id,
        username: user.username,
        client_id,
        redirect_uri,
        scope: scope || 'read_profile',
        state,
        created_at: Date.now(),
        expires_at: Date.now() + OAUTH_CONFIG.AUTHORIZATION_CODE_EXPIRY
    });

    res.json({
        success: true,
        message: "Authorization code uğurla generasiya edildi",
        authorization_code: authCode,
        state: state,
        expires_in: Math.floor(OAUTH_CONFIG.AUTHORIZATION_CODE_EXPIRY / 1000),
        next_step: "Bu code-u /oauth/token endpoint-ində istifadə edin"
    });
});

app.post('/oauth/token', (req, res) => {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

    if (grant_type !== 'authorization_code') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Yalnız "authorization_code" dəstəklənir'
        });
    }

    if (client_id !== OAUTH_CONFIG.CLIENT_ID || client_secret !== OAUTH_CONFIG.CLIENT_SECRET) {
        return res.status(401).json({
            error: 'invalid_client',
            error_description: 'Client ID və ya Client Secret yanlışdır'
        });
    }

    const codeData = authorizationCodes.get(code);
    if (!codeData) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code mövcud deyil və ya artıq istifadə edilib'
        });
    }

    if (Date.now() > codeData.expires_at) {
        authorizationCodes.delete(code);
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code vaxtı keçib'
        });
    }

    if (redirect_uri !== codeData.redirect_uri) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Redirect URI uyğun gəlmir'
        });
    }

    const accessToken = crypto.randomBytes(32).toString('hex');
    const refreshToken = crypto.randomBytes(32).toString('hex');

    accessTokens.set(accessToken, {
        user_id: codeData.user_id,
        username: codeData.username,
        client_id,
        scope: codeData.scope,
        created_at: Date.now(),
        expires_at: Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY
    });

    refreshTokens.set(refreshToken, {
        user_id: codeData.user_id,
        username: codeData.username,
        client_id,
        scope: codeData.scope,
        access_token: accessToken,
        created_at: Date.now(),
        expires_at: Date.now() + OAUTH_CONFIG.REFRESH_TOKEN_EXPIRY
    });

    authorizationCodes.delete(code);

    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: Math.floor(OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY / 1000),
        refresh_token: refreshToken,
        scope: codeData.scope,
        user_info: {
            user_id: codeData.user_id,
            username: codeData.username
        }
    });
});

app.get('/api/profile', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'invalid_request',
            error_description: 'Authorization header-də Bearer token tələb olunur'
        });
    }

    const token = authHeader.substring(7);
    const tokenData = accessTokens.get(token);

    if (!tokenData) {
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Access token mövcud deyil'
        });
    }

    if (Date.now() > tokenData.expires_at) {
        accessTokens.delete(token);
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Access token vaxtı keçib'
        });
    }

    const user = Array.from(users.values()).find(u => u.id === tokenData.user_id);

    res.json({
        message: "Profil məlumatları uğurla alındı",
        profile: {
            user_id: user.id,
            username: user.username,
            email: user.email,
            name: user.name
        },
        token_info: {
            scope: tokenData.scope,
            client_id: tokenData.client_id,
            issued_at: new Date(tokenData.created_at).toISOString(),
            expires_at: new Date(tokenData.expires_at).toISOString(),
            remaining_seconds: Math.floor((tokenData.expires_at - Date.now()) / 1000)
        }
    });
});

app.post('/api/refresh', (req, res) => {
    const { refresh_token, client_id, client_secret } = req.body;

    if (client_id !== OAUTH_CONFIG.CLIENT_ID || client_secret !== OAUTH_CONFIG.CLIENT_SECRET) {
        return res.status(401).json({
            error: 'invalid_client',
            error_description: 'Client məlumatları yanlışdır'
        });
    }

    const refreshData = refreshTokens.get(refresh_token);
    if (!refreshData) {
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Refresh token mövcud deyil'
        });
    }

    if (Date.now() > refreshData.expires_at) {
        refreshTokens.delete(refresh_token);
        return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Refresh token vaxtı keçib'
        });
    }

    if (refreshData.access_token) {
        accessTokens.delete(refreshData.access_token);
    }

    const newAccessToken = crypto.randomBytes(32).toString('hex');
    const newRefreshToken = crypto.randomBytes(32).toString('hex');

    accessTokens.set(newAccessToken, {
        user_id: refreshData.user_id,
        username: refreshData.username,
        client_id: refreshData.client_id,
        scope: refreshData.scope,
        created_at: Date.now(),
        expires_at: Date.now() + OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY
    });

    refreshTokens.set(newRefreshToken, {
        user_id: refreshData.user_id,
        username: refreshData.username,
        client_id: refreshData.client_id,
        scope: refreshData.scope,
        access_token: newAccessToken,
        created_at: Date.now(),
        expires_at: Date.now() + OAUTH_CONFIG.REFRESH_TOKEN_EXPIRY
    });

    refreshTokens.delete(refresh_token);

    res.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: Math.floor(OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY / 1000),
        refresh_token: newRefreshToken,
        scope: refreshData.scope
    });
});
app.get('/oauth/callback', (req, res) => {
    const { code, state, error } = req.query;

    if (error) {
        return res.json({
            error: error,
            error_description: "OAuth authorization uğursuz oldu",
            state: state
        });
    }

    res.json({
        message: "OAuth callback",
        authorization_code: code,
        state: state,
        next_step: "Bu code-u POST /oauth/token endpoint-ində istifadə edin"
    });
});
app.get('/status', (req, res) => {
    res.json({
        server: 'OAuth JSON Backend',
        status: 'running',
        timestamp: new Date().toISOString(),
        statistics: {
            total_users: users.size,
            active_authorization_codes: authorizationCodes.size,
            active_access_tokens: accessTokens.size,
            active_refresh_tokens: refreshTokens.size
        },
        oauth_config: {
            client_id: OAUTH_CONFIG.CLIENT_ID,
            redirect_uri: OAUTH_CONFIG.REDIRECT_URI,
            code_expiry_minutes: OAUTH_CONFIG.AUTHORIZATION_CODE_EXPIRY / (60 * 1000),
            access_token_expiry_hours: OAUTH_CONFIG.ACCESS_TOKEN_EXPIRY / (60 * 60 * 1000),
            refresh_token_expiry_days: OAUTH_CONFIG.REFRESH_TOKEN_EXPIRY / (24 * 60 * 60 * 1000)
        }
    });
});

app.use('*', (req, res) => {
    res.status(404).json({
        error: 'not_found',
        message: 'Endpoint tapılmadı',
        available_endpoints: [
            'GET /',
            'GET /users',
            'POST /oauth/authorize',
            'POST /oauth/token',
            'GET /oauth/callback',
            'GET /api/profile',
            'POST /api/refresh',
            'GET /status'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`
OAuth JSON Backend işə salındı!
URL: http://localhost:${PORT}

Əsas endpoint-lər:
   GET  /               - API siyahısı
   GET  /users          - Test istifadəçiləri
   POST /oauth/authorize - Authorization başlat
   POST /oauth/token    - Access token al
   GET  /api/profile    - Qorunan API

OAuth test addımları:
   1. POST /oauth/authorize (username/password ilə)
   2. POST /oauth/token (code ilə)
   3. GET /api/profile (Bearer token ilə)
    `);
});