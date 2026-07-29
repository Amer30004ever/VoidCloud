import { Test, TestingModule } from '@nestjs/testing';
import { PodsK8sService } from './pods.service';

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

describe('PodsK8sService', () => {
  let service: PodsK8sService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PodsK8sService],
    }).compile();
    service = module.get<PodsK8sService>(PodsK8sService);
  });

  it('rejects disallowed namespace in listPods', async () => {
    await expect(service.listPods('kube-system')).rejects.toThrow('Namespace "kube-system" is not allowed');
  });

  it('rejects disallowed namespace in restartDeployment', async () => {
    await expect(service.restartDeployment('kube-system', 'x')).rejects.toThrow('Namespace "kube-system" is not allowed');
  });

  it('rejects disallowed namespace in getLogStream', async () => {
    await expect(service.getLogStream('kube-system', 'p', undefined, 200)).rejects.toThrow('Namespace "kube-system" is not allowed');
  });

  it('formats age correctly', async () => {
    const now = Date.now();
    const iso = new Date(now - 2 * 86400000).toISOString();
    const result = (service as any).formatAge(iso);
    expect(result).toBe('2d');
  });
});
