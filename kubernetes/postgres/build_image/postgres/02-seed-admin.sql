-- 02-seed-admin.sql
INSERT INTO "User" (id, email, password, name, role, "isActive")
VALUES (
    gen_random_uuid()::text,
    'admin@amer.dev',
    '\\\',
    'Amer Admin',
    'ADMIN',
    true
) ON CONFLICT (email) DO NOTHING;
