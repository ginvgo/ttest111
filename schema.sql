DROP TABLE IF EXISTS projects;
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_name TEXT UNIQUE NOT NULL, 
    is_public INTEGER DEFAULT 1,      
    is_encrypted INTEGER DEFAULT 0,   
    passwords TEXT,                   
    article_link TEXT,                
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
