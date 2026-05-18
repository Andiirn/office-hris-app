export type HolidayType = 'NATIONAL' | 'COLLECTIVE_LEAVE' | 'COMPANY_HOLIDAY';

export interface Holiday {
  id: string;
  company_id: string | null;
  holiday_date: string;
  name: string;
  holiday_type: HolidayType;
  is_optional_work: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface HolidayListQuery {
  company_id?: string;
  year?: number;
  holiday_type?: HolidayType;
  page?: number;
  limit?: number;
}
