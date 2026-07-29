/**
 * Large demo dataset — simulates HiDesk operating for 30 customer organizations.
 * Populates every screen (dashboard, board, tickets, reports, dev evaluation).
 *
 * Run with:  npm run seed:demo   (WARNING: truncates all data first)
 */
import bcrypt from 'bcryptjs';
import { pool, withTransaction } from '../config/db';
import { runMigrations } from './migrate';
import { BASE_SLA, CUSTOMER_FACTOR, computeSla } from '../domain/priority';
import {
  CUSTOMER_PRIORITIES,
  CustomerPriority,
  PRIORITY_LEVELS,
  PriorityLevel,
  ProjectPriority,
  TicketStatus,
} from '../domain/types';

const PASSWORD = 'Password@123';

// ── tiny PRNG helpers (plain Node script — Math.random is fine here) ──
const rnd = () => Math.random();
const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const chance = (p: number) => rnd() < p;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
function weighted<T>(pairs: [T, number][]): T {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; }
  return pairs[0][0];
}

// ── reference data ──
const COMPANIES: [string, string][] = [
  ['ACME Corporation', 'ACME'], ['Globex Ltd', 'GLBX'], ['Vinaphone Solutions', 'VNPS'],
  ['FPT Software', 'FPTS'], ['Tiki Trading', 'TIKI'], ['Shopee VN', 'SHPE'],
  ['VNG Corporation', 'VNGC'], ['Momo Fintech', 'MOMO'], ['Techcombank', 'TCBK'],
  ['Viettel Telecom', 'VTTL'], ['VinGroup Retail', 'VING'], ['The Coffee House', 'TCHS'],
  ['Highlands Coffee', 'HLCF'], ['Bách Hóa Xanh', 'BHXA'], ['Điện Máy Xanh', 'DMXA'],
  ['Thế Giới Di Động', 'TGDD'], ['Grab Vietnam', 'GRAB'], ['Baemin VN', 'BAMN'],
  ['Lazada Vietnam', 'LAZA'], ['Sendo Farm', 'SNDO'], ['Zalo Group', 'ZALO'],
  ['CGV Cinemas', 'CGVC'], ['Galaxy Studio', 'GLXS'], ['VPBank Digital', 'VPBK'],
  ['ACB Online', 'ACBO'], ['Sacombank', 'STBK'], ['Bảo Việt Insurance', 'BVIN'],
  ['Prudential VN', 'PRUD'], ['Nutifood', 'NUTI'], ['Vinamilk', 'VNMK'],
];

const PROJECT_TYPES: [string, string][] = [
  ['HRM System', 'HRM'], ['Knowledge Management', 'KMS'], ['Face Recognition', 'FRS'],
  ['CRM Platform', 'CRM'], ['Warehouse Mgmt', 'WMS'], ['Point of Sale', 'POS'],
  ['Learning Portal', 'LMS'], ['ERP Suite', 'ERP'], ['E-commerce Web', 'ECW'],
  ['Mobile App', 'APP'], ['Payment Gateway', 'PAY'], ['Analytics Dashboard', 'BID'],
];

const VN_NAMES = [
  'Nguyễn Văn An', 'Trần Thị Bình', 'Lê Hoàng Cường', 'Phạm Thu Dung', 'Hoàng Minh Đức',
  'Vũ Thị Giang', 'Đặng Văn Hải', 'Bùi Thu Hương', 'Đỗ Minh Khôi', 'Ngô Thị Lan',
  'Dương Văn Mạnh', 'Lý Thị Nga', 'Phan Hoàng Nam', 'Võ Thu Phương', 'Trịnh Văn Quân',
  'Đinh Thị Rồng', 'Tạ Minh Sơn', 'Lương Thu Trang', 'Mai Văn Tú', 'Chu Thị Uyên',
  'Hồ Hoàng Việt', 'Cao Thị Xuân', 'Lâm Văn Yên', 'Tô Minh Bảo', 'Hà Thu Cẩm',
];

const BUG_TITLES = [
  'Không đăng nhập được vào hệ thống', 'Báo cáo xuất sai số liệu', 'Trang bị treo khi tải dữ liệu lớn',
  'Lỗi 500 khi lưu biểu mẫu', 'Không gửi được email thông báo', 'Sai kết quả tính lương tháng',
  'Mất dữ liệu sau khi cập nhật', 'Nút Lưu không hoạt động trên mobile', 'Ảnh đại diện không hiển thị',
  'Tìm kiếm trả về kết quả rỗng', 'Session bị đăng xuất liên tục', 'Xuất Excel bị lỗi định dạng',
  'Thông báo đẩy bị trùng lặp', 'Phân trang nhảy sai trang', 'Upload file lớn bị timeout',
];
const FEATURE_TITLES = [
  'Yêu cầu thêm dark mode', 'Bổ sung đăng nhập bằng SSO', 'Thêm xuất báo cáo PDF',
  'Tích hợp thanh toán VNPay', 'Thêm bộ lọc nâng cao', 'Hỗ trợ đa ngôn ngữ',
  'Thêm dashboard tùy chỉnh', 'Tự động nhắc lịch qua Zalo',
];
const HOWTO_TITLES = [
  'Hướng dẫn phân quyền người dùng', 'Cách cấu hình quy trình duyệt', 'Hỗ trợ import dữ liệu hàng loạt',
  'Cách khôi phục mật khẩu', 'Hướng dẫn tạo báo cáo tùy chỉnh',
];
const COMMENTS_PUBLIC = [
  'Bên mình đang kiểm tra, sẽ phản hồi sớm.', 'Đã ghi nhận, ưu tiên xử lý trong hôm nay.',
  'Anh/chị vui lòng gửi thêm ảnh chụp màn hình lỗi.', 'Đã tái hiện được lỗi trên môi trường staging.',
  'Cập nhật: đã fix, đang chờ deploy.', 'Nhờ anh/chị kiểm tra lại giúp sau khi cập nhật.',
];
const COMMENTS_INTERNAL = [
  'Nghi do deploy tối qua, cần rollback thử.', 'Gán cho team backend xử lý.',
  'Cần review kỹ trước khi lên prod.', 'Đã note vào release checklist.',
];

const STATUS_WEIGHTS: [TicketStatus, number][] = [
  ['open', 14], ['in_progress', 20], ['build', 8], ['testing', 8], ['deploy', 4],
  ['recheck', 4], ['waiting', 6], ['on_hold', 3], ['resolved', 12], ['complete', 6],
  ['close', 12], ['reopen', 3],
];
const PRIORITY_WEIGHTS: [PriorityLevel, number][] = [
  ['P1', 7], ['P2', 15], ['P3', 30], ['P4', 28], ['P5', 20],
];
const DONE: TicketStatus[] = ['resolved', 'complete', 'close'];
const TAGS: [string, string][] = [
  ['production', '#DC2626'], ['ui', '#2563EB'], ['data', '#7C3AED'], ['urgent', '#F97316'],
  ['mobile', '#059669'], ['performance', '#DB2777'], ['security', '#B91C1C'], ['ux', '#0891B2'],
];

async function main(opts: { skipIfSeeded?: boolean } = {}) {
  await runMigrations();
  const hash = await bcrypt.hash(PASSWORD, 10);

  await withTransaction(async (c) => {
    // Idempotency guard for auto-seeding (e.g. docker compose): only build the
    // dataset once — restarts must NOT wipe an already-populated database.
    if (opts.skipIfSeeded) {
      const { rows } = await c.query<{ n: string }>('SELECT count(*)::int AS n FROM organizations');
      if (Number(rows[0].n) >= 25) {
        // eslint-disable-next-line no-console
        console.log(`[demo] already seeded (${rows[0].n} orgs) — skipping`);
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.log('[demo] truncating existing data…');
    await c.query(`TRUNCATE ticket_reviews, ticket_assignees, ticket_tags, tags, notifications,
      attachments, comments, ticket_history, ticket_fields, tickets, templates,
      user_project_access, user_org_access, sla_config, projects, users, organizations
      RESTART IDENTITY CASCADE`);
    await c.query(`ALTER SEQUENCE ticket_code_seq RESTART WITH 1`);

    // ── SLA config ──
    for (const level of PRIORITY_LEVELS) for (const cp of CUSTOMER_PRIORITIES) {
      const base = BASE_SLA[level];
      await c.query(
        `INSERT INTO sla_config(priority_level, customer_priority, response_hours, resolve_hours) VALUES ($1,$2,$3,$4)`,
        [level, cp, base.responseHours * CUSTOMER_FACTOR[cp], base.resolveHours * CUSTOMER_FACTOR[cp]]
      );
    }

    // ── Tags ──
    const tagIds: string[] = [];
    for (const [name, color] of TAGS) {
      tagIds.push((await c.query(`INSERT INTO tags(name,color) VALUES ($1,$2) RETURNING id`, [name, color])).rows[0].id);
    }

    // ── Templates (global) ──
    const bugFields = [
      { key: 'summary', type: 'text', label: { vi: 'Tiêu đề lỗi', en: 'Bug title' }, required: true },
      { key: 'steps', type: 'textarea', label: { vi: 'Các bước tái hiện', en: 'Steps' }, required: true },
      { key: 'expected', type: 'textarea', label: { vi: 'Kết quả mong đợi', en: 'Expected' } },
      { key: 'actual', type: 'textarea', label: { vi: 'Kết quả thực tế', en: 'Actual' } },
      { key: 'priority', type: 'priority', label: { vi: 'Ưu tiên', en: 'Priority' }, required: true },
    ];
    const tplBug = (await c.query(
      `INSERT INTO templates(name,name_en,category,icon,is_global,is_default,fields_schema)
       VALUES ('Báo lỗi hệ thống','Bug Report','bug','bug',TRUE,TRUE,$1::jsonb) RETURNING id`,
      [JSON.stringify(bugFields)]
    )).rows[0].id;
    for (const [nm, en, cat] of [['Yêu cầu tính năng mới', 'Feature Request', 'feature'], ['Hỗ trợ thao tác', 'How-to Support', 'help'], ['Yêu cầu tính phí', 'Billable Request', 'billable']] as const) {
      await c.query(`INSERT INTO templates(name,name_en,category,icon,is_global,fields_schema) VALUES ($1,$2,$3,'sparkles',TRUE,'[]'::jsonb)`, [nm, en, cat]);
    }

    // ── Known login accounts (documented in README) ──
    async function mkUser(name: string, email: string, role: string, orgId: string | null, lang = 'vi') {
      return (await c.query(
        `INSERT INTO users(name,email,password_hash,role,org_id,language) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [name, email, hash, role, orgId, lang]
      )).rows[0].id as string;
    }
    const superAdmin = await mkUser('Super Admin', 'superadmin@hidesk.vn', 'super_admin', null);
    const knownCsm = await mkUser('Chị CSM Lan', 'csm@hidesk.vn', 'csm', null);
    const knownLead = await mkUser('Anh Dev Lead Minh', 'devlead@hidesk.vn', 'dev_lead', null);
    const knownDev = await mkUser('Bạn Dev Hoa', 'dev@hidesk.vn', 'dev', null);
    const knownGate = await mkUser('CS Gate Trang', 'gate@hidesk.vn', 'gate', null);

    // ── Staff pool ──
    const csms = [knownCsm]; const leads = [knownLead]; const devs = [knownDev]; const gates = [knownGate];
    let nameIdx = 0;
    const nextName = () => VN_NAMES[nameIdx++ % VN_NAMES.length];
    for (let i = 0; i < 3; i++) csms.push(await mkUser(`${nextName()} (CSM)`, `csm${i + 2}@hidesk.vn`, 'csm', null));
    for (let i = 0; i < 5; i++) leads.push(await mkUser(`${nextName()}`, `lead${i + 2}@hidesk.vn`, 'dev_lead', null));
    for (let i = 0; i < 14; i++) devs.push(await mkUser(`${nextName()}`, `dev${i + 2}@hidesk.vn`, 'dev', null));
    for (let i = 0; i < 4; i++) gates.push(await mkUser(`${nextName()}`, `gate${i + 2}@hidesk.vn`, 'gate', null));
    const allMods = [...csms, ...leads, ...gates]; // can review devs

    // ── Organizations, projects, customers, tickets ──
    let ticketCounter = 0;
    let projectCounter = 0;
    const projectSeqCode: Record<string, number> = {};

    for (let oi = 0; oi < COMPANIES.length; oi++) {
      const [coName, coCode] = COMPANIES[oi];
      const custPriority: CustomerPriority = weighted([
        ['platinum', 2], ['gold', 3], ['silver', 4], ['bronze', 2],
      ]);
      const orgId = (await c.query(
        `INSERT INTO organizations(name,code,customer_priority) VALUES ($1,$2,$3) RETURNING id`,
        [coName, coCode, custPriority]
      )).rows[0].id as string;

      // CSM(s) manage this org — spread known CSM across first orgs so /csm login is busy
      const orgCsm = oi < 6 ? knownCsm : pick(csms);
      await c.query(`INSERT INTO user_org_access(user_id,org_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [orgCsm, orgId]);

      // customer_admin + customers
      const custAdminEmail = oi === 0 ? 'custadmin@acme.com' : `admin@${coCode.toLowerCase()}.com`;
      await mkUser(`${coName} Admin`, custAdminEmail, 'customer_admin', orgId, chance(0.3) ? 'en' : 'vi');
      const customers: string[] = [];
      const nCust = randInt(2, 4);
      for (let ci = 0; ci < nCust; ci++) {
        const email = oi === 0 && ci === 0 ? 'customer@acme.com' : `user${ci + 1}@${coCode.toLowerCase()}.com`;
        customers.push(await mkUser(`${coName} User ${ci + 1}`, email, 'customer', orgId));
      }

      // projects for this org
      const nProj = randInt(1, 3);
      const usedTypes = new Set<number>();
      for (let pj = 0; pj < nProj; pj++) {
        let ti = randInt(0, PROJECT_TYPES.length - 1);
        while (usedTypes.has(ti)) ti = randInt(0, PROJECT_TYPES.length - 1);
        usedTypes.add(ti);
        const [pName, pCode] = PROJECT_TYPES[ti];
        const projPriority: ProjectPriority = weighted([['critical', 2], ['high', 3], ['medium', 4], ['low', 2]]);
        const projectId = (await c.query(
          `INSERT INTO projects(org_id,name,code,project_priority,jira_url,jira_key)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [orgId, pName, pCode, projPriority, chance(0.4) ? `https://${coCode.toLowerCase()}.atlassian.net/jira/software/projects/${pCode}` : null, chance(0.4) ? pCode : null]
        )).rows[0].id as string;
        projectCounter++;
        projectSeqCode[projectId] = 0;

        // assign staff to project (some known accounts on early orgs so their views are busy)
        const projDevs = [pick(devs), pick(devs), ...(oi < 8 ? [knownDev] : [])];
        const projLead = oi < 8 ? knownLead : pick(leads);
        const projGate = oi < 8 ? knownGate : pick(gates);
        for (const uid of [...new Set([...projDevs, projLead, projGate])]) {
          await c.query(`INSERT INTO user_project_access(user_id,project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [uid, projectId]);
        }
        for (const uid of customers) {
          await c.query(`INSERT INTO user_project_access(user_id,project_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [uid, projectId]);
        }

        // tickets
        const nTickets = randInt(6, 16);
        for (let tk = 0; tk < nTickets; tk++) {
          const level = weighted(PRIORITY_WEIGHTS);
          const ageHours = randInt(1, 45 * 24);
          const ageDays = ageHours / 24;
          const createdAt = hoursAgo(ageHours);
          // Status correlates with age — like a real backlog: old tickets are
          // mostly closed, recent ones are open/in-progress.
          const status: TicketStatus =
            ageDays > 12
              ? weighted<TicketStatus>([['close', 42], ['resolved', 22], ['complete', 14], ['on_hold', 4], ['reopen', 4], ['in_progress', 8], ['waiting', 3], ['deploy', 3]])
              : ageDays > 4
              ? weighted<TicketStatus>([['in_progress', 20], ['testing', 12], ['build', 10], ['deploy', 8], ['recheck', 6], ['resolved', 14], ['complete', 6], ['close', 8], ['waiting', 6], ['on_hold', 4]])
              : weighted<TicketStatus>([['open', 34], ['in_progress', 32], ['waiting', 9], ['build', 8], ['testing', 8], ['reopen', 2], ['on_hold', 3], ['resolved', 4]]);
          const sla = computeSla(level, custPriority, projPriority, createdAt);
          const escalate = custPriority === 'platinum' && (level === 'P1' || level === 'P2');
          const cat = weighted<[string, string[]]>([[['bug', BUG_TITLES], 6], [['feature', FEATURE_TITLES], 2], [['help', HOWTO_TITLES], 2]] as any);
          const title = pick(cat[1]);
          const owner = status === 'open' ? (chance(0.4) ? pick(projDevs) : null) : pick(projDevs);
          const customerId = pick(customers);
          const isDone = DONE.includes(status);
          // Resolved within SLA ~82% of the time (keeps compliance realistic).
          let resolvedAt: Date | null = null;
          if (isDone) {
            const onTime = chance(0.82);
            const factor = onTime ? randInt(30, 92) / 100 : randInt(105, 180) / 100;
            let ms = createdAt.getTime() + sla.resolveHours * factor * 3_600_000;
            ms = Math.min(ms, Date.now() - randInt(1, 12) * 3_600_000); // must be in the past
            resolvedAt = new Date(Math.max(ms, createdAt.getTime() + 3_600_000));
          }
          let firstResp = status !== 'open' ? new Date(createdAt.getTime() + randInt(1, 8) * 3_600_000) : null;
          if (firstResp && resolvedAt && firstResp > resolvedAt) firstResp = new Date(createdAt.getTime() + 1_800_000);
          const reopenCount = status === 'reopen' ? 1 : chance(0.06) ? 1 : 0;
          projectSeqCode[projectId]++;
          ticketCounter++;
          const code = `HD-${String(ticketCounter).padStart(5, '0')}`;

          const ticketId = (await c.query(
            `INSERT INTO tickets(code,title,description,status,category,priority_level,template_id,
               org_id,project_id,owner_id,customer_id,escalated,reopen_count,
               sla_response_deadline,sla_resolve_deadline,first_response_at,resolved_at,created_at,updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18) RETURNING id`,
            [code, title, `${title}. Chi tiết: khách hàng ${coName} phản ánh trên ${pName}.`, status, cat[0], level, tplBug,
              orgId, projectId, owner, customerId, escalate, reopenCount,
              sla.responseDeadline, sla.resolveDeadline, firstResp, resolvedAt, createdAt]
          )).rows[0].id as string;

          // template field values (bug)
          if (cat[0] === 'bug') {
            for (const [k, v] of [['summary', title], ['steps', '1. Mở màn hình\n2. Thao tác\n3. Xuất hiện lỗi'], ['expected', 'Hoạt động bình thường'], ['actual', 'Xuất hiện lỗi']]) {
              await c.query(`INSERT INTO ticket_fields(ticket_id,field_key,field_value) VALUES ($1,$2,$3)`, [ticketId, k, v]);
            }
          }
          // history
          await c.query(`INSERT INTO ticket_history(ticket_id,changed_by,action,old_status,new_status,note,changed_at) VALUES ($1,$2,'create',NULL,'open',$3,$4)`,
            [ticketId, customerId, escalate ? 'Escalated (Platinum)' : 'Ticket created', createdAt]);
          if (status !== 'open') {
            await c.query(`INSERT INTO ticket_history(ticket_id,changed_by,action,old_status,new_status,changed_at) VALUES ($1,$2,'status','open',$3,$4)`,
              [ticketId, owner || pick(projDevs), status, firstResp || createdAt]);
          }
          // assignees (multiple devs)
          const assignees = [...new Set([owner, ...(chance(0.5) ? [pick(projDevs)] : []), ...(chance(0.25) ? [pick(projDevs)] : [])])].filter(Boolean) as string[];
          for (const a of assignees) await c.query(`INSERT INTO ticket_assignees(ticket_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [ticketId, a]);
          // tags
          if (chance(0.6)) {
            const t1 = pick(tagIds);
            await c.query(`INSERT INTO ticket_tags(ticket_id,tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [ticketId, t1]);
          }
          // comments
          const nC = randInt(0, 3);
          for (let cm = 0; cm < nC; cm++) {
            const internal = chance(0.3);
            await c.query(`INSERT INTO comments(ticket_id,user_id,content,is_internal,created_at) VALUES ($1,$2,$3,$4,$5)`,
              [ticketId, internal ? (owner || pick(projDevs)) : pick([customerId, owner || pick(projDevs)]), internal ? pick(COMMENTS_INTERNAL) : pick(COMMENTS_PUBLIC), internal, new Date(createdAt.getTime() + (cm + 1) * 3_600_000)]);
          }
          // moderator review of the owner dev (done tickets)
          if (isDone && owner && chance(0.55)) {
            const reviewer = pick(allMods);
            await c.query(
              `INSERT INTO ticket_reviews(ticket_id,reviewer_id,dev_id,rating,quality,timeliness,comment,created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
              [ticketId, reviewer, owner, randInt(3, 5), randInt(3, 5), randInt(2, 5), chance(0.5) ? pick(['Xử lý tốt, đúng hạn.', 'Cần cải thiện tốc độ.', 'Chất lượng ổn.', 'Rất chủ động.']) : null,
                new Date((resolvedAt || createdAt).getTime() + 3_600_000)]
            );
          }
        }
      }
      if ((oi + 1) % 10 === 0) console.log(`[demo] ${oi + 1}/30 orgs, ${ticketCounter} tickets so far…`);
    }

    // keep the human-readable code sequence ahead of generated codes
    await c.query(`SELECT setval('ticket_code_seq', $1)`, [ticketCounter]);

    // notifications for known staff so the bell shows counts
    for (const uid of [knownDev, knownLead, knownGate]) {
      const t = await c.query(`SELECT id, code FROM tickets WHERE owner_id = $1 LIMIT 3`, [uid]);
      for (const row of t.rows) {
        await c.query(`INSERT INTO notifications(user_id,ticket_id,type,title,message) VALUES ($1,$2,'assigned','Bạn được giao ticket',$3)`,
          [uid, row.id, `${row.code} cần xử lý`]);
      }
    }

    // eslint-disable-next-line no-console
    console.log(`[demo] DONE — ${COMPANIES.length} orgs, ${projectCounter} projects, ${ticketCounter} tickets.`);
    void superAdmin;
  });
}

if (require.main === module) {
  main().then(() => pool.end()).then(() => process.exit(0)).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[demo] failed', err); process.exit(1);
  });
}

export { main as demoSeed };
