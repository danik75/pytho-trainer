import { buildDockerRunArgs } from './dockerArgs';

describe('buildDockerRunArgs', () => {
  it('includes all required security constraints', () => {
    const args = buildDockerRunArgs(
      { image: 'pytho-trainer-sandbox', memoryMb: 128 },
      'container-1',
      '/tmp/host-dir',
    );

    expect(args).toEqual(
      expect.arrayContaining([
        '--network',
        'none',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--user',
        'runner',
        '--pids-limit',
        '64',
      ]),
    );
  });

  it('mounts the host directory read-only and names the container', () => {
    const args = buildDockerRunArgs(
      { image: 'pytho-trainer-sandbox', memoryMb: 256 },
      'my-container',
      '/tmp/some-dir',
    );

    expect(args).toContain('/tmp/some-dir:/workspace:ro');
    expect(args).toContain('my-container');
    expect(args).toContain('256m');
    expect(args[args.length - 1]).toBe('pytho-trainer-sandbox');
  });
});
