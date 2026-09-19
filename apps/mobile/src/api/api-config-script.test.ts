const { spawnSync } = jest.requireActual('child_process') as {
  spawnSync: (
    executable: string,
    args: string[],
    options: { env: NodeJS.ProcessEnv; encoding: string },
  ) => { status: number | null; stdout: string; stderr: string };
};

const validatorPath = `${process.cwd()}/scripts/validate-release-api.cjs`;

function runValidator(
  profile: string | undefined,
  apiBaseUrl: string | undefined,
  mode: 'export' | 'eas-hook' = 'export',
) {
  const env = { ...process.env };
  delete env.EAS_BUILD_PROFILE;
  delete env.EXPO_PUBLIC_API_BASE_URL;
  if (profile !== undefined) env.EAS_BUILD_PROFILE = profile;
  if (apiBaseUrl !== undefined) env.EXPO_PUBLIC_API_BASE_URL = apiBaseUrl;
  const args = mode === 'eas-hook' ? [validatorPath, '--eas-hook'] : [validatorPath];
  return spawnSync(process.execPath, args, { env, encoding: 'utf8' });
}

describe('release API validation script', () => {
  it.each([
    { profile: undefined, mode: 'export' as const, label: 'local export' },
    { profile: 'development', mode: 'export' as const, label: 'export with a leaked development profile' },
    { profile: 'preview', mode: 'eas-hook' as const, label: 'preview build' },
    { profile: 'production', mode: 'eas-hook' as const, label: 'production build' },
  ])('rejects a missing endpoint for $label', ({ profile, mode }) => {
    const result = runValidator(profile, undefined, mode);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'EXPO_PUBLIC_API_BASE_URL es obligatoria en builds de release.',
    );
  });

  it.each([
    { profile: undefined, mode: 'export' as const, label: 'local export' },
    { profile: 'development', mode: 'export' as const, label: 'export with a leaked development profile' },
    { profile: 'preview', mode: 'eas-hook' as const, label: 'preview build' },
    { profile: 'production', mode: 'eas-hook' as const, label: 'production build' },
  ])('rejects an HTTP endpoint for $label', ({ profile, mode }) => {
    const result = runValidator(profile, 'http://127.0.0.1:4000/api/v1', mode);
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain(
      'EXPO_PUBLIC_API_BASE_URL debe usar HTTPS en builds de release.',
    );
  });

  it.each([
    { profile: undefined, mode: 'export' as const, label: 'local export' },
    { profile: 'preview', mode: 'eas-hook' as const, label: 'preview build' },
    { profile: 'production', mode: 'eas-hook' as const, label: 'production build' },
  ])('accepts an HTTPS endpoint for $label', ({ profile, mode }) => {
    expect(runValidator(profile, 'https://api.example.invalid/api/v1', mode).status).toBe(0);
  });

  it.each([
    { endpoint: undefined, label: 'the emulator fallback' },
    { endpoint: 'http://10.0.2.2:4000/api/v1', label: 'an explicit emulator endpoint' },
    { endpoint: 'https://api.example.invalid/api/v1', label: 'an HTTPS endpoint' },
  ])('allows $label for the EAS development profile', ({ endpoint }) => {
    expect(runValidator('development', endpoint, 'eas-hook').status).toBe(0);
  });
});
