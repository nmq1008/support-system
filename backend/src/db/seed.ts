import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../config/db';
import { runMigrations } from './migrate';
import { BASE_SLA, CUSTOMER_FACTOR, computeSla } from '../domain/priority';
import { CUSTOMER_PRIORITIES, PRIORITY_LEVELS } from '../domain/types';
import { nextTicketCode } from '../modules/tickets/code';

const PASSWORD = 'Password@123';

/** Reusable template field builders. */
function field(
  key: string,
  type: string,
  vi: string,
  en: string,
  opts: Partial<{ required: boolean; placeholder: string; tooltip: string; options: any[]; section: boolean }> = {}
) {
  return {
    key,
    type,
    label: { vi, en },
    required: opts.required ?? false,
    placeholder: opts.placeholder ?? '',
    tooltip: opts.tooltip ?? '',
    options: opts.options ?? undefined,
  };
}

const BUG_REPORT_FIELDS = [
  { key: 'sec_info', type: 'section', label: { vi: 'Thông tin lỗi', en: 'Bug information' } },
  field('summary', 'text', 'Tiêu đề lỗi', 'Bug title', { required: true, placeholder: 'Mô tả ngắn gọn lỗi' }),
  field('description', 'textarea', 'Mô tả chi tiết', 'Detailed description', { required: true }),
  field('steps', 'textarea', 'Các bước tái hiện', 'Steps to reproduce', {
    required: true,
    tooltip: 'Liệt kê từng bước để reproduce lỗi',
  }),
  field('expected', 'textarea', 'Kết quả mong đợi', 'Expected result'),
  field('actual', 'textarea', 'Kết quả thực tế', 'Actual result'),
  field('environment', 'text', 'Môi trường', 'Environment', { placeholder: 'Production / Staging, browser…' }),
  field('priority', 'priority', 'Mức độ ưu tiên', 'Priority', { required: true }),
  field('attachment', 'file', 'Ảnh / file đính kèm', 'Attachment'),
];

const FEATURE_FIELDS = [
  { key: 'sec_req', type: 'section', label: { vi: 'Yêu cầu tính năng', en: 'Feature request' } },
  field('summary', 'text', 'Tên tính năng', 'Feature name', { required: true }),
  field('problem', 'textarea', 'Vấn đề cần giải quyết', 'Problem to solve', { required: true }),
  field('proposal', 'textarea', 'Đề xuất giải pháp', 'Proposed solution'),
  field('benefit', 'textarea', 'Lợi ích mong đợi', 'Expected benefit'),
  field('priority', 'priority', 'Mức độ ưu tiên', 'Priority'),
];

const HOWTO_FIELDS = [
  field('question', 'text', 'Bạn cần hỗ trợ thao tác gì?', 'What do you need help with?', { required: true }),
  field('detail', 'textarea', 'Mô tả chi tiết', 'Details', { required: true }),
  field('screen', 'text', 'Màn hình / chức năng', 'Screen / feature'),
];

const BILLABLE_FIELDS = [
  field('summary', 'text', 'Tiêu đề yêu cầu', 'Request title', { required: true }),
  field('scope', 'textarea', 'Phạm vi công việc', 'Scope of work', { required: true }),
  field('billable', 'toggle', 'Xác nhận yêu cầu tính phí', 'Confirm billable request', { required: true }),
  field('deadline', 'date', 'Deadline mong muốn', 'Desired deadline'),
];

async function main() {
  await runMigrations();

  const hash = await bcrypt.hash(PASSWORD, 10);

  await withTransaction(async (c) => {
    // Idempotency: skip if already seeded.
    const existing = await c.query('SELECT 1 FROM users LIMIT 1');
    if (existing.rowCount) {
      // eslint-disable-next-line no-console
      console.log('[seed] users already exist — skipping seed');
      return;
    }

    // ── SLA config (base × customer factor) ──
    for (const level of PRIORITY_LEVELS) {
      for (const cp of CUSTOMER_PRIORITIES) {
        const base = BASE_SLA[level];
        await c.query(
          `INSERT INTO sla_config(priority_level, customer_priority, response_hours, resolve_hours)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (priority_level, customer_priority) DO NOTHING`,
          [level, cp, base.responseHours * CUSTOMER_FACTOR[cp], base.resolveHours * CUSTOMER_FACTOR[cp]]
        );
      }
    }

    // ── Organizations ──
    const acme = (
      await c.query(
        `INSERT INTO organizations(name, code, customer_priority) VALUES ($1,$2,$3) RETURNING id`,
        ['ACME Corporation', 'ACME', 'platinum']
      )
    ).rows[0].id as string;
    const globex = (
      await c.query(
        `INSERT INTO organizations(name, code, customer_priority) VALUES ($1,$2,$3) RETURNING id`,
        ['Globex Ltd', 'GLBX', 'gold']
      )
    ).rows[0].id as string;

    // ── Projects ──
    const hrm = (
      await c.query(
        `INSERT INTO projects(org_id, name, code, project_priority, jira_url, jira_key)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [acme, 'HRM System', 'HRM', 'critical', 'https://acme.atlassian.net/jira/software/projects/HRM', 'HRM']
      )
    ).rows[0].id as string;
    const kms = (
      await c.query(
        `INSERT INTO projects(org_id, name, code, project_priority) VALUES ($1,$2,$3,$4) RETURNING id`,
        [acme, 'Knowledge Management', 'KMS', 'high']
      )
    ).rows[0].id as string;
    const frs = (
      await c.query(
        `INSERT INTO projects(org_id, name, code, project_priority) VALUES ($1,$2,$3,$4) RETURNING id`,
        [globex, 'Face Recognition', 'FRS', 'medium']
      )
    ).rows[0].id as string;

    // ── Users ──
    async function user(name: string, email: string, role: string, orgId: string | null, lang = 'vi') {
      return (
        await c.query(
          `INSERT INTO users(name, email, password_hash, role, org_id, language)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [name, email, hash, role, orgId, lang]
        )
      ).rows[0].id as string;
    }

    const superAdmin = await user('Super Admin', 'superadmin@hidesk.vn', 'super_admin', null);
    const csm = await user('Chị CSM Lan', 'csm@hidesk.vn', 'csm', null);
    const devLead = await user('Anh Dev Lead Minh', 'devlead@hidesk.vn', 'dev_lead', null);
    const dev = await user('Bạn Dev Hoa', 'dev@hidesk.vn', 'dev', null);
    const gate = await user('CS Gate Trang', 'gate@hidesk.vn', 'gate', null);
    const custAdmin = await user('ACME Admin', 'custadmin@acme.com', 'customer_admin', acme, 'en');
    const customer = await user('ACME User', 'customer@acme.com', 'customer', acme);
    await user('Globex User', 'customer@globex.com', 'customer', globex, 'en');

    // ── Access grants ──
    // CSM manages ACME org
    await c.query(`INSERT INTO user_org_access(user_id, org_id) VALUES ($1,$2)`, [csm, acme]);
    // Dev Lead + Dev assigned to HRM & KMS projects
    for (const uid of [devLead, dev, gate]) {
      for (const pid of [hrm, kms]) {
        await c.query(
          `INSERT INTO user_project_access(user_id, project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [uid, pid]
        );
      }
    }
    // Customer can create tickets in HRM & KMS
    for (const pid of [hrm, kms]) {
      await c.query(
        `INSERT INTO user_project_access(user_id, project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [customer, pid]
      );
    }

    // ── Templates ──
    async function template(
      name: string,
      nameEn: string,
      category: string,
      icon: string,
      fields: unknown,
      isDefault = false
    ) {
      return (
        await c.query(
          `INSERT INTO templates(name, name_en, category, icon, is_global, is_default, fields_schema)
           VALUES ($1,$2,$3,$4,TRUE,$5,$6::jsonb) RETURNING id`,
          [name, nameEn, category, icon, isDefault, JSON.stringify(fields)]
        )
      ).rows[0].id as string;
    }
    const tplBug = await template('Báo lỗi hệ thống', 'Bug Report', 'bug', 'bug', BUG_REPORT_FIELDS, true);
    await template('Yêu cầu tính năng mới', 'Feature Request', 'feature', 'sparkles', FEATURE_FIELDS);
    await template('Hỗ trợ thao tác', 'How-to Support', 'help', 'life-buoy', HOWTO_FIELDS);
    await template('Yêu cầu tính phí', 'Billable Request', 'billable', 'credit-card', BILLABLE_FIELDS);

    // ── Tags ──
    const tagIds: string[] = [];
    for (const [name, color] of [
      ['production', '#DC2626'],
      ['ui', '#2563EB'],
      ['data', '#7C3AED'],
      ['urgent', '#F97316'],
    ] as const) {
      tagIds.push(
        (await c.query(`INSERT INTO tags(name, color) VALUES ($1,$2) RETURNING id`, [name, color])).rows[0].id
      );
    }

    // ── Sample tickets ──
    async function ticket(
      title: string,
      description: string,
      status: string,
      level: 'P1' | 'P2' | 'P3' | 'P4' | 'P5',
      orgId: string,
      projectId: string,
      ownerId: string | null,
      customerPriority: 'platinum' | 'gold' | 'silver' | 'bronze',
      projectPriority: 'critical' | 'high' | 'medium' | 'low'
    ) {
      const sla = computeSla(level, customerPriority, projectPriority);
      const code = await nextTicketCode(c);
      const id = (
        await c.query(
          `INSERT INTO tickets(code, title, description, status, category, priority_level, template_id,
             org_id, project_id, owner_id, customer_id, escalated,
             sla_response_deadline, sla_resolve_deadline)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
          [
            code,
            title,
            description,
            status,
            'bug',
            level,
            tplBug,
            orgId,
            projectId,
            ownerId,
            customer,
            customerPriority === 'platinum' && (level === 'P1' || level === 'P2'),
            sla.responseDeadline,
            sla.resolveDeadline,
          ]
        )
      ).rows[0].id as string;
      await c.query(
        `INSERT INTO ticket_history(ticket_id, changed_by, action, old_status, new_status, note)
         VALUES ($1,$2,'create',NULL,$3,'Ticket created (seed)')`,
        [id, customer, status]
      );
      return id;
    }

    const t1 = await ticket(
      'Không đăng nhập được vào HRM',
      'Toàn bộ nhân viên không thể đăng nhập từ 9h sáng, màn hình trắng.',
      'in_progress',
      'P1',
      acme,
      hrm,
      dev,
      'platinum',
      'critical'
    );
    await ticket(
      'Báo cáo lương xuất sai số liệu',
      'Cột thực lãnh cộng thiếu phụ cấp.',
      'open',
      'P2',
      acme,
      hrm,
      null,
      'platinum',
      'critical'
    );
    await ticket(
      'Nút tìm kiếm KMS bị lệch trên mobile',
      'Trên iPhone, ô tìm kiếm tràn ra ngoài khung.',
      'waiting',
      'P4',
      acme,
      kms,
      dev,
      'platinum',
      'high'
    );
    await ticket(
      'Đề xuất thêm dark mode cho FRS',
      'Người dùng muốn có chế độ tối.',
      'resolved',
      'P5',
      globex,
      frs,
      devLead,
      'gold',
      'medium'
    );

    // tag + comment on t1
    await c.query(`INSERT INTO ticket_tags(ticket_id, tag_id) VALUES ($1,$2),($1,$3)`, [
      t1,
      tagIds[0],
      tagIds[3],
    ]);
    await c.query(
      `INSERT INTO comments(ticket_id, user_id, content, is_internal) VALUES ($1,$2,$3,FALSE)`,
      [t1, dev, 'Đang kiểm tra log server, sẽ cập nhật trong 30 phút.']
    );
    await c.query(
      `INSERT INTO comments(ticket_id, user_id, content, is_internal, mentions) VALUES ($1,$2,$3,TRUE,$4)`,
      [t1, dev, 'Nghi ngờ do deploy tối qua, cần @devlead review.', [devLead]]
    );

    // notification for dev lead
    await c.query(
      `INSERT INTO notifications(user_id, ticket_id, type, title, message)
       VALUES ($1,$2,'mention','Bạn được nhắc đến','Dev Hoa mentioned you on HD-0001')`,
      [devLead, t1]
    );

    // eslint-disable-next-line no-console
    console.log('[seed] done — users, orgs, projects, templates, tickets created');
    void superAdmin;
    void custAdmin;
    void gate;
  });
}

if (require.main === module) {
  main()
    .then(() => pool.end())
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[seed] failed', err);
      process.exit(1);
    });
}

export { main as seed };
