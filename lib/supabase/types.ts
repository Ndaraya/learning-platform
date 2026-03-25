export type UserRole = 'student' | 'admin' | 'org_admin' | 'super_admin'
export type TaskType = 'quiz' | 'written'
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
  order: number
  created_at: string
}

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string | null
  youtube_url: string
  order: number
  created_at: string
}

export interface Task {
  id: string
  lesson_id: string
  title: string
  type: TaskType
  instructions: string | null
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
