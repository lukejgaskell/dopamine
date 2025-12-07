export interface Idea {
  id: string
  created_at: string
  text: string
  scroll_id: string
  dataset_id?: string | null
  votes: number
  unique_user_id?: string | null
  created_by?: string | null
}
