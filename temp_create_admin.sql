INSERT INTO "User" (id, email, name, password, role, "isActive", "mustChangePassword", "updatedAt") 
VALUES ('admin-id-001', 'amer30004ever@hotmail.com', 'Amer Admin', '$2b$10$D0FGTxvCA0u9NloZmvIVwuXkUTzAKd413ZSBG44cPiuEBj5xSzVym', 'SUPER_ADMIN', true, false, NOW()) 
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  password = EXCLUDED.password, 
  "isActive" = EXCLUDED."isActive", 
  "mustChangePassword" = EXCLUDED."mustChangePassword",
  "updatedAt" = EXCLUDED."updatedAt";
