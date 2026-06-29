"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const logger = new common_1.Logger('Bootstrap');
function validateEnvVars() {
    const required = [
        'JWT_SECRET',
        'DATABASE_URL',
        'SMTP_HOST',
        'SMTP_USER',
        'SMTP_PASS',
    ];
    const missing = required.filter((key) => !process.env[key] || process.env[key]?.startsWith('your_'));
    if (missing.length > 0) {
        logger.error(`Missing: ${missing.join(', ')}`);
        process.exit(1);
    }
}
async function bootstrap() {
    validateEnvVars();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    logger.log(`Auth Service running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map