export interface DeskAlert {
  id: string;
  deskId: string;
  role: string;
  stt: string | null;
  customerName: string | null;
  createdAt: number;
}
