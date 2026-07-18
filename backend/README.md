# HiDesk — Backend API

Node.js / Express + TypeScript · PostgreSQL · Redis · Socket.IO.

## Chạy

```bash
cp .env.example .env
npm install
npm run migrate && npm run seed
npm run dev          # http://localhost:4000  ·  Swagger: /api/docs
npm test             # unit test cho SLA / status FSM / Jira
```

## Kiến trúc thư mục

```
src/
├── config/        env, pg pool, redis
├── domain/        priority.ts (SLA engine) · status.ts (FSM) · jira.ts (auto guide) · types.ts
├── middleware/    auth (JWT) · rbac · validate (zod) · rateLimit · error
├── db/            migrations/*.sql · migrate.ts · seed.ts
├── realtime/      socket.io (dashboard + notifications)
└── modules/       auth · users · orgs · projects · tickets · comments ·
                   templates · tags · dashboard · notifications · admin(sla) · reports · attachments
```

## Priority & SLA Engine (`domain/priority.ts`)

```
SLA thực tế = Base SLA(P1..P5) × Customer factor × Project factor
```

| | Factor |
|---|---|
| Customer | Platinum 0.5 · Gold 0.75 · Silver 1 · Bronze 1.5 |
| Project  | Critical 0.75 · High 0.9 · Medium 1 · Low 1.25 |
| Base P1  | response 2h / resolve 4h … P5 48h / 120h |

- Platinum + P1/P2 → `escalated = true` (đẩy Dev Lead ngay).
- `Waiting` / `On Hold` **tạm dừng đồng hồ SLA** (`sla_paused_at`); khi resume, deadline được đẩy đúng khoảng thời gian tạm dừng.

## Status State Machine (`domain/status.ts`)

- Transition hợp lệ được kiểm bằng bảng `TRANSITIONS`.
- Metadata bắt buộc khi đổi status:
  - `waiting` → chờ ai / chờ gì / deadline follow
  - `on_hold` → lý do / ngày review
  - `reopen` → lý do / root cause
  - `deploy` → môi trường / thời gian / người thực hiện

## Phân quyền (RBAC)

Middleware `authenticate` gắn `req.user` (role + projectIds + managedOrgIds).
`modules/tickets/access.ts` sinh **SQL visibility predicate** cho mỗi role:

| Role | Thấy ticket |
|------|-------------|
| Super Admin | tất cả |
| CSM | trong org được quản lý |
| Dev Lead / Dev / Gate | trong project được assign hoặc được assign owner |
| Customer Admin | trong org của họ |
| Customer | chỉ ticket của chính họ |

## Realtime

Socket.IO xác thực bằng JWT. Events: `notification` (per-user room), `ticket:changed`
(room `dashboard`). Dashboard tự refresh khi có thay đổi.

## Bảo mật

- Helmet + CORS whitelist
- Rate limiting (`/api` 1000/15m, `/api/auth` 30/15m)
- Zod validation cho mọi payload
- `sanitize-html` chống XSS (plain text cho title/label, rich-text an toàn cho comment/description)
- Upload: whitelist mime-type, giới hạn 20MB
