export type UserRole = 'student' | 'admin' | 'org_admin' | 'super_admin'
export type LessonType = 'video' | 'text' | 'pdf' | 'image'
export type TaskType = 'quiz' | 'written' | 'video' | 'pdf' | 'text' | 'image'
export type QuestionType = 'mcq' | 'written'
export type SubscriptionTier = 'free' | 'pro' | 'enterprise'

export interface Organization {
  id: string
  name: string
  type: string
  subscription_tier: SubscriptionTier
  stripe_customer_id: string | null
  created_at: string
}

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  org_id: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  published: boolean
  created_by: string
  created_at: string
}

export interface Module {
  id: string
  course_id: string
  title: string
  description: string | null
  section: string | null
  order: number
  created_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string | null
  lesson_type: LessonType
  youtube_url: string | null      // legacy; content_url preferred for new lessons
  content_url: string | null      // video URL, PDF URL, or external article link
  content_body: string | null     // inline text/markdown
  image_urls: string[]            // gallery image URLs
  order: number
  created_at: string
}

export interface Task {
  id: string
  lesson_id: string
  title: string
  type: TaskType
  instructions: string | null
  video_url: string | null        // used for video/pdf tasks
  content_body: string | null     // used for text/image tasks
  image_urls: string[]            // used for image tasks
  order: number
  created_at: string
}

export interface Question {
  id: string
  task_id: string
  prompt: string
  type: QuestionType
  options: string[] | null    // MCQ choices
  correct_answer: string | null  // MCQ correct option
  points: number
  grading_rubric: string | null  // Written questions
  image_url: string | null       // Optional uploaded question image
  created_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  org_id: string | null
  enrolled_at: string
  completed_at: string | null
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  completed_at: string | null
}

export interface TaskSubmission {
  id: string
  user_id: string
  task_id: string
  score: number | null
  max_score: number
  feedback: string | null
  graded_at: string | null
  created_at: string
}

export interface QuestionResponse {
  id: string
  submission_id: string
  question_id: string
  answer: string
  score: number | null
  max_score: number
  feedback: string | null
  ai_graded: boolean
  created_at: string
}

export interface PracticeTest {
  id: string
  course_id: string
  title: string
  description: string | null
  // {"english": {"1": "A", ...}, "math": {...}, ...}
  answer_key: Record<string, Record<string, string>>
  // {"english": {"40": 36, ...}, ...}
  scoring_table: Record<string, Record<string, number>>
  // {"english": 75, "math": 60, "reading": 40, "science": 40}
  question_counts: Record<string, number>
  published: boolean
  created_at: string
}

export interface PracticeTestSubmission {
  id: string
  user_id: string
  practice_test_id: string
  english_score: number | null
  math_score: number | null
  reading_score: number | null
  science_score: number | null
  composite_score: number | null
  raw_english: number | null
  raw_math: number | null
  raw_reading: number | null
  raw_science: number | null
  // {"english": {"1": "A", ...}, "math": {...}, ...}
  responses: Record<string, Record<string, string>>
  submitted_at: string
}
