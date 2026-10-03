export interface Opp {
  id: string | number;
  title: string;
  org: string;
  cat: string;
  mode: string;
  deadline: string;
  days: number;
  prize: string;
  skills: string[];
  tint?: string;
  description?: string;
  officialUrl?: string;
  imageUrl?: string;
  views?: number;
  applyClicks?: number;
  featured?: boolean;
  stipend?: string;
  eligibility?: string;
  teamSize?: string;
  additionalInfo?: string;
  source?: 'admin' | 'user';
  startDate?: string;
  endDate?: string;
  location?: string;
}

export const cats = [
  'Hackathons',
  'Internships',
  'Events',
  'Workshops',
  'Competitions',
  'Scholarships',
  'Courses',
  'Startup Programs',
  'Conferences',
  'Fellowships'
];

const tints = ['#e0f2fe', '#e0e7ff', '#dcfce7', '#fef3c7', '#fce7f3', '#ccfbf1'];

export const initialOpps: Opp[] = [
  {
    id: 1,
    title: 'Smart India Hackathon 2026',
    org: 'Ministry of Education',
    cat: 'Hackathons',
    mode: 'Hybrid',
    deadline: 'Nov 14',
    days: 44,
    prize: '₹1,00,000',
    skills: ['AI', 'Web', 'IoT'],
    description: 'National level hackathon for students across India solving pressing government & industry challenges with high impact solutions.',
    officialUrl: 'https://sih.gov.in',
    views: 1420,
    applyClicks: 412
  },
  {
    id: 2,
    title: 'Summer SDE Internship',
    org: 'Razorpay',
    cat: 'Internships',
    mode: 'Remote',
    deadline: 'Oct 20',
    days: 19,
    prize: '₹60k/mo',
    skills: ['React', 'Node', 'SQL'],
    description: 'Join the engineering team at Razorpay building scalable financial infrastructure used by millions of merchants worldwide.',
    officialUrl: 'https://razorpay.com/careers',
    views: 980,
    applyClicks: 320
  },
  {
    id: 3,
    title: 'Google Cloud Study Jam',
    org: 'GDG Mumbai',
    cat: 'Workshops',
    mode: 'Online',
    deadline: 'Oct 09',
    days: 8,
    prize: 'Certificate & Swag',
    skills: ['Cloud', 'DevOps', 'GCP'],
    description: 'Hands-on training and skill badges on Google Cloud Platform, Kubernetes, BigQuery, and generative AI fundamentals.',
    officialUrl: 'https://gdg.community.dev',
    views: 640,
    applyClicks: 185
  },
  {
    id: 4,
    title: 'Codeforces Round Campus Cup',
    org: 'IIT Bombay',
    cat: 'Competitions',
    mode: 'Online',
    deadline: 'Oct 27',
    days: 26,
    prize: '₹50,000',
    skills: ['DSA', 'C++', 'Algorithms'],
    description: 'A 2.5-hour algorithmic coding tournament testing dynamic programming, graph algorithms, and competitive problem solving.',
    officialUrl: 'https://codeforces.com',
    views: 520,
    applyClicks: 160
  },
  {
    id: 5,
    title: 'Women in Tech Scholarship',
    org: 'Grace Hopper India',
    cat: 'Scholarships',
    mode: 'Online',
    deadline: 'Nov 02',
    days: 32,
    prize: '₹2,00,000',
    skills: ['Any stream', 'Tech', 'Leadership'],
    description: 'Annual merit and need-based scholarship providing tuition support, conference pass, and 1-on-1 executive mentorship.',
    officialUrl: 'https://ghindia.org',
    views: 810,
    applyClicks: 275
  },
  {
    id: 6,
    title: 'Y Combinator Startup School',
    org: 'Y Combinator',
    cat: 'Startup Programs',
    mode: 'Online',
    deadline: 'Dec 01',
    days: 61,
    prize: 'Mentorship & $500k Potential',
    skills: ['Product', 'GTM', 'Founder'],
    description: 'Free 8-week online program that teaches ambitious founders how to build, launch, and scale a high-growth tech startup.',
    officialUrl: 'https://startupschool.org',
    views: 1100,
    applyClicks: 390
  },
  {
    id: 7,
    title: 'DevFest Pune 2026',
    org: 'GDG Pune',
    cat: 'Events',
    mode: 'Onsite',
    deadline: 'Oct 25',
    days: 24,
    prize: 'Networking & Keynotes',
    skills: ['Web', 'AI', 'Android'],
    description: 'Largest community-led developer conference in Western India featuring keynotes, technical tracks, and networking sessions.',
    officialUrl: 'https://devfest.gdgpune.in',
    views: 730,
    applyClicks: 210
  },
  {
    id: 8,
    title: 'Open Source Fellowship',
    org: 'Linux Foundation',
    cat: 'Fellowships',
    mode: 'Remote',
    deadline: 'Nov 20',
    days: 50,
    prize: '$3,000 Stipend',
    skills: ['Rust', 'Go', 'Linux'],
    description: 'Mentored fellowship contributing to core open source repositories including Kubernetes, Linux Kernel, and CNCF projects.',
    officialUrl: 'https://linuxfoundation.org',
    views: 1250,
    applyClicks: 440
  }
].map((o, i) => ({
  ...o,
  tint: tints[i % tints.length]
}));

export const opps = initialOpps;

export interface LeaderboardUser {
  rank: number;
  name: string;
  pixels: number;
  contribs: number;
}

export const users: LeaderboardUser[] = [
  { rank: 1, name: 'Aarav Mehta', pixels: 4820, contribs: 64 },
  { rank: 2, name: 'Diya Nair', pixels: 4310, contribs: 58 },
  { rank: 3, name: 'Rohan Iyer', pixels: 3975, contribs: 51 },
  { rank: 4, name: 'Sana Qureshi', pixels: 3120, contribs: 44 },
  { rank: 5, name: 'Kabir Shah', pixels: 2640, contribs: 37 },
  { rank: 6, name: 'Ishita Rao', pixels: 1980, contribs: 29 },
  { rank: 7, name: 'Neel Joshi', pixels: 1210, contribs: 18 },
  { rank: 8, name: 'Meera Das', pixels: 640, contribs: 9 }
];

export const tiers: [number, string][] = [
  [0, 'Pixel Starter'],
  [500, 'Pixel Scout'],
  [1200, 'Pixel Contributor'],
  [2500, 'Pixel Builder'],
  [4000, 'Pixel Master'],
  [7500, 'Pixel Legend']
];

export const tierInfo = (p: number) => {
  let i = 0;
  tiers.forEach(([m], j) => {
    if (p >= m) i = j;
  });
  const n = tiers[i + 1];
  return {
    name: tiers[i][1],
    next: n ? n[1] : null,
    toGo: n ? n[0] - p : 0,
    pct: n ? Math.round(((p - tiers[i][0]) / (n[0] - tiers[i][0])) * 100) : 100
  };
};

export const rankOf = (p: number) => tierInfo(p).name;

export const moves = [2, -1, 1, 0, 3, -2, 1, 0];

export interface FeedPost {
  id: number | string;
  user: string;
  role: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  opp?: number | string;
  img?: boolean;
  link?: string;
}

export const initialPosts: FeedPost[] = [
  {
    id: 1,
    user: 'Diya Nair',
    role: 'CS student, VIT',
    time: '2h ago',
    text: 'Registrations just opened for Smart India Hackathon. Team of 6, problem statements are out — sharing so nobody misses the Nov 14 deadline.',
    opp: 1,
    likes: 128,
    comments: 14
  },
  {
    id: 2,
    user: 'Rohan Iyer',
    role: 'Backend intern',
    time: '5h ago',
    text: 'Attended the GDG Pune meetup yesterday. Best talk: shipping ML models on a budget. Slides are in the comments.',
    likes: 76,
    comments: 9,
    img: true
  },
  {
    id: 3,
    user: 'Sana Qureshi',
    role: 'Open source contributor',
    time: '1d ago',
    text: 'The Linux Foundation fellowship is paying $3,000 and takes first-time contributors. Apply before Nov 20.',
    opp: 8,
    likes: 203,
    comments: 31
  }
];
