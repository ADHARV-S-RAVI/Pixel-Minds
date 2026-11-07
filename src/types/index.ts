export type Role = 'user' | 'admin';
export type OpportunityStatus = 'draft' | 'pending' | 'published' | 'approved' | 'rejected' | 'expired' | 'archived';

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  pixels: number;
  status: 'active' | 'suspended';
  bio?: string;
  opportunitiesShared: number;
  approvedSubmissions: number;
  referrals: number;
  contributions: number;
  badges: string[];
  referralId: string;
  college?: string;
  course?: string;
  yearOfStudy?: string;
  branch?: string;
  createdAt: number;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  organizer: string;
  deadline: number;
  startDate: number;
  endDate: number;
  location: string;
  mode: 'online' | 'offline' | 'hybrid';
  prize?: string;
  stipend?: string;
  eligibility: string;
  teamSize?: string;
  skills: string[];
  imageUrl?: string;
  officialUrl: string;
  status: OpportunityStatus;
  views: number;
  applyClicks: number;
  shares: number;
  source?: 'admin' | 'user';
  featured?: boolean;
  additionalInfo?: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  adminNotes?: string;
  reviewedBy?: string;
  opportunityId?: string;
  submitterName?: string;
  submitterEmail?: string;
}

export interface AppNotification {
  id: string; // user_notification id
  notificationId: string;
  title: string;
  message: string;
  type: 'offer' | 'opportunity' | 'announcement' | 'reminder' | 'community' | 'referral' | 'pixel' | 'system';
  link?: string | null;
  isRead: boolean;
  readAt?: number | null;
  createdAt: number;
}

export interface PixelTransaction {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  type: 'earn' | 'spend' | 'adjustment';
  createdAt: number;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referralCode?: string;
  pixelsRewarded?: number;
  opportunityId?: string | null;
  status?: 'pending' | 'completed' | 'rejected';
  referredUserName?: string;
  referredUserEmail?: string;
  referredUserAvatar?: string;
  opportunityTitle?: string;
  createdAt: number;
}

export interface Report {
  id: string;
  opportunityId?: string;
  targetType?: 'opportunity' | 'post';
  targetId?: string;
  targetTitle?: string;
  targetContent?: string;
  reporterId: string;
  reporterName?: string;
  reporterEmail?: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  adminNotes?: string;
  resolvedBy?: string;
  createdAt: number;
}

export interface RewardConfig {
  shareOpportunity: number;
  submitOpportunity: number;
  approvedOpportunity: number;
  referralSignup: number;
  validReport: number;
  dailyActivity: number;
  profileCompletion?: number;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'opportunity' | 'user' | 'reward_config' | 'announcement' | 'post' | 'pixel';
  targetId: string;
  reason?: string;
  previousValue?: any;
  newValue?: any;
  createdAt: number;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  startDate: number;
  endDate: number;
  status: 'published' | 'draft' | 'archived';
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface AdminSentNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  createdBy: string | null;
  createdAt: number;
  recipientsCount: number;
  targetDescription: string;
}

export interface CommunityPost {
  id: string;
  user: string;
  userId: string;
  role: string;
  time: string;
  text: string;
  category?: string;
  likes: number;
  comments: number;
  opp?: string | number;
  link?: string;
  imageUrl?: string;
  source: 'admin' | 'user';
  status: 'published' | 'draft' | 'archived';
  featured?: boolean;
  createdAt: number;
}

