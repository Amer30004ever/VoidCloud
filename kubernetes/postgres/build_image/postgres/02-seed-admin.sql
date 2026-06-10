-- 02-seed-admin.sql
-- Insert admin user (password: AmerDevOps2026!)
INSERT INTO "User" (id, email, password, name, role, "isActive") 
VALUES (
    '4b4a9fc0-1271-47d4-8ff7-619e0e0ee254',
    'admin@amer.dev',
    '$2b$10$vEM2gvnLFKt2W7BfYuYhFeIRFrRsjvwPGen8WLEBcGF7k2t46n5Fq',
    'Amer Admin',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
