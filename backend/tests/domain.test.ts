import { computeSla, shouldEscalateImmediately, BASE_SLA } from '../src/domain/priority';
import { assertTransition, canTransition } from '../src/domain/status';
import { buildAutoGuide, mapIssueType, JIRA_PRIORITY_MAP } from '../src/domain/jira';

describe('SLA engine', () => {
  it('applies customer × project factor', () => {
    // P1 base resolve = 4h; platinum 0.5 × critical 0.75 = 0.375 → 1.5h
    const sla = computeSla('P1', 'platinum', 'critical', new Date('2026-01-01T00:00:00Z'));
    expect(sla.resolveHours).toBeCloseTo(BASE_SLA.P1.resolveHours * 0.5 * 0.75, 5);
    expect(sla.responseHours).toBeCloseTo(BASE_SLA.P1.responseHours * 0.5 * 0.75, 5);
  });

  it('silver + medium keeps base SLA', () => {
    const sla = computeSla('P3', 'silver', 'medium');
    expect(sla.resolveHours).toBe(BASE_SLA.P3.resolveHours);
  });

  it('bronze + low relaxes SLA beyond base', () => {
    const sla = computeSla('P2', 'bronze', 'low');
    expect(sla.resolveHours).toBeGreaterThan(BASE_SLA.P2.resolveHours);
  });

  it('escalates Platinum P1/P2 immediately', () => {
    expect(shouldEscalateImmediately('platinum', 'P1')).toBe(true);
    expect(shouldEscalateImmediately('platinum', 'P3')).toBe(false);
    expect(shouldEscalateImmediately('gold', 'P1')).toBe(false);
  });
});

describe('status state machine', () => {
  it('allows the standard technical flow', () => {
    expect(canTransition('open', 'in_progress')).toBe(true);
    expect(canTransition('in_progress', 'build')).toBe(true);
    expect(canTransition('build', 'testing')).toBe(true);
    expect(canTransition('testing', 'deploy')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('open', 'deploy')).toBe(false);
    expect(() => assertTransition({ from: 'open', to: 'deploy' })).toThrow();
  });

  it('requires mandatory meta for waiting', () => {
    expect(() => assertTransition({ from: 'open', to: 'waiting' })).toThrow(/requires/);
    expect(() =>
      assertTransition({
        from: 'open',
        to: 'waiting',
        meta: { waiting_for_whom: 'KH', waiting_for_what: 'thông tin', follow_deadline: '2026-01-02' },
      })
    ).not.toThrow();
  });

  it('requires deploy metadata', () => {
    expect(() => assertTransition({ from: 'testing', to: 'deploy' })).toThrow(/requires/);
    expect(() =>
      assertTransition({
        from: 'testing',
        to: 'deploy',
        meta: { deploy_environment: 'prod', deploy_time: 'now', deploy_by: 'Hoa' },
      })
    ).not.toThrow();
  });
});

describe('jira auto guide', () => {
  it('maps categories to issue types & priorities', () => {
    expect(mapIssueType('Bug Report')).toBe('Bug');
    expect(mapIssueType('feature')).toBe('Story');
    expect(mapIssueType('how-to')).toBe('Task');
    expect(JIRA_PRIORITY_MAP.P1).toBe('Highest');
  });

  it('builds 8 guide steps with Jira description', () => {
    const guide = buildAutoGuide({
      ticketId: 'x',
      code: 'HD-0001',
      title: 'Login broken',
      description: 'cannot login',
      priorityLevel: 'P1',
      category: 'bug',
      projectName: 'HRM System',
      orgName: 'ACME',
      customerName: 'ACME User',
      hid180Url: 'http://localhost/tickets/HD-0001',
    });
    expect(guide.steps).toHaveLength(8);
    expect(guide.issueType).toBe('Bug');
    expect(guide.description).toContain('h2. Steps to Reproduce');
    expect(guide.labels).toContain('HD-0001');
  });
});
