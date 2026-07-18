-- Sequence for human-readable ticket codes (HD-0001, HD-0002, …)
CREATE SEQUENCE IF NOT EXISTS ticket_code_seq START 1;

-- Keep the sequence ahead of any codes inserted by the seed script.
SELECT setval(
  'ticket_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), ''))::bigint, 0) FROM tickets),
    1
  )
);
