export interface PayrollComponent {
  id: string;
  name: string;
  amount: number;
  type: 'EARNING' | 'DEDUCTION';
}

export interface PayrollPreview {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  base_salary: number;
  total_allowance: number;
  total_overtime: number;
  total_deductions: number;
  bpjs_kes_employee: number;
  bpjs_kes_company: number;
  bpjs_tk_employee: number;
  bpjs_tk_company: number;
  tax_amount: number;
  take_home_pay: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  overtime_hours: number;
  slip_pdf_url: string | null;
  generated_at: string;
  // New matching properties from backend
  salary_original?: number;
  work_days?: number;
  bruto_salary?: number;
  employee_custom_earning?: number;
  employee_custom_deduction?: number;
  minor_late_days?: number;
  major_late_days?: number;
  late_deduction?: number;
  leave_deduction?: number;
  total_leave_days?: number;
  employee?: {
    id: string;
    full_name: string;
    nik: string;
    photo_url?: string | null;
  };
  component_lines?: Array<{
    name: string;
    component_type: "EARNING" | "DEDUCTION";
    amount: number;
    keterangan?: string | null;
  }>;
  absensi?: {
    alpha: number;
    ijin: number;
    cuti: number;
    sakit: number;
  };
  bank_account?: {
    bank_name: string;
    account_number: string;
    account_holder_name: string;
  };
  // Fallbacks for compatibility
  components?: PayrollComponent[];
  status?: string;
}

export interface PayrollPreviewQuery {
  month: number;
  year: number;
  company_id?: string | null;
}
