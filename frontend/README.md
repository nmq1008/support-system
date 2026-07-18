# HiDesk — Frontend

React 18 + TypeScript + Vite · react-i18next (vi/en) · dark mode · dependency-free SVG charts.

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173 (proxy /api → :4000)
npm run build      # bundle production
```

## Cấu trúc

```
src/
├── i18n/          cấu hình + locales/vi.json + en.json
├── styles/        tokens.css (brand #2563EB + dark mode) · globals.css (layout skeleton)
├── lib/           api (axios) · socket · types · format · statusFlow
├── context/       AuthContext · ThemeContext · ToastContext
├── components/    Layout (header+sidebar) · Badges · Charts · Modal · StatusChangeModal · JiraGuideModal · NotificationBell · Icon
└── pages/         Login · Dashboard · TicketList · TicketDetail · CreateTicket · TemplateBuilder · Reports · Admin
```

## Điểm nhấn UI

- **Layout** theo HiStaff design conventions: header 66px (logo · search pill · actions), sidebar icon-in-box active, content scroll riêng, page header chỉ Title + Actions.
- **Branding HiDesk**: primary `#2563EB`, font Be Vietnam Pro (VI) / Inter (EN).
- **i18n**: toggle VI/EN ở header, lưu vào profile; status/priority/label song ngữ.
- **Dark mode**: toggle ở header, lưu localStorage, tôn trọng `data-theme`.
- **Realtime**: socket.io nhận notification + tự refresh dashboard.
- **Template-driven form**: CreateTicket load đúng schema template và render động.
- **Status FSM UX**: modal chỉ hiện transition hợp lệ + ép nhập metadata bắt buộc (Waiting/On Hold/Reopen/Deploy).
- **Charts** tự vẽ bằng SVG (Donut/Bar/Gauge/Line) — không phụ thuộc thư viện nặng.
