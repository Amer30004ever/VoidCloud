import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { UsageModule } from './usage/usage.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';
import { ChannelsModule } from './channels/channels.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { ProjectsModule } from './projects/projects.module';
import { GenerationsModule } from './generations/generations.module';
import { ActivityModule } from './activity/activity.module';
import { ProvisioningModule } from './provisioning/provisioning.module';

declare const __dirname: string;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'postgres'),
        port: configService.get('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USER', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'sub2api_db'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        logging: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('REDIS_HOST', 'redis'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD', ''),
          db: 0,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ApiKeysModule,
    UsageModule,
    BillingModule,
    AdminModule,
    ChannelsModule,
    SubscriptionsModule,
    ProjectsModule,
    GenerationsModule,
    ActivityModule,
    ProvisioningModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
