# HiDesk — Ticket & Support System

Hệ thống Ticket Helpdesk chuyên nghiệp cho đội **Service Operations (BHBT)**.

> **Stack:** React + TypeScript (frontend) · Node.js / Express + TypeScript (backend) · PostgreSQL (database) · Redis (cache / realtime) · Docker Compose.

---

## 1. Tổng quan kiến trúc

```
Organization (Công ty khách hàng)
  └── Project (HRM, KMS, FRS, ...)
        └── Ticket
```

Repo là một **monorepo** gồm 2 phần độc lập:

| Thư mục     | Nội dung                                                                 |
|-------------|--------------------------------------------------------------------------|
| `backend/`  | REST API (Express + TS), PostgreSQL schema/migration/seed, SLA engine, RBAC, Jira, Swagger, WebSocket. |
| `frontend/` | SPA (React + Vite + TS), react-i18next (vi/en), dark mode, dashboard charts, template builder. |
| `locales/`  | File dịch dùng chung tham chiếu (`vi.json`, `en.json`).                    |

---

## 2. Chạy nhanh bằng Docker Compose

```bash
cp .env.example .env          # chỉnh sửa nếu cần
docker compose up --build
```

| Dịch vụ   | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:5173            |
| Backend   | http://localhost:4000/api        |
| Swagger   | http://localhost:4000/api/docs   |
| Postgres  | localhost:5432                   |
| Redis     | localhost:6379                   |

Migration + seed tự chạy khi backend khởi động (`RUN_MIGRATIONS=true`, `RUN_SEED=true`).

### Dữ liệu demo lớn (30 doanh nghiệp)

Để nạp bộ dữ liệu mô phỏng hệ thống **đang vận hành cho 30 doanh nghiệp**
(30 org · ~55 dự án · ~600 ticket đủ trạng thái/ưu tiên/SLA · comment · nhiều
người xử lý · review chấm điểm dev · thông báo):

```bash
cd backend && npm run seed:demo     # ⚠️ TRUNCATE toàn bộ dữ liệu rồi sinh lại
```

Sau khi chạy, mọi màn hình (Dashboard, Kanban, Danh sách ticket, Báo cáo,
Đánh giá nhân viên) đều có số liệu như thật. Tài khoản đăng nhập bên dưới vẫn giữ nguyên.

### Tài khoản seed (mật khẩu chung: `Password@123`)

| Email                    | Role           |
|--------------------------|----------------|
| `superadmin@hidesk.vn`   | Super Admin    |
| `csm@hidesk.vn`          | CSM            |
| `devlead@hidesk.vn`      | Dev Lead       |
| `dev@hidesk.vn`          | Dev/Tester     |
| `gate@hidesk.vn`         | CS/BA Gate     |
| `custadmin@acme.com`     | Customer Admin |
| `customer@acme.com`      | Customer       |

---

## 3. Chạy local (không Docker)

Yêu cầu: Node ≥ 20, PostgreSQL ≥ 14, Redis ≥ 6.

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run migrate        # tạo bảng
npm run seed           # dữ liệu mẫu
npm run dev            # http://localhost:4000

# Frontend
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

---

## 4. Bản đồ tính năng (theo THỨ TỰ XÂY DỰNG)

| Phase | Hạng mục | Trạng thái |
|-------|----------|-----------|
| 1 | Auth (JWT) + phân quyền 7 role + i18n | ✅ |
| 1 | Quản lý Org/Project + scope theo project | ✅ |
| 1 | CRUD ticket + status state-machine + audit log | ✅ |
| 2 | Template Builder (drag & drop) | ✅ |
| 2 | Priority Engine 3 cấp + SLA Engine | ✅ |
| 2 | Comment public/internal + @mention | ✅ |
| 3 | Jira Auto Guide + Direct Integration | ✅ Auto Guide / ⚙️ Direct scaffold |
| 3 | Manager Dashboard (charts + realtime WS) | ✅ |
| 3 | Email + in-app notification | ✅ in-app / ✉️ email adapter |
| 4 | Báo cáo + Export Excel | ✅ Excel export |
| 4 | Admin Panel (SLA/template/user) | ✅ |
| 4 | Responsive + dark mode | ✅ |

Chi tiết thiết kế engine SLA và state-machine nằm trong [`backend/README.md`](backend/README.md).

---

## 5. Cấu trúc thư mục

```
support-system/
├── docker-compose.yml
├── backend/          # API + DB + engines
├── frontend/         # React SPA
└── locales/          # bản dịch tham chiếu vi/en
```

Xem README con trong từng thư mục để biết chi tiết.
