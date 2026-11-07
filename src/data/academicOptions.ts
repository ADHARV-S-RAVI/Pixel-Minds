/**
 * Predefined Course and Branch options for Signup and Edit Profile
 */

export const COURSE_OPTIONS = [
  'BE',
  'BTech',
  'BCA',
  'BSc',
  'BCom',
  'BA',
  'BBA',
  'MCA',
  'MTech',
  'MSc',
  'MBA',
  'Other'
] as const;

export type CourseOption = typeof COURSE_OPTIONS[number];

export const BRANCH_MAP: Record<string, string[]> = {
  BE: [
    'Computer Science and Engineering',
    'Information Science and Engineering',
    'Artificial Intelligence and Machine Learning',
    'Data Science',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Other'
  ],
  BTech: [
    'Computer Science and Engineering',
    'Information Science and Engineering',
    'Artificial Intelligence and Machine Learning',
    'Data Science',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Other'
  ],
  BCA: [
    'Computer Applications',
    'Software Development',
    'Cloud Computing',
    'Cyber Security',
    'Data Analytics',
    'Other'
  ],
  MCA: [
    'Computer Applications',
    'Software Engineering',
    'Cloud & Systems',
    'Artificial Intelligence',
    'Cyber Security & Networking',
    'Other'
  ],
  BSc: [
    'Computer Science',
    'Information Technology',
    'Mathematics',
    'Physics',
    'Statistics',
    'Electronics',
    'Biotechnology',
    'Other'
  ],
  MSc: [
    'Computer Science',
    'Information Technology',
    'Data Science',
    'Mathematics',
    'Physics',
    'Statistics',
    'Other'
  ],
  MTech: [
    'Computer Science and Engineering',
    'Artificial Intelligence',
    'VLSI & Embedded Systems',
    'Data Engineering',
    'Software Engineering',
    'Structural Engineering',
    'Thermal Engineering',
    'Other'
  ],
  BBA: [
    'Finance',
    'Marketing',
    'Human Resource Management',
    'Business Analytics',
    'International Business',
    'Other'
  ],
  MBA: [
    'Finance',
    'Marketing',
    'Human Resources',
    'Business Analytics',
    'Operations & Supply Chain',
    'Information Technology',
    'Other'
  ],
  BCom: [
    'Accounting and Finance',
    'Banking and Insurance',
    'Financial Markets',
    'Taxation',
    'Computer Applications',
    'Other'
  ],
  BA: [
    'Economics',
    'Psychology',
    'English Literature',
    'Journalism and Mass Communication',
    'Political Science',
    'Sociology',
    'Other'
  ]
};

/**
 * Get suitable branch options for a given course
 */
export function getBranchesForCourse(course: string): string[] {
  if (!course) return [];
  const normalized = course.trim();
  if (BRANCH_MAP[normalized]) {
    return BRANCH_MAP[normalized];
  }
  // If not matched or "Other", allow custom branch entry
  return ['Other'];
}

/**
 * Determines whether the given course is one of the predefined options
 */
export function isPredefinedCourse(course: string): boolean {
  return COURSE_OPTIONS.includes(course as CourseOption) && course !== 'Other';
}

/**
 * Determines whether the given branch is in the course's predefined list
 */
export function isPredefinedBranch(course: string, branch: string): boolean {
  const branches = getBranchesForCourse(course);
  return branches.includes(branch) && branch !== 'Other';
}

