# Add Another Admin User

kubectl exec -n amer-portal deployment/postgres -- psql -U postgres -d amer_portal -c "
INSERT INTO \"User\" (id, email, password, name, role)
VALUES (
    gen_random_uuid()::text,
    'secondadmin@amer.dev',
    '\$2b\$10\$vEM2gvnLFKt2W7BfYuYhFeIRFrRsjvwPGen8WLEBcGF7k2t46n5Fq',
    'Second Admin',
    'ADMIN'
) ON CONFLICT (email) DO NOTHING;
"

# Add a Regular (Non-Admin) User

kubectl exec -n amer-portal deployment/postgres -- psql -U postgres -d amer_portal -c "
INSERT INTO \"User\" (id, email, password, name, role)
VALUES (
    gen_random_uuid()::text,
    'regular@amer.dev',
    '\$2b\$10\$vEM2gvnLFKt2W7BfYuYhFeIRFrRsjvwPGen8WLEBcGF7k2t46n5Fq',
    'Regular User',
    'USER'
) ON CONFLICT (email) DO NOTHING;
"

# View All Users

kubectl exec -n amer-portal deployment/postgres -- psql -U postgres -d amer_portal -c "
SELECT email, name, role, TO_CHAR(\"createdAt\", 'YYYY-MM-DD HH24:MI:SS') as created
FROM \"User\" 
ORDER BY role DESC, \"createdAt\" DESC;
"
# Delete a User (If Needed)

# Delete a specific user by email
kubectl exec -n amer-portal deployment/postgres -- psql -U postgres -d amer_portal -c "
DELETE FROM \"User\" WHERE email = 'user@amer.dev';
"

🔐 Complete Credentials List
Email	Password	Role
admin@amer.dev	AmerDevOps2026!	ADMIN
newadmin@amer.dev	AmerDevOps2026!	ADMIN
secondadmin@amer.dev	AmerDevOps2026!	ADMIN
regular@amer.dev	AmerDevOps2026!	USER