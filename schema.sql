DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_name TEXT UNIQUE NOT NULL, 
    project_name TEXT,                -- Added for Chinese name support
    is_public INTEGER DEFAULT 1,      
    is_encrypted INTEGER DEFAULT 0,   
    passwords TEXT,                   
    article_link TEXT,                
    injected_libs TEXT,               -- Added based on upload.js usage
    remember_days INTEGER DEFAULT 30, -- Added based on upload.js usage
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS app_settings;
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
INSERT INTO app_settings (key, value) VALUES ('page_size', '12');
