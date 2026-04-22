/** App name — replaced by the CLI during scaffolding */
export const APP_NAME = 'resume-builder'

/**
 * Build the RecordRoom scope id for this app. Derived from the env-provided
 * `APP_NAME` at runtime on the server side; client side the env matches the
 * compile-time constant. Use this helper instead of string-concatenating.
 */
export function makeScopeId(appName: string): string {
  return `app:${appName}`
}

/** Primary scope ID for the app's RecordRoom DO (client side). */
export const SCOPE_ID = makeScopeId(APP_NAME)

/** Roles and display config — imported from SDK (single source of truth) */
export { ROLES, ROLE_CONFIG, type Role } from 'deepspace'

// ============================================================================
// Resume & Job Tips (shown in ThoughtBubble above robot on Dashboard)
// ============================================================================

export const RESUME_TIPS = [
  // Resume
  "Quantify achievements — numbers catch recruiters' eyes.",
  "Tailor your resume for each job application.",
  "Use action verbs in your resume: led, built, shipped, reduced, increased.",
  "Keep your resume to one page unless you have 10+ years of experience.",
  "Put your strongest section first on your resume — not always work experience.",
  "Remove 'References available upon request' — it's assumed.",
  "Use a professional email. firstname.lastname@ is ideal.",
  "European CVs include a photo and date of birth — US resumes don't.",
  "ATS systems scan for keywords from the job description.",
  "White space on your resume is your friend — don't cram everything in.",
  "Skills sections work best as a concise list, not paragraphs.",
  "Include links: GitHub, portfolio, LinkedIn — make them clickable.",
  "Proofread your resume twice. Then have someone else proofread.",
  "GPA only matters for new grads. Drop it after your first job.",
  "A cover letter still matters for competitive positions.",
  "List accomplishments, not responsibilities.",
  "Use consistent date formatting throughout your resume.",
  "Your most recent role gets the most space.",
  "Remove outdated skills — nobody needs to know you know Flash.",
  "If you speak multiple languages, always include them.",
  // Job hunt & applications
  "Apply early — some roles fill before the deadline.",
  "Follow up once after applying. More than that can backfire.",
  "Save job descriptions before they're taken down.",
  "Track your applications in a spreadsheet — you'll forget otherwise.",
  "Rejection is normal. Even great candidates get passed over.",
  "Reach out to recruiters on LinkedIn — many roles aren't posted.",
  "Your network is your net worth. Stay in touch with former colleagues.",
  "Referrals often skip the resume screen. Ask for them.",
  "Research the company before applying — tailor your pitch.",
  "Salary expectations: know your range before the first interview call.",
  // Interviews
  "Prepare 2–3 questions to ask your interviewers. It shows you care.",
  "Use the STAR method for behavioral interview questions.",
  "Send a thank-you note within 24 hours of the interview.",
  "Practice interview answers out loud. It sounds different than in your head.",
  "In interviews, it's okay to pause and think before answering.",
  "Mirror the interviewer's energy — formal or casual — to build rapport.",
  "Bring copies of your resume to in-person interviews.",
  "Arrive 5–10 minutes early to interviews. Never late.",
  // General career
  "Your first job doesn't define your career. Pivots are normal.",
  "Negotiate job offers. Most have room. Worst case, they say no.",
  "Take notes in 1:1s with your manager. You'll forget what you discussed.",
  "Document your wins. You'll need them for reviews and resumes.",
  "Burnout helps nobody. Pace yourself.",
  "Learn something new regularly — it keeps you marketable.",
]

// ============================================================================
// Template Metadata
// ============================================================================

export interface TemplateMetadata {
  id: string
  name: string
  description: string
  region: string
  color: string
  previewUrl: string
}

export const TEMPLATE_METADATA: TemplateMetadata[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean single-column, no photo, ideal for US/global roles',
    region: 'US / Global',
    color: '#6366F1',
    previewUrl: 'https://deepspacesites.com/api/files/widgets/file-uploader_1773856036299/1773856257927-xtospqjr6-Modern-Resume.pdf',
  },
  {
    id: 'europass',
    name: 'Europass',
    description: 'Photo, nationality, CEFR language grid — EU standard',
    region: 'European Union',
    color: '#0EA5E9',
    previewUrl: 'https://deepspacesites.com/api/files/widgets/file-uploader_1773856036299/1773856258225-ynr2hlefp-Modern-Resume(1).pdf',
  },
  {
    id: 'academic',
    name: 'Academic CV',
    description: 'Multi-page with publications, teaching, grants',
    region: 'Global',
    color: '#10B981',
    previewUrl: 'https://deepspacesites.com/api/files/widgets/file-uploader_1773856036299/1773856258623-hyry3uhmx-Modern-Resume(2).pdf',
  },
  {
    id: 'twocolumn',
    name: 'Two-Column',
    description: 'Sidebar for skills/contact, main area for experience',
    region: 'Global',
    color: '#F59E0B',
    previewUrl: 'https://deepspacesites.com/api/files/widgets/file-uploader_1773856036299/1773856258900-n8igqdrzi-Modern-Resume(3).pdf',
  },
  {
    id: 'jakes',
    name: "Jake's Resume",
    description: 'ATS-optimized, Education-first, most popular on Overleaf',
    region: 'US / Global',
    color: '#64748B',
    previewUrl: 'https://deepspacesites.com/api/files/widgets/file-uploader_1773856036299/1773856259156-n9k7dxqnd-Modern-Resume(4).pdf',
  },
]

// ============================================================================
// Section Types
// ============================================================================

export type SectionKey =
  | 'personalInfo'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'languages'
  | 'projects'
  | 'certifications'
  | 'customSections'

export const SECTION_LABELS: Record<SectionKey, string> = {
  personalInfo: 'Personal Information',
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  projects: 'Projects',
  certifications: 'Certifications',
  customSections: 'Additional Sections',
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'personalInfo',
  'summary',
  'experience',
  'education',
  'skills',
  'languages',
  'projects',
  'certifications',
  'customSections',
]

// ============================================================================
// Compilers
// ============================================================================

export type Compiler = 'pdflatex' | 'xelatex' | 'lualatex'

export const COMPILERS: { id: Compiler; label: string }[] = [
  { id: 'pdflatex', label: 'pdfLaTeX' },
  { id: 'xelatex', label: 'XeLaTeX' },
  { id: 'lualatex', label: 'LuaLaTeX' },
]

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_SETTINGS = {
  theme: 'light' as 'light' | 'dark',
  defaultTemplate: 'modern',
  defaultCompiler: 'pdflatex' as Compiler,
  activeResumeId: null as string | null,
  backgroundId: 'metropolitan-city' as string,
}

// ============================================================================
// Background Images
// ============================================================================

export interface BackgroundOption {
  id: string
  label: string
  description: string
  url: string
}

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'light',
    label: 'Light',
    description: 'Clean white workspace — minimal, bright, professional',
    url: '',
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Deep dark workspace — focused, modern, sleek',
    url: '',
  },
  {
    id: 'golden-horizon',
    label: 'Golden Horizon',
    description: 'Warm sky and distant hills — peaceful, hopeful, golden hour',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773416354353/1773416967880-h7x1wq8qw-pexels-eberhardgross-691668.jpg',
  },
  {
    id: 'abstract-painting',
    label: 'Abstract Painting',
    description: 'Bold textures and vivid hues — vibrant, artistic, creative',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773337800946/1773338060038-yh5kmph0o-pexels-steve-1269968.jpg',
  },
  {
    id: 'aged-parchment',
    label: 'Aged Parchment',
    description: 'Brown canvas texture — rustic, vintage, classic',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773337800946/1773338057925-n5q23tz7l-pexels-pixabay-235985.jpg',
  },
  {
    id: 'starry-sky',
    label: 'Starry Sky',
    description: 'Milky Way night sky — cosmic, deep space, exploratory',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773416354353/1773417003064-b4u8cg3jq-pexels-philippedonn-1169754.jpg',
  },
  {
    id: 'mountain-landscape',
    label: 'Mountain Landscape',
    description: 'Dramatic peaks and valleys — majestic, expansive, adventurous',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773416354353/1773416921626-rcohs4ddu-pexels-eberhardgross-443446.jpg',
  },
  {
    id: 'forest-path',
    label: 'Forest Path',
    description: 'Sun-dappled woodland trail — natural, serene, inviting',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773416354353/1773416920912-pdr2giliv-pexels-catiamatos-1072179.jpg',
  },
  {
    id: 'metropolitan-city',
    label: 'Metropolitan City',
    description: 'Bright city lights at night — urban, dynamic, energetic',
    url: 'https://deepspacesites.com/api/files/widgets/file-url-uploader_1773416354353/1773417055843-9jmjmvgbz-pexels-maxfrancis-2246476.jpg',
  },
]

// ============================================================================
// Robot animations to play on tip change
// ============================================================================

export const TIP_ANIMATIONS = ['Wave', 'ThumbsUp', 'Yes', 'Jump']

// ============================================================================
// Compilation (for useCompilation hook)
// ============================================================================

export type CompileStatus = 'idle' | 'compiling' | 'success' | 'error'

export type LogCategory = 'errors' | 'warnings' | 'badboxes' | 'missingRefs' | 'rawLog'

export interface LogItem {
  message: string
  type?: string
  package?: string
  line?: number
  file?: string
  context: string
}

export interface CompilationLog {
  compiled: boolean
  duration?: number
  summary: {
    errorsCount: number
    warningsCount: number
    badboxesCount: number
    missingRefsCount: number
    hasErrors: boolean
    hasWarnings: boolean
  }
  errors: LogItem[]
  warnings: LogItem[]
  badboxes: LogItem[]
  missingRefs: LogItem[]
  rawLog: string
  logFiles: Record<string, string>
}

export interface CompilationResult {
  success: boolean
  pdfUrl?: string
  pdfBlob?: Blob
  pdfBase64?: string
  compilationLog: CompilationLog
}

export const VERSION_CAP = 10

// ============================================================================
// AI Assist Prompts
// ============================================================================

export const AI_PROMPTS = {
  IMPROVE_EXPERIENCE_BULLET: `You are an expert resume writer who crafts ATS-optimized, recruiter-tested bullet points. Rewrite the given work experience bullet using the proven XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]."

Rules:
- Start with a strong, specific action verb (e.g., spearheaded, architected, accelerated, reduced, scaled — never "responsible for", "helped", "assisted", "worked on")
- Include at least one quantifiable metric (%, $, time, users, scale). If the original has none, infer a reasonable scope from the context provided.
- Mention the tool, method, or approach used when relevant
- Emphasize business impact: revenue, efficiency, cost savings, user growth, or risk reduction
- Keep it to ONE concise sentence, max 25 words
- Use active voice only — no passive constructions
- Do NOT add filler words or vague adjectives ("various", "multiple", "significant")

Return ONLY the improved bullet point — no explanation, no quotes, no prefix.`,

  IMPROVE_PROJECT_BULLET: `You are an expert resume writer who crafts ATS-optimized bullet points for technical and personal projects. Rewrite the given project bullet to showcase technical depth and initiative.

Rules:
- Start with a strong action verb (e.g., built, engineered, designed, implemented, deployed, optimized)
- Highlight the technical decision or approach (architecture, framework, algorithm, tool choice)
- Include scope or scale (users served, data processed, performance improvement, lines of code, etc.)
- Show the outcome: what problem it solved, who benefits, or what it demonstrates
- Keep it to ONE concise sentence, max 25 words
- Use active voice only
- Do NOT use vague language ("worked on", "helped with", "various technologies")

Return ONLY the improved bullet point — no explanation, no quotes, no prefix.`,

  REWRITE_SUMMARY: `You are a professional resume writer. Rewrite the given professional summary to be more compelling, concise, and results-oriented. Keep it to 2–4 sentences. Return ONLY the rewritten summary — no explanation, no quotes, no prefix.`,

  REGENERATE_EXPERIENCE_BULLET: `You are an expert resume writer. The user wants a refined version of a previous AI-generated work experience bullet point. Given the original text, the previous suggestion, and the user's refinement instructions, produce an improved version.

Rules:
- Start with a strong, specific action verb (never "responsible for", "helped", "assisted", "worked on")
- Include at least one quantifiable metric (%, $, time, users, scale)
- Emphasize business impact: revenue, efficiency, cost savings, user growth, or risk reduction
- Keep it under 25 words, active voice only
- Honor the user's specific refinement instructions while maintaining professional resume quality

Return ONLY the improved bullet point — no explanation, no quotes, no prefix.`,

  REGENERATE_PROJECT_BULLET: `You are an expert resume writer. The user wants a refined version of a previous AI-generated project bullet point. Given the original text, the previous suggestion, and the user's refinement instructions, produce an improved version.

Rules:
- Start with a strong action verb (e.g., built, engineered, designed, implemented, deployed, optimized)
- Highlight the technical decision or approach (architecture, framework, algorithm, tool choice)
- Include scope or scale (users served, data processed, performance improvement)
- Keep it under 25 words, active voice only
- Honor the user's specific refinement instructions while maintaining professional resume quality

Return ONLY the improved bullet point — no explanation, no quotes, no prefix.`,

  REGENERATE_SUMMARY: `You are a professional resume writer. The user has requested a refinement of a previous AI-generated summary. Given the original summary, the previous AI suggestion, and the user's refinement instructions, produce an improved version. Return ONLY the rewritten summary — no explanation, no quotes, no prefix. Keep it to 2–4 sentences.`,

  TAILOR_SUMMARY_TO_JD: `You are an expert resume writer. Rewrite the candidate's professional summary to better align with the target job description.

CRITICAL RULES:
- Do NOT invent new experience, skills, or achievements
- Do NOT add technologies or responsibilities the candidate didn't mention
- ONLY rephrase existing content to use relevant keywords from the job description
- Keep it to 2–4 sentences
- Use active voice

Return ONLY the rewritten summary — no explanation, no quotes, no prefix.`,

  TAILOR_EXPERIENCE_BULLETS_TO_JD: `You are an expert resume writer. Rewrite the candidate's work experience bullets to better align with the target job description.

CRITICAL RULES:
- Do NOT invent new achievements, metrics, or responsibilities
- Do NOT add technologies/tools the candidate didn't mention
- ONLY rephrase existing content to use relevant keywords from the JD
- If a bullet is already well-aligned, return it unchanged or with minimal tweaks
- Keep each bullet under 25 words, active voice, starting with action verbs
- Return the SAME NUMBER of bullets in the SAME ORDER

Return ONLY a JSON array of strings — one per bullet, in the same order as the input. No markdown, no explanation. Example: ["bullet one", "bullet two"]`,

  TAILOR_PROJECT_BULLETS_TO_JD: `You are an expert resume writer. Rewrite the candidate's project bullets to better align with the target job description.

CRITICAL RULES:
- Do NOT invent new achievements, technologies, or scope
- Do NOT add tools or frameworks the candidate didn't mention
- ONLY rephrase existing content to use relevant keywords from the JD
- If a bullet is already well-aligned, return it unchanged or with minimal tweaks
- Keep each bullet under 25 words, active voice, starting with action verbs
- Return the SAME NUMBER of bullets in the SAME ORDER

Return ONLY a JSON array of strings — one per bullet, in the same order as the input. No markdown, no explanation. Example: ["bullet one", "bullet two"]`,

  TAILOR_SKILLS_FROM_JD: `You are an expert resume writer. Extract skills and technologies from the job description that the candidate could reasonably add to their resume (skills they might have from related experience or adjacent technologies).

Return ONLY a JSON array of strings — skill names only, max 10 items. No markdown, no explanation. Example: ["React", "TypeScript", "CI/CD"]`,
}

export const EMPTY_COMPILATION_LOG: CompilationLog = {
  compiled: false,
  summary: {
    errorsCount: 0,
    warningsCount: 0,
    badboxesCount: 0,
    missingRefsCount: 0,
    hasErrors: false,
    hasWarnings: false,
  },
  errors: [],
  warnings: [],
  badboxes: [],
  missingRefs: [],
  rawLog: '',
  logFiles: {},
}
