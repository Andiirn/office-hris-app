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
  // Fallbacks for compatibility
  components?: PayrollComponent[];
  status?: string;
}

export interface PayrollPreviewQuery {
  month: number;
  year: number;
}
