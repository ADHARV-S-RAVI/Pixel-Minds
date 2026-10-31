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
  userId?: string;
  role: string;
  time: string;
  text: string;
  category?: string;
  likes: number;
  comments: number;
  opp?: number | string;
  link?: string;
  hackathonDetails?: {
    name: string;
    date: string;
    location: string;
    link: string;
  };
}

export const initialPosts: FeedPost[] = [
  {
    id: 'post-1',
    user: 'Diya Nair',
    userId: 'user-diya',
    role: 'CS student, VIT',
    time: '2h ago',
    category: 'Upcoming Hackathon',
    text: '🚀 Upcoming Hackathon: Smart India Hackathon 2026\n📅 Dates: Nov 14 - 16, 2026\n📍 Location: Hybrid (Nationwide Centers)\n🔗 Registration: https://sih.gov.in\n\nRegistrations just opened for SIH 2026! Problem statements across AI, Smart Automation, and Clean Tech are now live. We have 4 team members from VIT and are looking for 2 backend engineers experienced in Python/FastAPI. Reach out if you want to team up!',
    link: 'https://sih.gov.in',
    hackathonDetails: {
      name: 'Smart India Hackathon 2026',
      date: 'Nov 14 - 16, 2026',
      location: 'Hybrid (Nationwide Centers)',
      link: 'https://sih.gov.in'
    },
    likes: 128,
    comments: 14
  },
  {
    id: 'post-2',
    user: 'Rohan Iyer',
    userId: 'user-rohan',
    role: 'Backend Intern & Hacker',
    time: '5h ago',
    category: 'Learning',
    text: 'Just wrapped up a 36-hour sprint building an AI agent for real-time document verification. Three biggest learnings for hackathon teams:\n\n1. Do not start fine-tuning models during the hackathon. Solid prompt engineering + RAG will take you 90% of the way in 1/10th of the time.\n2. Build a reliable fallback flow for every LLM call so live demos never fail when rate limits strike.\n3. Polish the user onboarding — judges only spend 3-5 minutes evaluating your project.',
    link: 'https://github.com/rohaniyer/hack-ai-agent',
    likes: 76,
    comments: 9
  },
  {
    id: 'post-3',
    user: 'Sana Qureshi',
    userId: 'user-sana',
    role: 'Open Source Contributor',
    time: '1d ago',
    category: 'Achievement',
    text: 'Thrilled to share that our team took 1st Place at HackOut Global 2026! 🏆\n\nWe created "GuardianGuard", an automated developer tool that scans smart contracts and flags access control vulnerabilities before deployment. Massive thanks to the mentors and the Pixel Minds community for reviewing our architecture diagram at 2 AM.\n\nPreparing to open source the repository next week!',
    opp: 8,
    likes: 203,
    comments: 31
  },
  {
    id: 'post-4',
    user: 'Arjun Patel',
    userId: 'user-arjun',
    role: 'Full-stack Builder',
    time: '1d ago',
    category: 'Idea',
    text: 'Hackathon Project Pitch: An offline-first, peer-to-peer triage app for emergency response teams during natural disasters.\n\nWhen mobile cell towers collapse, local volunteers need to share critical resource coordinates without internet. Using local Wi-Fi direct and IndexedDB caching, field teams can sync dispatch queues seamlessly once back in range.\n\nLooking for collaborators interested in building this for the next civic tech hackathon!',
    likes: 94,
    comments: 18
  },
  {
    id: 'post-5',
    user: 'Priya Sharma',
    userId: 'user-priya',
    role: 'Product Designer & Builder',
    time: '2d ago',
    category: 'Experience',
    text: 'Six months ago I had never joined a hackathon because I thought you needed to be a 10x systems programmer. Last weekend our team shipped a working health accessibility prototype and won the Best UX track.\n\nTo any beginners hesitating: every team needs storytellers, problem framers, and intuitive designers. Jump in!',
    likes: 165,
    comments: 24
  }
];

