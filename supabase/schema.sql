-- ============================================================
-- PDX Expense Report App — Supabase Schema
-- Run this entire script in Supabase SQL Editor
-- Project: PDX (fubgrrthbqdgxvggccwk)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('regional_manager', 'kam');

CREATE TYPE pdx_region AS ENUM (
  'cpx',
  'pdx_north',
  'apx',
  'pdx',
  'pdx_south',
  'pdx_west',
  'apx_california'
);

CREATE TYPE report_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role user_role NOT NULL,
  region pdx_region NOT NULL,
  company TEXT NOT NULL DEFAULT 'Parts Distribution Xpress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_region ON public.profiles(region);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- ============================================================
-- EXPENSE REPORTS (header / pay period)
-- ============================================================

CREATE TABLE public.expense_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  status report_status NOT NULL DEFAULT 'draft',
  number_of_pages INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  -- Computed totals (denormalized for fast export queries)
  total_travel_lodging NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_tolls_parking NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_miles NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_mileage_calc NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_office_supplies NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_meals_entertainment NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_vehicle_maintenance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_marketing NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_misc NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_pay_period CHECK (pay_period_end >= pay_period_start)
);

CREATE INDEX idx_expense_reports_user ON public.expense_reports(user_id);
CREATE INDEX idx_expense_reports_status ON public.expense_reports(status);
CREATE INDEX idx_expense_reports_period ON public.expense_reports(pay_period_start, pay_period_end);

-- ============================================================
-- EXPENSE LINE ITEMS (matches T&E spreadsheet rows)
-- ============================================================

CREATE TABLE public.expense_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.expense_reports(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  expense_date DATE,
  description TEXT,
  related_to TEXT,
  travel_lodging NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tolls_parking NUMERIC(12, 2) NOT NULL DEFAULT 0,
  miles NUMERIC(10, 2) NOT NULL DEFAULT 0,
  mileage_calc NUMERIC(12, 2) NOT NULL DEFAULT 0,
  office_supplies NUMERIC(12, 2) NOT NULL DEFAULT 0,
  meals_entertainment NUMERIC(12, 2) NOT NULL DEFAULT 0,
  vehicle_maintenance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  marketing NUMERIC(12, 2) NOT NULL DEFAULT 0,
  misc NUMERIC(12, 2) NOT NULL DEFAULT 0,
  row_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  receipt_url TEXT,
  company TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_line_items_report ON public.expense_line_items(report_id);

-- ============================================================
-- APP SETTINGS (mileage rate, etc.)
-- ============================================================

CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (key, value) VALUES
  ('mileage_rate', '0.67'),
  ('company_name', 'Parts Distribution Xpress');

-- ============================================================
-- PHONE OTP VERIFICATION (pre-signup)
-- ============================================================

CREATE TABLE public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications(phone);

-- ============================================================
-- FUNCTION: Recalculate report totals from line items
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_report_totals(p_report_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.expense_reports er
  SET
    total_travel_lodging = COALESCE((
      SELECT SUM(travel_lodging) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_tolls_parking = COALESCE((
      SELECT SUM(tolls_parking) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_miles = COALESCE((
      SELECT SUM(miles) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_mileage_calc = COALESCE((
      SELECT SUM(mileage_calc) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_office_supplies = COALESCE((
      SELECT SUM(office_supplies) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_meals_entertainment = COALESCE((
      SELECT SUM(meals_entertainment) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_vehicle_maintenance = COALESCE((
      SELECT SUM(vehicle_maintenance) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_marketing = COALESCE((
      SELECT SUM(marketing) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    total_misc = COALESCE((
      SELECT SUM(misc) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    grand_total = COALESCE((
      SELECT SUM(row_total) FROM public.expense_line_items WHERE report_id = p_report_id
    ), 0),
    updated_at = NOW()
  WHERE id = p_report_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-recalculate on line item changes
CREATE OR REPLACE FUNCTION public.trigger_recalculate_report_totals()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_report_totals(OLD.report_id);
    RETURN OLD;
  ELSE
    PERFORM public.recalculate_report_totals(NEW.report_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recalculate_report_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_line_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_report_totals();

-- ============================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_expense_reports_updated_at
  BEFORE UPDATE ON public.expense_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_expense_line_items_updated_at
  BEFORE UPDATE ON public.expense_line_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCTION: Create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, phone, role, region, company, phone_verified)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''), 'User'),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''), 'Account'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'kam'::public.user_role),
    COALESCE((NEW.raw_user_meta_data->>'region')::public.pdx_region, 'pdx'::public.pdx_region),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'company'), ''), 'Parts Distribution Xpress'),
    COALESCE((NEW.raw_user_meta_data->>'phone_verified')::boolean, false)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow profile row creation during auth signup (trigger runs before session exists)
CREATE POLICY "Allow signup profile creation"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Expense reports: users manage their own reports
CREATE POLICY "Users can view own reports"
  ON public.expense_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reports"
  ON public.expense_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own draft reports"
  ON public.expense_reports FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('draft', 'rejected'));

CREATE POLICY "Users can delete own draft reports"
  ON public.expense_reports FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- Line items: access via report ownership
CREATE POLICY "Users can view own line items"
  ON public.expense_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = report_id AND er.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert line items on own reports"
  ON public.expense_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = report_id AND er.user_id = auth.uid()
        AND er.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Users can update line items on own reports"
  ON public.expense_line_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = report_id AND er.user_id = auth.uid()
        AND er.status IN ('draft', 'rejected')
    )
  );

CREATE POLICY "Users can delete line items on own reports"
  ON public.expense_line_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.expense_reports er
      WHERE er.id = report_id AND er.user_id = auth.uid()
        AND er.status IN ('draft', 'rejected')
    )
  );

-- App settings: read-only for authenticated users
CREATE POLICY "Authenticated users can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Phone verifications: service role only (handled via API)
CREATE POLICY "No direct access to phone verifications"
  ON public.phone_verifications FOR ALL
  USING (false);

-- ============================================================
-- STORAGE BUCKET for receipts (run separately in Storage UI or below)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- ============================================================
-- EXPORT VIEW: Flattened data for spreadsheet export
-- ============================================================

CREATE OR REPLACE VIEW public.v_expense_export AS
SELECT
  er.id AS report_id,
  p.first_name || ' ' || p.last_name AS employee_name,
  p.company,
  p.region,
  p.role,
  er.pay_period_start,
  er.pay_period_end,
  er.number_of_pages,
  er.status,
  er.grand_total AS report_grand_total,
  eli.sort_order,
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
  eli.row_total,
  er.total_travel_lodging,
  er.total_tolls_parking,
  er.total_miles,
  er.total_mileage_calc,
  er.total_office_supplies,
  er.total_meals_entertainment,
  er.total_vehicle_maintenance,
  er.total_marketing,
  er.total_misc,
  er.submitted_at,
  er.approved_at
FROM public.expense_reports er
JOIN public.profiles p ON p.id = er.user_id
LEFT JOIN public.expense_line_items eli ON eli.report_id = er.id
ORDER BY er.pay_period_start DESC, eli.sort_order ASC;

-- Grant access to the view
GRANT SELECT ON public.v_expense_export TO authenticated;
