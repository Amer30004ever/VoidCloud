import { Test, TestingModule } from '@nestjs/testing';
import { PodsController } from './pods.controller';
import { PodsK8sService } from './pods.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromDefault: jest.fn(),
    makeApiClient: jest.fn().mockReturnValue({
      listNamespacedPod: jest.fn(),
      patchNamespacedDeployment: jest.fn(),
      readNamespacedPodLog: jest.fn(),
    }),
  })),
  CoreV1Api: jest.fn(),
  AppsV1Api: jest.fn(),
  V1Container: jest.fn(),
  V1Pod: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
}));

describe('PodsController', () => {
  let controller: PodsController;
  let k8s: jest.Mocked<PodsK8sService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PodsController],
      providers: [
        {
          provide: PodsK8sService,
          useValue: {
            listPods: jest.fn(),
            restartDeployment: jest.fn(),
            getLogStream: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<PodsController>(PodsController);
    k8s = module.get(PodsK8sService) as any;
    prisma = module.get(PrismaService) as any;
  });

  afterEach(() => jest.clearAllMocks());

  it('lists pods for allowed namespace', async () => {
    k8s.listPods.mockResolvedValue({ pods: [{ name: 'p', namespace: 'voidcloud', status: 'Running', ready: '1/1', restarts: 0, age: '1d', node: 'n1', cpu: '10m', memory: '128Mi' }] } as any);
    const result = await controller.list('voidcloud');
    expect(k8s.listPods).toHaveBeenCalledWith('voidcloud');
    expect(result.pods).toHaveLength(1);
  });

  it('rejects disallowed namespace', async () => {
    k8s.listPods.mockRejectedValue(new Error('Namespace "kube-system" is not allowed'));
    await expect(controller.list('kube-system')).rejects.toThrow('Namespace "kube-system" is not allowed');
  });

  it('restarts deployment after re-auth verification', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      password: 'hashed',
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });
    k8s.restartDeployment.mockResolvedValue({ ok: true, message: 'Deployment "x" restart initiated' } as any);
    const user = { id: 'u1', email: 'a@b.com' } as any;
    const result = await controller.restart('voidcloud', 'x', user, { password: 'p', totpCode: undefined });
    expect(k8s.restartDeployment).toHaveBeenCalledWith('voidcloud', 'x');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'POD_RESTART_INITIATED',
        userId: 'u1',
        userEmail: 'a@b.com',
        resource: 'voidcloud/x',
        details: expect.objectContaining({ reauthMethod: 'password' }),
      }),
    });
    expect(result.ok).toBe(true);
  });

  it('rejects restart without re-auth credentials', async () => {
    const user = { id: 'u1', email: 'a@b.com' } as any;
    await expect(controller.restart('voidcloud', 'x', user, {})).rejects.toThrow('password or totpCode is required');
  });

  it('returns pod logs', async () => {
    k8s.getLogStream.mockResolvedValue('line1\nline2');
    const result = await controller.logs('voidcloud', 'p', undefined, '200');
    expect(k8s.getLogStream).toHaveBeenCalledWith('voidcloud', 'p', undefined, 200);
    expect(result.logs).toBe('line1\nline2');
  });
});
