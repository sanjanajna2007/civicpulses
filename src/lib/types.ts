export const CATS = ['Roads', 'Water', 'Electricity', 'Garbage', 'Public Safety', 'General'] as const;
export const PRIS = ['High', 'Medium', 'Low'] as const;
export const STAGES = ['Submitted', 'Under Review', 'In Progress', 'Resolved'] as const;
export type Category = (typeof CATS)[number];
export type Priority = (typeof PRIS)[number];
export type Status = (typeof STAGES)[number];
export interface PublicRow { public_id: string; description: string; location: string; lat: number | null; lng: number | null; category: Category; priority: Priority; status: Status; created_at: string }
export interface Complaint extends PublicRow { id: string; image_url: string | null; ai_reason: string | null; department_id: number | null; departments: { name: string } | null }
export interface Department { id: number; name: string }
export interface Notification { id: number; message: string; read: boolean; created_at: string }
export interface Tracked { public_id: string; description: string; location: string; category: Category; priority: Priority; status: Status; image_url: string | null; created_at: string; ai_reason: string | null; department: string | null; history: { status: Status; at: string }[] }
