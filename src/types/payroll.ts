export interface PayrollComponent {
  id: string;
  name: string;
  amount: number;
  type: 'EARNING' | 'DEDUCTION';
}

export interface PayrollPreview {
  employee_id: string;
  full_name: string;
  month: number;
  year: number;
  basic_salary: number;
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  components: PayrollComponent[];
  status: string;
}

export interface PayrollPreviewQuery {
  month: number;
  year: number;
}
