export class CreateActivityDto {
  action: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}
