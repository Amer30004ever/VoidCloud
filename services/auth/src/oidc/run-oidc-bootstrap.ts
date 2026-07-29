import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OidcBootstrapService } from './oidc-bootstrap.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [OidcBootstrapService],
})
class BootstrapModule {}

async function main() {
  const target = process.argv[2] ?? 'all';
  const app = await NestFactory.createApplicationContext(BootstrapModule);
  const bootstrap = app.get(OidcBootstrapService);

  const results = [];
  if (target === 'all' || target === 'gitea') {
    results.push(await bootstrap.bootstrapGitea());
  }
  if (target === 'all' || target === 'portainer') {
    results.push(await bootstrap.bootstrapPortainer());
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(results, null, 2));

  const failed = results.some((r) => r.status === 'error');
  await app.close();
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
