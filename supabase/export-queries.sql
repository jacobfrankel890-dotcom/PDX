-- ============================================================
-- PDX Expense Report — Export & Admin Queries
-- Run these in Supabase SQL Editor as needed
-- ============================================================

-- ------------------------------------------------------------
-- 1. WEEKLY EXPORT: All submitted reports for a given week
-- Replace the dates with your target week
-- ------------------------------------------------------------

SELECT
  p.first_name || ' ' || p.last_name AS employee_name,
  p.email,
  p.phone,
  p.role,
  p.region,
  p.company,
  er.pay_period_start,
  er.pay_period_end,
  er.status,
  er.grand_total,
  er.submitted_at,
  eli.expense_date,
  eli.description,
  eli.related_to,
  eli.travel_lodging,
  eli.tolls_parking,
  eli.miles,
  eli.mileage_calc,
  eli.office_supplies,
  eli.meals_entertainment,
  eli.vehicle_maintenance,
  eli.marketing,
  eli.misc,
  eli.row_total
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
LEFT JOIN public.expense_line_items eli ON eli.report_id = er.id
WHERE er.status IN ('submitted', 'approved')
  AND er.pay_period_start >= '2026-06-02'   -- week start (Monday)
  AND er.pay_period_end   <= '2026-06-08'   -- week end (Sunday)
ORDER BY p.last_name, p.first_name, er.pay_period_start, eli.sort_order;


-- ------------------------------------------------------------
-- 2. MONTHLY EXPORT: All reports for a calendar month
-- ------------------------------------------------------------

SELECT
  p.first_name || ' ' || p.last_name AS employee_name,
  p.region,
  p.role,
  er.pay_period_start,
  er.pay_period_end,
  er.status,
  er.total_travel_lodging,
  er.total_tolls_parking,
  er.total_miles,
  er.total_mileage_calc,
  er.total_office_supplies,
  er.total_meals_entertainment,
  er.total_vehicle_maintenance,
  er.total_marketing,
  er.total_misc,
  er.grand_total,
  er.submitted_at
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
WHERE er.status IN ('submitted', 'approved')
  AND er.pay_period_start >= '2026-06-01'
  AND er.pay_period_end   <= '2026-06-30'
ORDER BY p.region, p.last_name, er.pay_period_start;


-- ------------------------------------------------------------
-- 3. REGION SUMMARY: Totals grouped by region for a period
-- ------------------------------------------------------------

SELECT
  p.region,
  COUNT(DISTINCT er.id) AS report_count,
  COUNT(DISTINCT p.id)  AS employee_count,
  SUM(er.grand_total)   AS total_expenses,
  SUM(er.total_miles)   AS total_miles,
  SUM(er.total_mileage_calc) AS total_mileage_dollars
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
WHERE er.status IN ('submitted', 'approved')
  AND er.pay_period_start >= '2026-06-01'
  AND er.pay_period_end   <= '2026-06-30'
GROUP BY p.region
ORDER BY p.region;


-- ------------------------------------------------------------
-- 4. PENDING APPROVAL: Reports awaiting review
-- ------------------------------------------------------------

SELECT
  er.id AS report_id,
  p.first_name || ' ' || p.last_name AS employee_name,
  p.region,
  p.role,
  er.pay_period_start,
  er.pay_period_end,
  er.grand_total,
  er.submitted_at,
  (SELECT COUNT(*) FROM public.expense_line_items eli WHERE eli.report_id = er.id) AS line_item_count
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
WHERE er.status = 'submitted'
ORDER BY er.submitted_at ASC;


-- ------------------------------------------------------------
-- 5. APPROVE A REPORT (admin action)
-- Replace UUID and approver name
-- ------------------------------------------------------------

-- UPDATE public.expense_reports
-- SET
--   status = 'approved',
--   approved_at = NOW(),
--   approved_by = 'Finance Admin Name'
-- WHERE id = 'report-uuid-here';


-- ------------------------------------------------------------
-- 6. LIST ALL USERS BY REGION
-- ------------------------------------------------------------

SELECT
  first_name,
  last_name,
  email,
  phone,
  role,
  region,
  phone_verified,
  created_at
FROM public.profiles
ORDER BY region, role, last_name;


-- ------------------------------------------------------------
-- 7. CATEGORY BREAKDOWN for finance (monthly)
-- ------------------------------------------------------------

SELECT
  p.region,
  SUM(er.total_travel_lodging)      AS travel_lodging,
  SUM(er.total_tolls_parking)       AS tolls_parking,
  SUM(er.total_mileage_calc)        AS mileage,
  SUM(er.total_office_supplies)     AS office_supplies,
  SUM(er.total_meals_entertainment) AS meals_entertainment,
  SUM(er.total_vehicle_maintenance) AS vehicle_maintenance,
  SUM(er.total_marketing)           AS marketing,
  SUM(er.total_misc)                AS misc,
  SUM(er.grand_total)               AS grand_total
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
WHERE er.status IN ('submitted', 'approved')
  AND er.pay_period_start >= '2026-06-01'
  AND er.pay_period_end   <= '2026-06-30'
GROUP BY p.region
ORDER BY p.region;
