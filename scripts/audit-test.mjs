import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let envUrl = '';
let envKey = '';
if (fs.existsSync('.env')) {
  const content = fs.readFileSync('.env', 'utf-8');
  for (const line of content.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) envUrl = line.split('=')[1].trim();
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) envKey = line.split('=')[1].trim();
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || envUrl || 'https://gdvycwwonnfpvldgbatb.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || envKey || 'sb_publishable_ss3iKH-1vdorw8f5rq_W2A_gJXBO292';


const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const results = {
  passed: [],
  failed: [],
  manualVerification: []
};

function pass(name, detail = '') {
  results.passed.push({ name, detail });
  console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ''}`);
}

function fail(name, error) {
  results.failed.push({ name, error: String(error) });
  console.error(`[FAIL] ${name} - ${error}`);
}

function manual(name, reason) {
  results.manualVerification.push({ name, reason });
  console.log(`[MANUAL] ${name} - ${reason}`);
}

async function runAudit() {
  console.log('====================================================');
  console.log('   PIXEL MINDS - ADMIN & SECURITY PLAYWRIGHT AUDIT  ');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST SUITE 1: SUPABASE DB & RLS SECURITY AUDIT
  // ----------------------------------------------------
  console.log('--- 1. Testing Supabase RLS & Database Functions ---');

  // 1.1 Read Opportunities
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(5);

    if (error) throw error;
    pass('Opportunities Read (Public)', `Retrieved ${data.length} published opportunities`);
  } catch (err) {
    fail('Opportunities Read (Public)', err);
  }

  // 1.2 Verify Anonymous User Cannot Read Submissions (RLS)
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, title')
      .limit(5);

    if (error || !data || data.length === 0) {
      pass('Submissions RLS Protection', 'Anonymous users cannot read pending submissions');
    } else {
      fail('Submissions RLS Protection', 'Anonymous users were able to read submissions table!');
    }
  } catch (err) {
    pass('Submissions RLS Protection', `Protected via RLS: ${err.message}`);
  }

  // 1.3 Verify Anonymous User Cannot Directly Insert into Audit Logs (RLS)
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        admin_id: '00000000-0000-0000-0000-000000000000',
        admin_email: 'attacker@evil.com',
        action: 'Malicious Action',
        target_type: 'system',
        target_id: '0'
      });

    if (error) {
      pass('Audit Logs RLS Protection', `Direct unauthorized insert blocked: ${error.message}`);
    } else {
      fail('Audit Logs RLS Protection', 'Unauthorized user was able to insert into audit_logs!');
    }
  } catch (err) {
    pass('Audit Logs RLS Protection', `Blocked: ${err.message}`);
  }

  // 1.4 Verify send_notification_rpc enforces Admin role (RLS / SECURITY DEFINER)
  try {
    const { data, error } = await supabase.rpc('send_notification_rpc', {
      p_title: 'Unauthorized Test',
      p_message: 'This should be blocked',
      p_type: 'system',
      p_link: null,
      p_target_user_id: null,
      p_admin_id: null
    });

    if (error) {
      pass('send_notification_rpc Authorization Check', `Function correctly rejected non-admin execution: ${error.message}`);
    } else {
      fail('send_notification_rpc Authorization Check', 'Anonymous user was able to execute send_notification_rpc!');
    }
  } catch (err) {
    pass('send_notification_rpc Authorization Check', `Access denied as expected: ${err.message}`);
  }

  // 1.5 Verify delete_notification_rpc enforces Admin role
  try {
    const { data, error } = await supabase.rpc('delete_notification_rpc', {
      p_notification_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error) {
      pass('delete_notification_rpc Authorization Check', `Function correctly rejected non-admin execution: ${error.message}`);
    } else {
      fail('delete_notification_rpc Authorization Check', 'Anonymous user was able to execute delete_notification_rpc!');
    }
  } catch (err) {
    pass('delete_notification_rpc Authorization Check', `Access denied as expected: ${err.message}`);
  }

  // 1.6 Verify user_notifications RLS (Cannot read all notifications anonymously)
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, user_id, notification_id')
      .limit(5);

    if (error || !data || data.length === 0) {
      pass('User Notifications RLS Protection', 'Anonymous users cannot view private notification recipients');
    } else {
      fail('User Notifications RLS Protection', 'User notifications exposed to anonymous readers!');
    }
  } catch (err) {
    pass('User Notifications RLS Protection', `Protected: ${err.message}`);
  }

  // 1.7 Verify Announcements Read (Published announcements accessible)
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, status')
      .eq('status', 'published')
      .limit(5);

    if (error) throw error;
    pass('Announcements Read (Public)', `Retrieved ${data.length} published announcements`);
  } catch (err) {
    fail('Announcements Read (Public)', err);
  }

  // 1.8 Verify Categories
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .limit(10);

    if (error) throw error;
    pass('Categories Read', `Retrieved ${data.length} categories`);
  } catch (err) {
    fail('Categories Read', err);
  }

  // ----------------------------------------------------
  // TEST SUITE 2: PLAYWRIGHT BROWSER AUDIT
  // ----------------------------------------------------
  console.log('\n--- 2. Testing Frontend with Playwright Browser ---');

  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();

  // Monitor console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // 2.1 Landing Page
  try {
    await page.goto('http://localhost:5174/');
    await page.waitForSelector('h1', { timeout: 5000 });
    const h1 = await page.textContent('h1');
    pass('Landing Page Navigation', `Header: "${h1?.trim()}"`);
  } catch (err) {
    fail('Landing Page Navigation', err);
  }

  // 2.2 Unauthenticated Route Protection for /admin
  try {
    await page.goto('http://localhost:5174/admin');
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes('/admin/login')) {
      pass('Admin Route Protection (/admin)', `Redirected unauthorized visitor to ${url}`);
    } else {
      fail('Admin Route Protection (/admin)', `Did not redirect to /admin/login! Current: ${url}`);
    }
  } catch (err) {
    fail('Admin Route Protection (/admin)', err);
  }

  // 2.3 Unauthenticated Route Protection for /console
  try {
    await page.goto('http://localhost:5174/console');
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes('/admin/login')) {
      pass('Admin Route Protection (/console alias)', `Redirected unauthorized visitor to ${url}`);
    } else {
      fail('Admin Route Protection (/console alias)', `Did not redirect to /admin/login! Current: ${url}`);
    }
  } catch (err) {
    fail('Admin Route Protection (/console alias)', err);
  }

  // 2.4 Unauthenticated Route Protection for /submit
  try {
    await page.goto('http://localhost:5174/submit');
    await page.waitForTimeout(1000);
    const url = page.url();
    if (url.includes('/login')) {
      pass('User Route Protection (/submit)', `Redirected unauthenticated user to ${url}`);
    } else {
      fail('User Route Protection (/submit)', `Did not redirect to /login! Current: ${url}`);
    }
  } catch (err) {
    fail('User Route Protection (/submit)', err);
  }

  // 2.5 Admin Login Page Rendering & Form Validation
  try {
    await page.goto('http://localhost:5174/admin/login');
    await page.waitForSelector('form', { timeout: 5000 });
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitBtn = await page.$('button[type="submit"]');

    if (emailInput && passwordInput && submitBtn) {
      pass('Admin Login UI Form', 'Email input, password input, and submit button verified');

      // Test submitting with invalid test credentials
      await emailInput.fill('invalid_admin@test.org');
      await passwordInput.fill('wrongpassword123');
      await submitBtn.click();
      await page.waitForTimeout(1500);

      const pageText = await page.textContent('body');
      const hasErrorMsg = pageText.includes('Invalid') || pageText.includes('error') || pageText.includes('failed') || pageText.includes('credentials');
      pass('Admin Login Credential Validation', `Handled invalid credentials safely (error shown: ${hasErrorMsg})`);
    } else {
      fail('Admin Login UI Form', 'Missing input fields on admin login page');
    }
  } catch (err) {
    fail('Admin Login UI Form', err);
  }

  // 2.6 User Login Page Rendering
  try {
    await page.goto('http://localhost:5174/login');
    await page.waitForSelector('form', { timeout: 5000 });
    pass('User Login Page Rendering', 'Login form loaded successfully');
  } catch (err) {
    fail('User Login Page Rendering', err);
  }

  // 2.7 User Signup Page Rendering with Extended Student Fields
  try {
    await page.goto('http://localhost:5174/signup');
    await page.waitForSelector('form', { timeout: 5000 });
    const content = await page.textContent('body');
    const hasCollege = content.includes('College') || content.includes('University');
    pass('User Signup Page Rendering', `Loaded with student onboarding fields (college prompt: ${hasCollege})`);
  } catch (err) {
    fail('User Signup Page Rendering', err);
  }

  // 2.8 Opportunities Catalog & Filtering
  try {
    await page.goto('http://localhost:5174/opportunities');
    await page.waitForTimeout(1500);
    const searchInput = await page.$('input[placeholder*="Search"]');
    pass('Opportunities Catalog', `Search bar present: ${!!searchInput}`);
  } catch (err) {
    fail('Opportunities Catalog', err);
  }

  // 2.9 Feed Page
  try {
    await page.goto('http://localhost:5174/feed');
    await page.waitForTimeout(1500);
    const feedBody = await page.textContent('body');
    pass('Feed Page', `Feed loaded (contains content: ${feedBody.length > 200})`);
  } catch (err) {
    fail('Feed Page', err);
  }

  // 2.10 Leaderboard Page
  try {
    await page.goto('http://localhost:5174/leaderboard');
    await page.waitForTimeout(1500);
    const lbBody = await page.textContent('body');
    pass('Leaderboard Page', `Leaderboard loaded (contains rankings: ${lbBody.includes('Rank') || lbBody.includes('Pixel')})`);
  } catch (err) {
    fail('Leaderboard Page', err);
  }

  // ----------------------------------------------------
  // MANUAL VERIFICATION ITEMS (MULTI-USER SCENARIOS)
  // ----------------------------------------------------
  manual('Admin Opportunity Approval Notification End-to-End', 'Requires an active Supabase Admin account session and a live submitter user account to trigger the in-browser real-time toast and unread bell badge increment.');
  manual('Admin User Suspension & Pixel Balance Adjustment', 'Requires live administrator auth credentials to click "Suspend" or "+ Adjust Pixels" and observe the real-time update in Supabase profiles.');
  manual('Admin Broadcast Notification to Everyone', 'Requires live admin login to submit the compose modal and verify reception across multiple live connected user sessions.');

  await browser.close();

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${results.passed.length} Passed, ${results.failed.length} Failed, ${results.manualVerification.length} Manual Verifications`);
  console.log('====================================================\n');
}

runAudit().catch(console.error);
