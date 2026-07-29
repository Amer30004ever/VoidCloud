export interface PrismaServiceLike {
  apiUsageLog: {
    createMany: (args: { data: any[] }) => Promise<any>;
  };
}
