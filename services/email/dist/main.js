"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const logger = new common_1.Logger('Bootstrap');
function validateEnvVars() {
    const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
        logger.error(`Missing: ${missing.join(', ')}`);
        process.exit(1);
    }
}
async function bootstrap() {
    validateEnvVars();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(process.env.PORT ?? 3008);
    logger.log('Email Service running on port 3008');
}
bootstrap();
//# sourceMappingURL=main.js.map