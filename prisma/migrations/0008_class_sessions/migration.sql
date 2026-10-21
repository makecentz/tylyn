-- Classes are booked into dates and times the owner sets, instead of customers suggesting dates.
UPDATE "Product"
SET "customFields" = jsonb_build_array('{"key": "class_session", "label": "Class date and time", "type": "session", "required": true, "sessions": []}'::jsonb)
  || COALESCE((
    SELECT jsonb_agg(f ORDER BY ord)
    FROM jsonb_array_elements("customFields") WITH ORDINALITY AS t(f, ord)
    WHERE f->>'key' NOT IN ('preferred_date', 'backup_date', 'preferred_time')
  ), '[]'::jsonb)
WHERE "kind" = 'SERVICE'
  AND jsonb_typeof("customFields") = 'array'
  AND NOT "customFields" @> '[{"type": "session"}]'::jsonb;
