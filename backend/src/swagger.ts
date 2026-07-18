/** Hand-written OpenAPI 3 spec served at /api/docs. */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HiDesk — Ticket & Support System API',
    version: '1.0.0',
    description:
      'REST API cho hệ thống Ticket Helpdesk HiDesk. Xác thực bằng Bearer JWT (POST /api/auth/login).',
  },
  servers: [{ url: '/', description: 'current host' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Đăng nhập',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
              example: { email: 'superadmin@hidesk.vn', password: 'Password@123' },
            },
          },
        },
        responses: { 200: { description: 'JWT + user' }, 401: { description: 'Sai thông tin' } },
      },
    },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'User hiện tại', responses: { 200: { description: 'ok' } } } },
    '/api/tickets': {
      get: {
        tags: ['Tickets'],
        summary: 'Danh sách ticket (scoped, filter, search, pagination)',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'priority', in: 'query', schema: { type: 'string' } },
          { name: 'projectId', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'ok' } },
      },
      post: { tags: ['Tickets'], summary: 'Tạo ticket', responses: { 201: { description: 'created' } } },
    },
    '/api/tickets/{id}': {
      get: { tags: ['Tickets'], summary: 'Chi tiết ticket', responses: { 200: { description: 'ok' } } },
      patch: { tags: ['Tickets'], summary: 'Cập nhật ticket', responses: { 200: { description: 'ok' } } },
    },
    '/api/tickets/{id}/status': {
      post: {
        tags: ['Tickets'],
        summary: 'Đổi trạng thái (state-machine + mandatory notes)',
        responses: { 200: { description: 'ok' }, 400: { description: 'Transition/meta không hợp lệ' } },
      },
    },
    '/api/tickets/{id}/jira-guide': {
      get: { tags: ['Jira'], summary: 'Sinh Auto Guide tạo Jira issue', responses: { 200: { description: 'ok' } } },
    },
    '/api/dashboard': {
      get: { tags: ['Dashboard'], summary: 'Manager Dashboard (widgets + charts)', responses: { 200: { description: 'ok' } } },
    },
    '/api/templates': {
      get: { tags: ['Templates'], summary: 'Danh sách template', responses: { 200: { description: 'ok' } } },
      post: { tags: ['Templates'], summary: 'Tạo template (form builder)', responses: { 201: { description: 'created' } } },
    },
    '/api/reports/tickets.xlsx': {
      get: { tags: ['Reports'], summary: 'Xuất Excel danh sách ticket', responses: { 200: { description: 'xlsx' } } },
    },
    '/api/orgs': { get: { tags: ['Orgs'], summary: 'Danh sách org', responses: { 200: { description: 'ok' } } } },
    '/api/projects': { get: { tags: ['Projects'], summary: 'Danh sách project', responses: { 200: { description: 'ok' } } } },
    '/api/notifications': { get: { tags: ['Notifications'], summary: 'Thông báo', responses: { 200: { description: 'ok' } } } },
    '/api/admin/sla': { get: { tags: ['Admin'], summary: 'Cấu hình SLA', responses: { 200: { description: 'ok' } } } },
  },
};
