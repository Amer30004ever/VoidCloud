import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WebhookModule } from './webhook/webhook.module';
import { StatsModule } from './stats/stats.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { LogsModule } from './logs/logs.module';
import { AlertsModule } from './alerts/alerts.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClusterModule } from './cluster/cluster.module';
import { AdminClusterModule } from './admin-cluster/admin-cluster.module';

import { GithubModule } from './github/github.module';
import { DocumentationModule } from './documentation/documentation.module';
import { LearningModule } from './learning/learning.module';
import { AutomationModule } from './automation/automation.module';
import { SecurityModule } from './security/security.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { SettingsModule } from './settings/settings.module';
import { PlatformModule } from './platform/platform.module';
import { ProjectsModule } from './projects/projects.module';
import { MetricsModule } from './metrics/metrics.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { NotesModule } from './notes/notes.module';
import { CloudModule } from './cloud/cloud.module';
import { MailerModule } from './mailer/mailer.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    // Load .env globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Prisma (global — auto-available in all modules)
    PrismaModule,
    MailerModule,

    // Feature modules
    AuthModule,
    WebhookModule,
    StatsModule,
    DashboardModule,
    InfrastructureModule,
    LogsModule,
    AlertsModule,

    // New modules
    ClusterModule,
    AdminClusterModule,

    GithubModule,
    DocumentationModule,
    LearningModule,
    AutomationModule,
    SecurityModule,
    CollaborationModule,
    IntegrationsModule,
    SettingsModule,
    PlatformModule,
    ProjectsModule,
    MetricsModule,
    PipelinesModule,
    NotesModule,
    CloudModule,
  ],
  controllers: [AppController],
  providers: [
    // Apply JWT guard globally — use @Public() to opt out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply Roles guard globally — use @Roles(Role.ADMIN) to restrict
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
