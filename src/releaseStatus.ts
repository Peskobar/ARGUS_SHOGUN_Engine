export const RELEASE_SECURITY_GATE = {
  passed: false,
  source: 'CI_PENDING',
  checkedAt: null as string | null,
  workflowRunId: null as number | null,
  note: 'Fail-closed until the final integration CI run passes.',
} as const;
