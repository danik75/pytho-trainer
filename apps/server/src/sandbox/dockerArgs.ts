export interface SandboxRunConfig {
  image: string;
  memoryMb: number;
}

/**
 * Pure builder for the `docker run` argument list, kept separate from actual
 * process execution so the security flags can be unit tested without Docker.
 */
export function buildDockerRunArgs(
  config: SandboxRunConfig,
  containerName: string,
  hostDir: string,
): string[] {
  return [
    'run',
    '--rm',
    '--name',
    containerName,
    '--network',
    'none',
    '--memory',
    `${config.memoryMb}m`,
    '--memory-swap',
    `${config.memoryMb}m`,
    '--cpus',
    '0.5',
    '--pids-limit',
    '64',
    '--read-only',
    '--tmpfs',
    '/tmp:size=16m',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--user',
    'runner',
    '-v',
    `${hostDir}:/workspace:ro`,
    config.image,
  ];
}
