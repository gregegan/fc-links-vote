export type Entry = {
  id: string;
  title: string;
  option1: string;
  required_channel: string;
  created_at: number;
  end_at: number;
}

export const ENTRY_EXPIRY = 60 * 60 * 24 * 180; // Expire polls after 3 months
