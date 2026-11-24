-- Migration: Add 19 verified Unstop Opportunities
BEGIN;
ALTER TABLE public.opportunities DISABLE TRIGGER trg_opportunity_rate_limit;
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Project Jupyter',
    'All that you need to know about Project Jupyter

Event Overview

Purpose:

Project Jupyter brings together developers, designers, and problem-solvers to build  innovative solutions using Artificial Intelligence and Machine Learning . The event encourages participants to develop creative and impactful projects that address real-world challenges across various domains such as healthcare, education, environment, sustainability, smart cities, and social welfare.

Participants are free to work on  any project idea or problem statement , whether it is a global challenge or a local community problem they have identified. The key focus is to create  technology-driven solutions with AI/ML integration  that demonstrate innovation and practical impact.

Goal:

To develop  AI/ML-powered projects and intelligent systems  that solve real-world problems, promote technological innovation, and showcase practical applications of emerging technologies.

Why You Should Join

Collaborate:

Work alongside innovators, developers, and designers who are passionate about building  cutting edge AI and ML based solutions .

Mentorship:

Gain valuable insights and guidance from  industry experts and mentors  in the fields of Artificial Intelligence, Machine Learning, and software development.

Recognition & Prizes:

The best projects will be  featured and rewarded with exciting prizes , along with opportunities for further development and exposure.

Impact:

Your solution could contribute to  real-world change  by solving meaningful problems through technology.

How to Get Involved

Register Now:

Don’t miss the opportunity to be part of a community of innovators working on  AI-driven projects and impactful technological solutions.

Stages & Timelines:
• Idea Pitching Round (Mar 05, 2027 - Mar 07, 2027): This is a submission round. Participants must submit a PPT of their idea.

Note: Clearly mention the problem statement in the PPT.

• Hackathon (Mar 08, 2027 - Mar 10, 2027): Selected teams from the qualification round will participate in the hackathon. The project presentations will be conducted via WhatsApp, and winners will be announced after the final evaluation. 🚀',
    'Hackathons',
    'Army Institute of technology, Pune (SOLUTIONS 2K27)',
    '2027-03-01T00:00:00+05:30'::timestamptz,
    '2026-11-07T00:00:00+05:30'::timestamptz,
    '2027-03-10T12:00:00+05:30'::timestamptz,
    'online',
    'Online',
    'Top 3: ₹30,000',
    NULL,
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Artificial Intelligence (AI)', 'Machine Learning Concepts', 'Problem Solving', 'Creative Thinking', 'Collaboration Skills']::text[],
    'https://unstop.com/hackathons/project-jupyter-solutions-2k27-army-institute-of-technology-pune-1799762',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1794029791.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/hackathons/project-jupyter-solutions-2k27-army-institute-of-technology-pune-1799762',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/hackathons/project-jupyter-solutions-2k27-army-institute-of-technology-pune-1799762' OR title = 'Project Jupyter'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Poster Presentation',
    'December 05th, 2026

Location:  GM University, Davangere

Event Participation & Benefits:

We are excited to welcome all participants to IGNITRON 2K26. Here are some important details regarding registration and accommodations:

Registration Fee:  ₹500

Accommodation:

For participants arriving from outside Davangere, accommodation will be arranged on a payable basis to ensure a comfortable stay. The accommodation details and payment link will be shared with the selected participants at the appropriate time. Teams are requested to fill out the accommodation form promptly once it is released.

Payment Link:   Event Registration | GM University

Important Note:

You must first complete the registration process through the official Unstop platform.

Participants must follow the rules and regulations specified by the organizing team.

For any queries, feel free to reach out to our team.

We look forward to seeing you at IGNITRON 2K26!

Event Schedule:

Day 1: December 03, 2026:

Code Rush – 24-Hour Hackathon: 02:00 PM – 02:00 PM (Next Day)

ModelQuest: 02:00 PM – 05:00 PM

CTF (Capture The Flag): 02:00 PM – 05:00 PM

Robo Race: 02:00 PM – 05:00 PM

IgniteX Debate: 02:00 PM – 05:00 PM

Market Mavericks: 02:00 PM – 05:00 PM

Law Debate: 02:00 PM – 05:00 PM

PharmaNova: 02:00 PM – 05:00 PM

Wallstreet Warriors: 02:00 PM – 05:00 PM

Prompt to Prototype 2K26: 02:00 PM – 05:00 PM

Day 2: December 04, 2026:

Tech Thesis: 10:00 AM – 05:00 PM

PixelCraft: 10:00 AM – 12:30 PM

Ideathon: 10:00 AM – 12:30 PM

Engineer''s Eye: 02:00 PM – 05:00 PM

Circuit Debugging: 10:00 AM – 12:30 PM

Robo Sumo: 03:00 PM – 05:00 PM

Food Tech: 02:00 PM – 05:00 PM

Finnovate: 10:00 AM – 05:00 PM

Startathon: 10:00 AM – 12:30 PM

Bio Ventures: 10:00 AM – 12:30 PM

Prompt to Prototype 2K26: 10:00 AM – 12:30 PM

Electriva: 02:00 PM – 05:00 PM

Card Structure: 10:00 AM – 12:30 PM

Nextwave – Paper Presentation: 02:00 PM – 05:00 PM

Cloud Nex: 10:00 AM – 05:00 PM

Day 3: December 05, 2026:

Line Follower: 09:00 AM – 12:30 PM

Coding Collab: 09:00 AM – 12:30 PM

Poster Presentation: 09:00 AM – 12:30 PM

Myth Busters: 09:00 AM – 12:30 PM

About Poster Presentation:

Poster Presentation  is a creative and knowledge-sharing event that provides participants with a platform to present their innovative ideas, research findings, and technical concepts through visually engaging posters. It encourages participants to explore interesting topics, organize information effectively, and communicate complex ideas in a clear and attractive manner. Through poster designing and presentation, participants get an opportunity to showcase their creativity, subject knowledge, research skills, and communication abilities. The event promotes innovation, visual communication, critical thinking, creativity, and the ability to present ideas effectively.',
    'Competitions',
    'GM University Davanagere (IGNITRON 2K26)',
    '2026-11-30T23:59:00+05:30'::timestamptz,
    '2026-11-11T18:30:00+05:30'::timestamptz,
    '2026-11-30T23:59:00+05:30'::timestamptz,
    'offline',
    'Davangere, Karnataka',
    'Winner: ₹6,000, Runner-Up: ₹3,000',
    NULL,
    NULL,
    '2 Members',
    ARRAY['Public Speaking and Presentation Skills', 'Presentation Design', 'Research Skills', 'Visual Storytelling', 'Creative Thinking']::text[],
    'https://unstop.com/o/crhVIZz',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6aedb50108af7_poster-presentation.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/poster-presentation-ignitron-2k26-gm-university-davanagere-1795501',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/crhVIZz' OR title = 'Poster Presentation'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Startup Idea Pitching',
    'Startup Idea Pitching – Vadodara Startup Festival 7.0

One Idea Could Be the Beginning of Something Big!

Have an innovative idea that solves a real-world problem? Are you ready to transform your idea into a scalable startup?

Vadodara Startup Festival 7.0, powered by Parul Innovation & Entrepreneurship Research Centre (PIERC), brings you an exciting opportunity to present your entrepreneurial ideas, receive expert guidance, and take your first step towards building a successful venture.

Startup Idea Pitching is designed to identify promising innovations, encourage entrepreneurial thinking, and connect aspiring founders with funding and incubation opportunities.

Why Participate?

Turn your innovative idea into an opportunity with:

10 Guaranteed Funding Opportunities:  Opportunities to secure funding of up to ₹2.5 Lakhs.

25 Direct Incubation Opportunities:  A chance to receive incubation support through PIERC.

Expert Evaluation:  Present your idea before an expert jury and industry professionals.

Startup Mentorship:  Gain valuable insights and guidance to develop your business idea.

Entrepreneurial Networking:  Connect with innovators, entrepreneurs, mentors, and startup ecosystem stakeholders.

Five Innovation Themes

Participants are encouraged to present innovative solutions addressing real-world challenges across the five innovation themes announced by the organizers.

Ideas should demonstrate innovation, feasibility, scalability, and potential impact.

Eligibility Criteria

Open to aspiring entrepreneurs, innovators, students, and startup enthusiasts.

Individuals or teams can participate.

Teams must consist of 1–8 members.

Participants must submit an original and innovative idea.

Ideas should address a genuine problem and demonstrate potential for practical implementation.

Previously developed ideas may be presented if participants have the necessary rights and ownership.

Competition Process

Stage 1 – Online Registration

Register through the official registration form and provide the required participant and idea details.

Stage 2 – Idea Submission

Submit your startup idea, problem statement, proposed solution, target audience, and business potential.

Stage 3 – Idea Evaluation

Submitted ideas will be evaluated based on innovation, problem-solving ability, feasibility, scalability, and potential impact.

Stage 4 – Final Pitching

Shortlisted participants will present their ideas before the jury during Vadodara Startup Festival 7.0.

Stage 5 – Funding & Incubation Opportunities

Selected participants will be considered for funding opportunities of up to ₹2.5 Lakhs and direct incubation support through PIERC, subject to the applicable selection and evaluation process.

Evaluation Criteria

Ideas will be evaluated on the following parameters:

Innovation and Originality

Problem Identification and Relevance

Proposed Solution and Effectiveness

Technical and Business Feasibility

Market Potential and Scalability

Social, Economic or Environmental Impact

Presentation and Clarity

Event Details

Event:  Vadodara Startup Festival 7.0

Competition:  Startup Idea Pitching

Date:  20 December 2026

Organized by:  Parul Innovation & Entrepreneurship Research Centre (PIERC), Parul University

Official Website:   https://vsf.pierc.org

Important Instructions

Participants must provide accurate registration information.

Ideas submitted must be original or legally owned by the participants.

Participants should ensure that their submissions are complete.

Shortlisted participants must follow the presentation guidelines communicated by the organizers.

Selection for funding and incubation will be based on the prescribed evaluation process and applicable terms.

The organizers reserve the right to make decisions regarding eligibility, evaluation, and selection.

Take Your First Step Towards Entrepreneurship!

Your idea deserves a platform. Your innovation deserves an opportunity.

Register now and pitch your vision at Vadodara Startup Festival 7.0!',
    'Competitions',
    'Parul University (PU), Vadodara',
    '2026-12-20T00:00:00+05:30'::timestamptz,
    '2026-11-18T00:00:00+05:30'::timestamptz,
    '2026-12-20T00:00:00+05:30'::timestamptz,
    'online',
    'Online',
    'Win funding up to ₹2.5 Lakhs, direct incubation support, expert mentorship and recognition!',
    NULL,
    NULL,
    '1 Member',
    ARRAY['Public Speaking and Presentation Skills', 'Innovation Management', 'Technical and feasibility studies', 'Business Planning', 'Problem Solving']::text[],
    'https://unstop.com/o/gOFSZVo',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1794981922.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/startup-idea-pitching-parul-university-pu-vadodara-1817447',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/gOFSZVo' OR title = 'Startup Idea Pitching'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Startup Expo 2027',
    'Attend:

Showcase your products or services to key stakeholders.

Pitch your startup’s unique value proposition to Incubators, Investors, accelerators, and VC firms.

Build connections with accelerators, mentors, and incubators.

Gain valuable insights through expert panel discussions.

Secure funding, collaborations, and visibility in the startup ecosystem.

Participation Opportunities:

Startup Display Booths: Exhibit your product or service.

Networking & Matchmaking: Connect directly with VCs, accelerators, and incubators.

Expert Panel Discussions: Learn from seasoned entrepreneurs and industry veterans.

Guidelines:

Eligibility:

Open to Startups from all sectors.

Startups in the prototype, launch, or revenue-generating stages are encouraged to participate.

Student-led startups and aspiring entrepreneurs are strongly encouraged to apply.

Whether you’re just getting started or already scaling your venture, all innovators and founders are welcome to apply.

Event Format:

Startup Display Booths: Interact with investors and other key players.

Networking & Matchmaking: Exclusive opportunities to connect with stakeholders.

Expert Panel Discussions: Hear from experienced entrepreneurs and mentors.

Team Composition:

Teams can consist of 1-4 members.

Members can be from different colleges or areas of specialization.

Competition Rounds:

Round 1: Basic Details + Pitch Deck Submission:

Submit startup details and a comprehensive pitch deck.

Provide your DPIIT Registration Number (if applicable).

Submission Deadline: 30th November 2026.

Shortlisting Criteria: Innovation, scalability, and market potential.

Round 2: Virtual Pitching Round:

Deliver a 3-minute virtual pitch followed by a 2-minute Q&A session.

Shortlisting Criteria: Clarity, presentation quality, and responsiveness.

From 3rd December 2026 to 10th December 2026.

Round 3: Finals:

Finalists will present live at  IIT Guwahati  on  24th January 2027.

Highlights from Previous Years:

Samarth Gudwala (Chiratae Capital)

Ujjawala Darvemula (Palastree Capital)

Sahil Kumrah (growX Ventures)

Nava Boro (Cocreate Ventures)

Fahrina Akhtara Khatun (BioNest IASST)

Bula Choudhury (Guwahati Biotech Park)

Rahul Narvekar (Founder & CEO, India Network)

Bhanu Prakash Reddy Varla(Partner & Director - Plural Technology Pvt Ltd)

Vivaswan Bhattacharya(Incuboo Ventures)

Kalyanjit Hatibaruah (Angel Investor, Mumbai Angels Network)

Kankan J (Project Manager, Ernst & Young)

Nikhil Rajput (Executive Director, YVC Ventures)

Pankaj Gogoi (Founder & CEO, Redlemon Ventures)

Srinidhi Reddy(T Hub)

Rules:

All startups must submit pitch decks during registration.

Only shortlisted startups will receive booth spaces.

Timely adherence is critical; missing time slots will result in disqualification.

Ethical practices are mandatory; violations lead to immediate disqualification.

Evaluation Process :

Initial Screening: Based on pitch decks.

Virtual Pitch Round: Live virtual presentations.

Final Round: Comprehensive evaluation during the in-person event.

NOTE: Accommodation will be provided in the IIT Guwahati Campus under nominal charges. Founders will have the opportunity to engage with investors, incubators, and accelerators during a dedicated networking lunch.

Stages & Timelines:
• Pitch deck Screening (Oct 30, 2026 - Nov 30, 2026): Submit startup details and a comprehensive pitch deck.

Provide your DPIIT Registration Number (if applicable).

Submission Deadline: 30th November 2026.

Shortlisting Criteria: Innovation, scalability, and market potential.

• Virtual Pitching Round (Dec 03, 2026 - Dec 10, 2026): Deliver a 3-minute virtual pitch followed by a 2-minute Q&A session. Shortlisting Criteria: Clarity, presentation quality, and responsiveness. From 3rd December 2026 to 10th December 2026.

• Final Round - Offline (at IIT Guwahati in UDGAM 2026) (Jan 24, 2027 - Jan 24, 2027): Finalists will present live at IIT Guwahati on 24th January 2027.',
    'Competitions',
    'Indian Institute of Technology (IIT), Guwahati',
    '2026-11-30T23:59:33+05:30'::timestamptz,
    '2026-10-30T00:00:00+05:30'::timestamptz,
    '2027-01-24T23:59:59+05:30'::timestamptz,
    'offline',
    'Guwahati, Assam',
    'Prizes worth 1.5 Lakhs+',
    NULL,
    NULL,
    '1 - 4 Members',
    ARRAY['Public Speaking and Presentation Skills', 'Persuasive Speaking', 'Presentation Design', 'Business development', 'Stakeholder Engagement', 'Communication Skills', 'Teamwork and Collaboration', 'Networking (LinkedIn)', 'Business Acumen', 'Business Planning']::text[],
    'https://unstop.com/o/9F38EsV',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6b03e77c31331_startup-expo-2027.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/startup-expo-2027-iit-guwahati-1786688',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/9F38EsV' OR title = 'Startup Expo 2027'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Ethon',
    'Details:

"Ethon" is a two-round event encompassing 1st online round and 2nd offline round.

A mandatory team of 2 people is required for participation.

Participants will receive five themes (problem statements) for their PPT and must devise and implement their solutions, condensing their ideas into a maximum of 6 slides.

In the first round, PPT submissions are to be emailed to the mail (by 3rd March 2027, 11:59PM).

Qualifying teams will be invited for offline PPT presentations.

Each presentation is limited to a maximum of 10 minutes.

Evaluation criteria include:

Innovation

Uniqueness

Ease of Implementation

Quality of The Presentation.

Stages & Timelines:
• Online PPT Submission (Mar 01, 2027 - Mar 02, 2027): PPT submissions are to be emailed to the mail (by 3rd March 2027, 11:59PM).

• Offline Round (Mar 05, 2027 - Mar 05, 2027): Offline or on-campus round.',
    'Hackathons',
    'Army Institute of technology, Pune (SOLUTIONS 2K27)',
    '2027-03-01T00:00:00+05:30'::timestamptz,
    '2026-11-07T00:00:00+05:30'::timestamptz,
    '2027-03-05T14:00:00+05:30'::timestamptz,
    'offline',
    'Pune, Maharashtra',
    'Top 3: ₹6,000',
    NULL,
    NULL,
    '2 Members',
    ARRAY['PowerPoint', 'Presentation Design', 'Creativity', 'Problem Solving', 'Teamwork and Collaboration']::text[],
    'https://unstop.com/o/mVTRuvs',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1794038216.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/hackathons/ethon-solutions-2k27-army-institute-of-technology-pune-1799758',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/mVTRuvs' OR title = 'Ethon'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Mondelēz Maestros 2026 - Commercial Track',
    'Mondelēz India  is back with its unique B-School Business Challenge for future leaders! This challenge will spark your creativity, pump up your adrenaline, and have you strategizing to crack snacking mysteries—infusing your unique twist, vibrant flair, and irresistible flavor along the way!

If purpose-driven brands, iconic campaigns, and the bold minds behind game-changing innovations ignite your passion, then this competition is your perfect playground!

Eligibility Criteria:

The competition is open for second-year students of the full-time flagship two-year MBA/PGDM program of select B-Schools who have an interest in Sales and Marketing. Please refer to the list of the eligible colleges below:

Faculty of Management Studies (FMS), University of Delhi, New Delhi

Indian Institute of Management (IIM), Ahmedabad

Indian Institute of Management (IIM), Bangalore

Indian Institute of Management (IIM), Calcutta

Indian Institute of Management (IIM), Indore

Indian Institute of Management (IIM), Kozhikode

Indian Institute of Management (IIM), Lucknow

Management Development Institute (MDI), Gurgaon

SP Jain Institute of Management and Research (SPJIMR), Mumbai

Xavier School of Management (XLRI)

Rules:

The team members must be from the same college, and they can be a mix of students from different specializations.

Team Size:  3 Members

All the team members must register before registration closes and must form teams before the specified date ( 13th December 2026  , 23:59 IST ).

Changing teams will not be allowed after the stipulated date.

One person can only be part of one team.

Every team should come up with a team name while registering for the competition.

The emphasis for the evaluation of the solutions presented will be on the uniqueness of the idea, rationale, or data supporting the idea.

Competition Stages:

Maestros Unfiltered:  Participants bring Mondelēz to life on LinkedIn with creative, brand-led content using custom hashtags. This eliminatory round gives the Top 3 most-engaged posts a fast-track entry to the Detailed Submission Round!

Detailed Submission Round:

You’ve thought about your big idea. Now it’s time to take it to the next level!

Build on your solution and show us how your idea can translate into real business impact. Strengthen your proposal with market insights, consumer understanding, a clear action plan and the potential impact of your recommendations.

Here’s what you need to submit:

An 8–10-slide presentation (PDF) detailing your solution.

A video presentation (MP4) of up to 5 minutes.

Maximum video file size: 20 MB.

Use relevant research, consumer insights, surveys or visual aids to support your recommendations and demonstrate how your idea can work in the real world.

Go beyond the idea. Show us how you’d make it happen!

Grand Finale:

This is where the best ideas take centre stage!

The Top 10 teams will earn their place at the on-ground Grand Finale, where they’ll have 10 minutes to pitch their solutions and demonstrate what makes their ideas stand out.

Bring your strategy, confidence and commercial thinking to the forefront as you present your vision.

The stage is set. The spotlight is yours. Make it count!

Prizes & Rewards:

Pre-Placement Interview (PPI):  Pre Placement Interview opportunity will be provided to all the members of the Top 3 Teams!

Cash Prize:  Cash Prize of INR 5,00,000 will be given to the winning team

Cash Prize:  Cash Prize of INR 2,00,000 will be given to the First runners-up team

Cash Prize:  Cash Prize of INR 1,50,000 will be given to the Second runners-up team

Top 3 Posts  in Maestros Unfiltered get an exclusive Mondelēz Hamper!

Stages & Timelines:
• Maestros Unfiltered (Nov 18, 2026 - Dec 20, 2026): Participants showcase their creativity by bringing Mondelēz brands to life on LinkedIn through engaging, brand-inspired content using custom hashtags. In this round, the Top 3 posts with the highest engagement will win an exclusive hamper from Mondelēz!

Make sure to include  #Mondelez #Maestros #Unstop  in your posts to ensure your content is recognised and considered during the evaluation process. Let your creativity shine and make every post count!

• STAGE 1: Share your BIG Idea! (Nov 18, 2026 - Dec 20, 2026): You will be required to submit a 8-10 Slider Deck and 5-minute video solution. Submission Format: PDF and Audio Visual (.MP4) (duration: max 5 minutes, file size: max 20 MB). In your video, please provide more information about your idea. Focus on action plans, potential market analysis, any surveys you conducted with consumers, and anything else you think will help explain the feasibility and impact of your idea. It would be great if you could include visual aids in the video as well.

• STAGE 2: Grand Finale (Jan 19, 2027 - Jan 19, 2027): The top 10 teams will qualify for this round and will be invited for the On-Ground Grand Finale. Each team will be given 10 minutes to pitch their ideas.',
    'Competitions',
    'Mondelēz International (Mondelēz Maestros 2026)',
    '2026-12-13T23:59:37+05:30'::timestamptz,
    '2026-11-17T12:00:37+05:30'::timestamptz,
    '2027-01-19T18:00:57+05:30'::timestamptz,
    'online',
    'Online',
    'Winner: ₹500,000, First Runner Up: ₹200,000, Second Runners-Up: ₹150,000',
    NULL,
    'Postgraduate, Management',
    '3 Members',
    ARRAY['Brand Strategy', 'Consumer Behavior Analysis', 'Marketing Communications', 'Market Research Methods', 'Public Speaking and Presentation Skills', 'Presentation', 'Market Analysis', 'Communication', 'Teamwork', 'Marketing']::text[],
    'https://unstop.com/o/0L7Hpzh',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6afad5c787b04_mondelez-maestros-2026-commercial-track.jpg',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/crp-mondelez-maestros-2026-commercial-track-mondelez-maestros-2026-mondelez-international-1813372',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/0L7Hpzh' OR title = 'Mondelēz Maestros 2026 - Commercial Track'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Technova 2027',
    'Technova 2027 – Startup-First Hackathon

Think. Build. Innovate. Pitch.

Technova 2027 is an 8-hour startup-first hackathon organized by Burhani College, Mumbai. It is designed to bring together creative thinkers, developers, innovators, and aspiring entrepreneurs to solve real-world problems through technology.

Unlike traditional hackathons, TECHNOVA focuses not only on building applications but also on developing practical solutions with business potential. Participants will be challenged to think like startup founders, build a functional Minimum Viable Product (MVP), and present their ideas effectively.

Event Details:

Event:  Technova 2027

Date:  09 January 2027

Duration:  8 Hours

Venue:  Burhani College, 10 Nesbit Road, Mazgaon, Mumbai, Maharashtra – 400010

Team Size:  2–4 Participants

Format:  Startup-First Hackathon

Eligibility & Team Rules:

Each Team Must Have a Minimum of 2 and A Maximum of 4 Participants.

Solo Participation Is Not Allowed.

Cross-College Teams Are Allowed and Encouraged.

Each Participant Can Be Part of Only One Team.

Teams Must Be Finalized Before the Event.

Team Switching During the Hackathon Is Not Permitted.

Team Members Cannot Be Changed Later than 2 Days Before the Event.

Every Participant Must Carry a valid government-issued ID proof and college ID card.

Registration & Selection Process:

Registration Will Be Conducted Through the Official Unstop Opportunity.

Participants Must Provide Accurate Details of All Team Members.

Linked in Profile Links Must Be Submitted as Part of The Registration Process.

Participation Is Subject to Limited Slots.

If Registrations Exceed the Available Capacity, Teams Will Be Shortlisted Based on Their Linked in Presence and Submitted Profiles.

Selection Will Follow a First-Come, First-Served Approach, Subject to Linked In-Based Shortlisting and Available Slots.

Registration Does Not Guarantee Selection.

Only Approved and Confirmed Teams Will Be Eligible to Participate.

Hackathon Format – Color-Based Challenge System:

Technova Introduces a Unique Color-Based Problem Allocation System.

Participants Select One of Five Available Colors.

Each Team Receives a Corresponding Colored Wristband During Registration at The Venue.

A Problem Set Will Be Assigned Based on The Selected Color and Revealed Later.

Each Team Must Choose One Problem Statement from Its Assigned Set.

Teams Work on Developing an Mvp and Preparing Their Final Pitch.

This System Promotes Fairness, Creativity, and Equal Opportunities for All Teams.

Challenge Tracks:

Participants Will Work on Problem Statements from One of The Following Five Tracks:

Digital Trust:  verify Before You Believe

Money & Markets:  make Finance Work for Everyone

From Soil to Shelf:  rethink the Food Chain

Technology without Barriers:  build for Every Ability

Ai that Gets Things Done:  move Beyond Chatbots

️ Build Rules:

All Project Development Must Take Place During the Hackathon.

Pre-Built Projects Are Strictly Prohibited.

Open-Source Tools and Ai Tools Are Allowed.

Plagiarism and Copying Are Not Permitted.

Teams Must Develop Their Solutions According to Their Selected Problem Statement.

Participants Must Maintain Professional and Respectful Conduct.

Submission Requirements:

Every Team Must Submit:

Git Hub Repository:  complete Project Source Code.

Pitch Deck (ppt):  explanation of The Problem, Solution, Business Model, and Project Value.

Demo / Prototype:  a Working Demonstration of The Developed Solution.

Note:  submission Deadlines and Formats Are Strict. No Extensions or Exceptions Will Be Provided.

Judging Criteria:

Projects Will Be Evaluated on The Following Parameters:

MVP Quality – Does the Solution Actually Work?

Innovation & Creativity – Is the Idea Fresh and Innovative?

Technical Execution – Is the Solution Functional, Clean, and Scalable?

Problem Clarity – Does It Solve a Real-World Problem?

Market Feasibility – Would People Actually Use It?

Revenue Potential – Can It Become a Sustainable Business?

Presentation & Pitch – how Effectively Is the Idea Communicated?

Tentative Event Schedule

Time

Activity

7:00 Am

Registration & Wristband Selection

9:00 Am

Opening & Orientation

9:30 Am

Hackathon Begins

10:00 Am

Brunch

12:30 Pm

Mentorship Round

4:00 Pm

Submission Opens

4:30 Pm

Final Mentor / Judging Round

5:15 Pm

Early Dinner

5:30 Pm

Top 5 Teams Announced

5:45 Pm

Final Demo for Top 5

7:00 Pm

Winner Declaration & Closing Ceremony

The Schedule Is Tentative and Subject to Changes on The Event Day.

What to Bring?

Laptop – Mandatory

Valid College Id Card – Mandatory

Government-Issued Id Proof – Mandatory

Laptop Charger – Recommended

Personal Water Bottle – Recommended

️Disqualification Conditions:

Teams May Be Disqualified For:

Using Pre-Built Projects.

Presenting Fake Demos.

Missing Submission Deadlines.

Plagiarism or Copying.

Violating the Code of Conduct.

Sabotaging Other Teams.

Being Absent During Mandatory Demo or Mentoring Sessions.

Contact Information

For Queries and Assistance:

Email:   Technovasupport9@gmail.Com

Organized By:  burhani College, Mumbai

Don''t Just Build an Application. Build a Solution. Think Like a Founder. Make an Impact.

See you at TECHNOVA 2027!

Stages & Timelines:
• Application Screening (Oct 31, 2026 - Jan 06, 2027): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.',
    'Hackathons',
    'Burhani College, Mumbai',
    '2027-01-06T12:00:00+05:30'::timestamptz,
    '2026-10-31T00:00:00+05:30'::timestamptz,
    '2027-01-06T12:00:00+05:30'::timestamptz,
    'offline',
    'Mumbai, Maharashtra',
    NULL,
    NULL,
    NULL,
    '2 - 4 Members',
    ARRAY['Product Strategy', 'Public Speaking and Presentation Skills', 'Software Development Life Cycle (SDLC)', 'Teamwork and Collaboration', 'Git Version Control']::text[],
    'https://unstop.com/o/3HTCQaM',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6aeb87fd25374_technova-2027.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/hackathons/technova-2027-burhani-college-mumbai-1786992',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/3HTCQaM' OR title = 'Technova 2027'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Project Elevate: Young Business Strategists',
    'Can you think like a business strategist?

The Business Think Tank Challenge is an  online entrepreneurship and business problem-solving competition  organised by Project Elevate.

Participants will be presented with five problem statements based on real-world situations. They must analyse each situation, identify the underlying challenges and develop well-reasoned solutions.

The competition aims to develop entrepreneurial thinking, business awareness, and creativity among young learners.

1. Eligibility

Students from all academic streams and specialisations are welcome.

Participants should register individually

Team members must belong to the same competition category.

2. Competition Format

The competition will be conducted entirely online and will follow a submission-based format.

After successful registration, participants will receive:

Five business problem statements covering different entrepreneurial and business challenges.

A structured response template to record their analysis and proposed solutions.

Submission instructions and relevant guidelines.

Participants must select  any 1 problem statement  and complete their responses using the prescribed template.

Submission requirements:

Participants may submit their completed work in PDF format.

Only one final submission is permitted.

3. Timeline and Duration

Competition materials: Shared after successful registration.

Submission deadline: December 15th

Evaluation and results: Announced after the submission window closes.

4. Judging Criteria

Submissions will be evaluated on the following parameters:

Criteria

Weightage

Problem analysis

20%

Creativity and originality

30%

Practicality of proposed solutions

30%

Clarity and presentation

20%

Total

100%

The decision of the judges and organisers will be final.

5. Rules and Regulations

Participants must provide accurate registration details.

Plagiarism, copying another participant''s work or submitting previously published work as original work is prohibited.

AI tools may be used for research and brainstorming assistance, but participants must disclose their use. The final analysis, reasoning and recommendations must reflect the participants'' own understanding.

Participants must cite external sources, data and references used in their submissions.

By registering, participants agree to abide by the competition guidelines.

6. Awards and Recognition

Winner

Most creative solution

Digital participation certificates for eligible participants.

Digital certificates for winners and special award recipients.

7. Important Information

The competition is conducted entirely online.

The organisers reserve the right to make reasonable changes to the competition schedule, subject to communicating such changes to registered participants.

Stages & Timelines:
• Submission through Unstop (Nov 21, 2026 - Dec 10, 2026): Submission Guidelines:

1. Your presentation must not exceed 10 slides in total, including the cover page

2. Ensure that your submission reflects your own thinking and ideas

3. Submit your final presentation in PDF format

4. Submission deadline - 10th of December, 2026

Download the Case Study

You can access and download the competition case studies here: https://elevateskill.co.in/competitions/

Stay Connected for Updates! Follow Project Elevate on Facebook and Instagram to stay updated on competition announcements, important dates, submission reminders and results.',
    'Competitions',
    'Project Elevate',
    '2026-12-10T00:00:00+05:30'::timestamptz,
    '2026-11-18T16:40:00+05:30'::timestamptz,
    '2026-12-10T10:53:00+05:30'::timestamptz,
    'online',
    'Online',
    'Digital certificates for winners and special award recipients; Digital participation certificates for eligible participants.',
    NULL,
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Creativity', 'Problem Solving', 'Business Acumen', 'Creative Thinking', 'Critical Thinking', 'Written Communication']::text[],
    'https://unstop.com/o/iT50YRc',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1795007718.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/project-elevate-young-business-strategists-project-elevate-1817828',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/iT50YRc' OR title = 'Project Elevate: Young Business Strategists'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Indiapreneur 16.0',
    'All that you need to know about Indiapreneur 16.0-National Level Business Plan Competition !

IndiaPreneur 16.0 – Dare to Dream (Overview):

Flagship national entrepreneurship competition by IGI Group & Indira University

Encourages bold, innovative, high-impact business ideas

Participants develop, refine, and pitch their startup concepts to industry experts

Supported by Swakiyam Centre for Incubation & Innovation

Platform to showcase entrepreneurial vision and create real-world impact

Eligibility:

Open to all undergraduate and postgraduate students

Rewards:

Winner: ₹100,000

1st Runner-Up: ₹60,000

2nd Runner-Up: ₹40,000

Perks:

Professional mentoring from industry experts and entrepreneurs

Feedback from investors and seasoned founders

Skill development through workshops and sessions

Access to potential investors for idea funding

Registration:

Open from October 21 , 2026, to December 31, 2026

Submission required: Problem statement + Business Model Canvas (PDF)

Judging Criteria:

Desirability – solves a real problem

Feasibility – can be developed/produced

Viability – financially sustainable

Market potential – large and growing market

Competitive advantage – unique strength

Innovation – differentiated and creative solution

Timeline:

Elimination Round: Shortlisting based on problem statement & BMC (Results by Jan 10, 2027)

Online Round (Jan 20, 2027): Presentation to judges

Semi-Finale Online (Feb 02-03, 2027)

Grand Finale On Campus (Feb 27, 2027): Top 8 teams pitch to VCs, Angels, and Industry Experts; includes Startup Expo and Entrepreneurship Summit

Outstation finalists receive 3rd AC train fare, hotel stay, and meals

About Indira University:

Established under the Indira Group of Institutes founded in 1994

Offers programs from kindergarten to PhD

Focus on value-based learning, innovation, and industry collaboration

Recently transformed into Indira University (Pune)

Aims to nurture leadership, employability, and lifelong learning

Committed to contributing to India’s economic and societal progress

About Swakiyam Centre for Incubation & Innovation (IU):

Institutional initiative to promote entrepreneurship development

Supports student and community innovators through incubation and mentoring

Encourages holistic growth and entrepreneurial mindset

Philosophy: “Entrepreneurs take the route less traversed.”

Objectives:

Become a benchmark destination for incubation and mentoring

Achieve self-sustainability within 5 years through partnerships and programs

Provide end-to-end startup incubation services using innovative methods

Proposed Scope – Areas of Development:

Startup incubation with comprehensive support

Mentoring for entrepreneurs

Industry exposure via experts and internships

Platforms for events and entrepreneurial engagement

Areas of Focus:

Sector-agnostic incubation

Multidisciplinary collaboration

Facilitation from ideation to commercialization

Stages & Timelines:
• Application Screening (Oct 21, 2026 - Dec 31, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.',
    'Competitions',
    'Indira university',
    '2026-12-31T00:00:00+05:30'::timestamptz,
    '2026-10-21T00:00:00+05:30'::timestamptz,
    '2026-12-31T00:00:00+05:30'::timestamptz,
    'online',
    'Online',
    'Winner: ₹1,00,000, 1st Runner-Up: ₹60,000, 2nd Runner-Up: ₹40,000 (Total ₹2,00,000)',
    NULL,
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others, Law, Medical',
    '1 - 5 Members',
    ARRAY['Business Planning', 'Entrepreneurship', 'Public Speaking and Presentation Skills', 'Market Research Methods', 'Financial Modeling']::text[],
    'https://unstop.com/o/2WULCTp',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6ae2f6a001766_indiapreneur-160.jpeg',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/competitions/indiapreneur160-indira-university-1771267',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/2WULCTp' OR title = 'Indiapreneur 16.0'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'LightHouse - Hackathon',
    'About LightHouse:

LightHouse is an international, online hackathon for builders of agentic AI. Over several weeks, teams design and ship autonomous AI agents that plan, reason, use tools, and take action to solve real-world problems. Whether you’re a student, a developer, or an early-stage founder, this is your chance to build, get noticed, and win.

Mandatory for Registration:

Registration is complete only when  all team members  do of the following:

Fill the Profile Review Form:  https://tally.so/r/1Wd0MM

Prizes:

₹10,000 in cash prizes

₹5,00,000 in kind (credits, tools, mentorship, perks, and opportunities from partners)

Eligibility:

Open to participants worldwide (students, professionals, and independent builders).

Team size: 2 to 5 members.

Inter-college and inter-specialization teams are allowed.

Each participant can be part of only one team.

Basic knowledge of programming and AI/LLM concepts is recommended.

Format:

Fully online, with no travel required. Teams work on one problem statement from the released set and build an agentic AI solution.

Timeline:

Stage

Dates

Registration

13 Nov – 25 Dec

Round 1: Profile Review

15 Nov – 1 Dec

Problem Statements Released

1 Dec (announcements continue until 30 Dec)

Round 2: Build Phase (working on the problem statement)

1 Jan – 10 Jan

Final Submission

11 Jan

Grand Finale

Online (date and time to be announced)

Process:

Register your team before the deadline.

Your team’s profiles go through a profile review.

Shortlisted teams receive the problem statements.

Pick one problem statement and build your agentic AI solution from 1 to 10 Jan.

Submit your project on 11 Jan (working demo, GitHub repository, demo video, and a short write-up).

Top teams present live at the online finale in front of judges.

Rules:

All work must be created during the build phase; pre-existing code is allowed only if it is open-source and disclosed.

Solutions must use an agentic AI approach (autonomous planning, tool use, or multi-step reasoning).

Plagiarism or copied projects lead to disqualification.

Any AI models, APIs, and frameworks are allowed, but you must credit them.

Teams must submit before the deadline. Late submissions won’t be considered.

The organisers’ and judges’ decisions are final.

Follow the code of conduct and behave respectfully with other participants.

Judging Criteria:

Innovation, agentic capability and autonomy, technical depth, real-world impact, usability, and presentation.

Join the community:

WhatsApp group for updates, doubts, and team-building:  https://chat.whatsapp.com/JFwnM2kPMj6Dv7PY2K7OWA?mode=gi_t

Rounds to add:

Profile Review  (15 Nov – 1 Dec): Screening Round

Problem Statement Release  (1 Dec – 30 Dec): Announcement stage

Build Phase  (1 Jan – 10 Jan): Working on the problem statement

Submission  (11 Jan)

Grand Finale  (Online)

Stages & Timelines:
• Profile Review & Registration Form (Nov 15, 2026 - Dec 01, 2026): This is the first screening round of LightHouse. To complete your registration,  every team member must individually fill out the Profile Review Form :

👉   https://tally.so/r/1Wd0MM

Mandatory requirements:

All team members (2 to 5) must fill the form. If even one member skips it, the team’s registration is incomplete.

Use the same email ID that you used to register on Unstop.

• Problem Statement Release (1 Dec – 30 Dec): Announcement stage (Dec 01, 2026 - Dec 31, 2026): Problem Statement Release (1 Dec – 30 Dec): Announcement stage and Research

• Build Phase (1 Jan – 10 Jan): Working on the problem statement (Jan 01, 2027 - Jan 10, 2027): Build Phase (1 Jan – 10 Jan): Working on the problem statement',
    'Hackathons',
    'Chandigarh University (CU), Ajitgarh, Punjab',
    '2026-12-31T00:00:00+05:30'::timestamptz,
    '2026-11-13T00:00:00+05:30'::timestamptz,
    '2027-01-10T22:26:00+05:30'::timestamptz,
    'hybrid',
    'Online',
    '1st Place (Winner): ₹5,000, 2nd Place (Runner-up): ₹3,000, 3rd Place: ₹2,000, Share of ₹5 lakh in-kind (partner credits, tools, perks): ₹500,000',
    NULL,
    NULL,
    '2 - 5 Members',
    ARRAY['Artificial Intelligence (AI)', 'Machine Learning Concepts', 'Python', 'Problem Solving', 'Teamwork and Collaboration']::text[],
    'https://unstop.com/o/3GXySDL',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6af741ce7c5df_lighthouse-hackathon.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/hackathons/lighthouse-hackathon-chandigarh-university-cu-ajitgarh-punjab-1809486',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/3GXySDL' OR title = 'LightHouse - Hackathon'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Machine Learning Engineer Internship',
    'Responsibilities

Develop, train, and evaluate machine learning models using Python.

Perform data collection, cleaning, preprocessing, and feature engineering.

Implement supervised and unsupervised machine learning algorithms.

Work with libraries such as Scikit-learn, TensorFlow, PyTorch, Pandas, and NumPy.

Analyze datasets to identify patterns, trends, and insights.

Build predictive models for real-world business applications.

Assist in model optimization, testing, and performance evaluation.

Collaborate with Data Science and Software Development teams.

Use Git and GitHub for version control and project collaboration.

Prepare technical documentation and submit assigned tasks within deadlines.

Requirements

Basic knowledge of Python programming.

Understanding of machine learning concepts and algorithms.

Familiarity with Pandas, NumPy, Matplotlib, and Scikit-learn.

Basic knowledge of data preprocessing and exploratory data analysis.

Understanding of classification, regression, and clustering techniques.

Basic knowledge of statistics and mathematics.

Familiarity with Jupyter Notebook, Google Colab, and GitHub.

Strong analytical, problem-solving, and communication skills.

Willingness to learn new AI/ML technologies and work on real-world projects.

Stages & Timelines:
• Application Screening (Nov 02, 2026 - Nov 30, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Finalise & Offer (Jan 01, 2027 - Jan 08, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Vortizo AI',
    '2026-11-30T00:00:00+05:30'::timestamptz,
    '2026-11-02T00:00:00+05:30'::timestamptz,
    '2026-11-30T00:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    'Undergraduate, Postgraduate, Engineering Students',
    '1 Member',
    ARRAY['Python', 'Machine Learning', 'TensorFlow', 'Data Cleaning', 'Flask', 'Statistics', 'Cloud Computing', 'A/B Testing', 'Docker', 'Quantitative Analysis', 'Logical Reasoning', 'Machine Learning Concepts', 'Scikit-learn', 'Pandas (Python)', 'NumPy']::text[],
    'https://unstop.com/o/qXcVxmB',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1793612611.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/machine-learning-engineer-vortizo-ai-1791403',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/qXcVxmB' OR title = 'Machine Learning Engineer Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Product & Technology Internship',
    'A little about us:

We''re GuruCool, an early-stage technology startup building a connected operating system for educational institutions.

We''re working on a simple but meaningful problem: teachers spend too much time on administrative work, students often become messengers between institutions and parents, and important information doesn''t always reach the right people when it should.

We believe thoughtful technology can change that.

Our goal is to bring academics, attendance, communication, administration, and everyday institutional operations into one connected ecosystem.

And we''re looking for a few curious minds who would like to be part of building it.

What will you actually do?

You''ll work with our team on real projects, explore how technology products are built, and learn by solving actual problems.

Depending on your interests and abilities, you may contribute to:

Product development, research, and feature planning.

Software development, testing, and debugging.

AI, automation, and exploring new technologies.

UI/UX improvements and understanding user problems.

Documentation, problem-solving, and improving existing workflows.

You won''t just be watching tutorials or working on imaginary assignments. We want you to understand the reasoning behind what we''re building and contribute wherever you can.

Here''s what we expect from you:

We don''t expect you to know everything. Seriously.

You might not know a particular programming language, tool, framework, or development process, and that''s okay.

What matters more to us is how you think, how you approach unfamiliar problems, and what you do when you don''t know the answer.

We appreciate people who ask questions, experiment, make mistakes, accept feedback, and genuinely try to improve.

You don''t need an impressive resume or previous internship experience. If you''ve built something interesting, tried learning something independently, or simply have a genuine interest in technology, we''d love to hear about it.

Who can apply?

This opportunity is intended for students currently pursuing their education, with an expected graduation year of  2027, 2028, 2029, or 2030 .

We encourage students from Computer Science, Engineering, Technology, Design, and related disciplines to apply.

Relevant personal projects and practical skills are always appreciated, but previous professional experience is not required.

Let''s talk about the commitment openly:

We believe you should know exactly what you''re signing up for.

Stipend:  ₹2,000

Working hours:  Approximately 5:00 PM to 9:00 PM

Working days:  5–6 days per week

Commitment:  Approximately 20–24 hours per week

This is a part-time, learning-focused internship.

We understand that the stipend is modest, and we don''t want to disguise that behind fancy benefits or promises.

We''re a young startup, and this opportunity is designed for students who are comfortable with the commitment and genuinely interested in gaining practical experience.

Please consider your academic schedule, personal commitments, and expectations before applying.

What can you expect from us?

You''ll get the opportunity to work on genuine product challenges, interact with a small team, understand how decisions are made, and develop practical skills through hands-on experience.

We believe learning works best when people are encouraged to ask questions, receive constructive feedback, and gradually take ownership of their work.

We cannot promise that you''ll become an expert in a few weeks or guarantee a full-time position afterward.

But we do want your time with GuruCool to be meaningful and worthwhile.

Details:

We want to understand the person behind the resume.

Tell us about yourself, your interests, what you''ve tried learning, and why this opportunity appeals to you.

You don''t need perfectly polished English or an AI-generated introduction. Hindi, English, Hinglish, or conversational language is completely fine.

We''d much rather hear your genuine thoughts.

Applications will be reviewed for relevant interests, learning attitude, and availability. Shortlisted candidates may be invited for a conversation to discuss their interests, expectations, and role fit.

Take a little time to understand what we''re building, explore our vision, and see whether the work genuinely interests you.

We''re not looking for people who already have all the answers.

We''re looking for people who are excited to find them.

See you at GuruCool!

Stages & Timelines:
• Application Screening (Nov 13, 2026 - Nov 27, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Finalise & Offer (Jan 12, 2027 - Jan 19, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'EduGuruCool Operating Systems Private Limited',
    '2026-11-27T00:00:00+05:30'::timestamptz,
    '2026-11-13T16:15:28+05:30'::timestamptz,
    '2026-11-27T00:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Problem Solving', 'Learning Agility', 'Debugging', 'UI/UX Design', 'Artificial Intelligence (AI)']::text[],
    'https://unstop.com/o/Ffo9QSv',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1794566243.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/product-technology-internship-edugurucool-operating-systems-private-limited-1808707',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/Ffo9QSv' OR title = 'Product & Technology Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'AI/ML Internship',
    'About Codeatrix

Codeatrix is an IT company focused on technology-driven solutions, software development, and industry-oriented projects across various business domains. We work with modern technologies, including Artificial Intelligence, Machine Learning, and data-driven solutions, to solve business challenges and improve operational efficiency.

Internship Details

Role:  AI/ML Intern

Industry:  IT / Software Development

Work Mode:  Remote / Work From Home

Duration:  2 Months

Stipend:  ₹15,000- ₹20000 per month

Experience:  Freshers and experienced candidates can apply

Job Description

Codeatrix is looking for motivated AI/ML Interns to work on industry-oriented projects involving Artificial Intelligence, Machine Learning, and data-driven solutions. Interns will work with datasets, develop machine learning models, evaluate results, and explore AI technologies to solve practical business and technical challenges.

Day-to-Day Roles and Responsibilities

Work on AI/ML projects involving industry-relevant problems and datasets.

Clean, preprocess, and analyze data using Python, Pandas, NumPy, and Scikit-learn.

Implement supervised and unsupervised machine learning algorithms.

Train, test, evaluate, and optimize models using appropriate techniques and performance metrics.

Explore Generative AI, Natural Language Processing (NLP), or computer vision based on project requirements.

Document findings, troubleshoot issues, and collaborate with the team to improve project outcomes.

Who Can Apply?

College students from any year, freshers, recent graduates, and experienced candidates.

Candidates from Computer Science, IT, AI, Data Science, Engineering, Mathematics, Statistics, or related fields are preferred.

Candidates from other academic backgrounds with an interest in AI/ML are also welcome.

Applicants should have analytical thinking, problem-solving skills, and a willingness to learn.

Preferred Skills

Basic knowledge of Python and programming fundamentals.

Familiarity with machine learning, statistics, or data analysis.

Knowledge of Pandas, NumPy, or Scikit-learn is an advantage.

Familiarity with Git/GitHub, Jupyter Notebook, or Google Colab is beneficial.

Prior academic or personal projects are welcome but not mandatory.

Selection Process

Application screening based on qualifications and relevant skills.

Technical assessment or discussion, where applicable.

Interaction with the team for shortlisted candidates.

Selected candidates receive onboarding instructions and project details.

How to Apply

Interested candidates can apply through the internship application portal by providing accurate details about their education, technical skills, projects, and prior experience, if applicable.

Join Codeatrix to gain experience working on technology-driven projects in the evolving field of Artificial Intelligence and Machine Learning.

Stages & Timelines:
• Finalise & Offer (Jan 10, 2027 - Jan 17, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Codeatrix',
    '2026-12-10T12:32:40+05:30'::timestamptz,
    '2026-11-10T12:32:41+05:30'::timestamptz,
    '2026-12-10T12:32:40+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    NULL,
    '1 Member',
    ARRAY['Python', 'Machine Learning Concepts', 'Pandas (Python)', 'NumPy', 'Scikit-learn']::text[],
    'https://unstop.com/o/fRrxU0B',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1794294187.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/aiml-internship-codeatrix-1803891',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/fRrxU0B' OR title = 'AI/ML Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'AI/ML Engineer Internship',
    'About Us

At MeritixLabs, we are building a next-generation platform for creating and orchestrating autonomous, multi-agent AI systems. Our mission is to replicate and augment the best decision-making processes for enterprises, moving beyond simple chatbots to create agents that are capable of complex, deterministic reasoning and action. These agents don''t just chat—they execute workflows, call external APIs, reason over knowledge graphs, coordinate with each other, and resolve customer issues end-to-end.

We are a team of engineers, researchers, and AI enthusiasts passionate about pushing the boundaries of what''s possible with agentic AI. We are looking for a talented AI Engineer to join us in designing, building, and deploying the intelligent agents that sit at the heart of our platform.

Key Responsibilities

Agent Architecture & Development: Design, build, and deploy production-grade AI agents using LangChain, LangGraph, and CrewAI. You will be responsible for agent state management, tool calling, memory, and multi-turn reasoning.

Workflow Orchestration: Build complex, deterministic agentic workflows using LangGraph''s state machines and CrewAI''s role-based agent teams. Implement robust error handling, retries, and human-in-the-loop patterns.

MCP Client Integration: Implement Model Context Protocol (MCP) clients that enable agents to discover, connect to, and invoke tools and resources exposed by MCP servers (built by our platform team). This includes handling resource discovery, tool calling, and prompt retrieval.

Knowledge Graph Integration: Design and implement a semantic layer that connects agents to our graph databases (Neo4j, ArcadeDB, or NebulaGraph). Enable agents to query, traverse, and update knowledge graphs to support reasoning and decision-making.

Semantic & Vector Memory: Integrate vector databases (Weaviate, ChromaDB) to provide agents with long-term memory, semantic search, and retrieval-augmented generation (RAG) capabilities.

LLM Integration & Prompt Engineering: Manage interactions with various LLM providers (OpenAI, Anthropic, open-source models). Design effective prompts, chain-of-thought reasoning, and few-shot examples to maximize agent performance.

Tool & API Development: Build tools and connectors that allow agents to interact with external systems—internal APIs, third-party services, databases, and more. Ensure tools are robust, secure, and well-documented. Where appropriate, wrap these tools as MCP-compliant resources.

Evaluation & Testing: Implement evaluation frameworks to measure agent performance, accuracy, and safety. Develop test suites to catch regressions and edge cases in agent behavior.

Observability & Debugging: Build instrumentation to trace agent reasoning steps, log decisions, and monitor performance. Use observability tools (LangSmith, OpenTelemetry) to debug complex agent failures and improve system reliability.

Research & Innovation: Stay current with the latest advancements in agentic AI, LLMs, reasoning techniques, and the evolving MCP specification. Rapidly prototype new ideas and bring successful ones to production.

Required Skills & Qualifications

Currently pursuing a Bachelor''s or Master''s degree in Computer Science, Engineering, or a related field (graduating in 2028 or 2027 preferred).

Programming Language: Expert proficiency in Python. Experience with asynchronous programming and API development.

Agent Frameworks: Deep experience with LangChain, LangGraph, and/or CrewAI. You should understand their internals and trade-offs.

MCP (Model Context Protocol): Strong understanding of the MCP specification. Experience building MCP clients and integrating them into agent workflows. Familiarity with resource discovery, tool calling, and prompt handling is essential.

Orchestration & State Management: Strong understanding of state machines, DAGs, and workflow orchestration. Experience with Temporal or Cadence is a plus.

Databases: Strong experience with vector databases (Weaviate, ChromaDB, Pinecone, or similar). Experience with graph databases (Neo4j, ArcadeDB, NebulaGraph) is highly preferred.

Semantic & Knowledge Engineering: Experience building knowledge graphs, semantic layers, or ontologies. Understanding of RDF, SPARQL, or Cypher is a plus.

LLMs & Prompting: Deep understanding of LLM capabilities, limitations, and prompting techniques. Experience with multiple model providers and fine-tuning is a plus.

Systems Thinking: Ability to design robust, production-grade systems that handle failure gracefully and scale effectively.

Communication: Strong written and verbal communication skills. Ability to explain complex AI concepts to both technical and non-technical stakeholders.

Education: Bachelor''s or Master''s degree in Computer Science, AI, ML, or a related field, or equivalent practical experience.

Preferred Skills & Qualifications

MCP Server Development: Experience building MCP servers (not just clients) is a significant plus, as you''ll collaborate closely with the platform team on server design.

Observability: Experience with OpenTelemetry, LangSmith, or similar tools for tracing and debugging agent behavior.

Evaluation: Experience building evaluation datasets and metrics for agent tasks.

Infrastructure: Familiarity with Docker, Kubernetes, and cloud platforms (AWS, GCP, Azure).

Streaming: Exposure to event streaming technologies (Kafka/Redpanda, NATS, Pulsar) for building responsive, event-driven agent systems.

Open-Source: Contributions to open-source AI/agent projects or MCP-related projects.

Research Background: Publications or active research in areas like reasoning, planning, or multi-agent systems.

What We Offer

Impact: Build the core AI that powers our platform. Your agents will solve real problems for real customers.

Technical Challenge: Work at the cutting edge of agentic AI, pushing the limits of what''s possible with LLMs, reasoning systems, and the emerging MCP standard.

Collaboration: Work alongside a talented, cross-functional team of engineers and researchers who are passionate about AI.

Growth: Opportunities to lead projects, publish research, and speak at conferences.

Flexibility: Remote-friendly work environment with flexible hours.

Compensation: Competitive salary, equity options, and benefits.

Learning Budget: Access to conferences, courses, and resources to fuel your continued learning

Stages & Timelines:
• Application Screening (Nov 19, 2026 - Dec 03, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Interview (Nov 24, 2026 - Nov 26, 2026): Interview round

• Finalise & Offer (Jan 18, 2027 - Jan 25, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Meritixlabs.ai',
    '2026-12-03T21:01:59+05:30'::timestamptz,
    '2026-11-19T21:01:59+05:30'::timestamptz,
    '2026-12-03T21:01:59+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Unpaid',
    'Undergraduate, Postgraduate, Engineering Students, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Artificial Intelligence (AI)', 'Python', 'Natural Language Processing (NLP)', 'API Development (REST)', 'Workflow Automation']::text[],
    'https://unstop.com/o/jOBQFYL',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1795102359.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/aiml-engineer-intern-meritixlabsai-1819896',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/jOBQFYL' OR title = 'AI/ML Engineer Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Unstop Campus Champions-Applications Reopened!',
    'Ready to be the face of Unstop on your campus?

Unstop Campus Champions is back, and we’re looking for passionate, driven students who want to do more than just attend college. If you love bringing people together, discovering opportunities, building communities, and making things happen, this is your chance to be part of something bigger.

As a Campus Champion, you’ll get the opportunity to connect with like-minded students, help your peers discover exciting opportunities on Unstop, and build skills that go beyond the classroom.  Apply now and take the first step towards becoming an Unstop Campus Champion!

Perks & Opportunities:

Certificate of Excellence on Completion

Recognition at Unstop Talent Awards

Internship Opportunity at Unstop*

Exclusive Unstop Merch*

Online Session with Ankit Aggarwal, Unstop CEO & Founder

Access to Unstop Pro

Bonus Rewards for every Partner Event*

Grand Prizes such as Tablets, Speakers, Smart-Watch**

*Performance-based.

** Will be awarded to the top Champions at the end of their tenure, based on total points earned and referrals driven throughout the program.

Unstop Campus Champions Mission:

Be the face of Unstop in your college.

Organize competitions, hackathons, workshops, and campus activities.

Build and engage your campus community.

Collaborate with college clubs and student leaders.

Drive participation in Unstop opportunities.

Work with Team Unstop on exciting campaigns and projects.

Create a meaningful impact on your campus.

Important Note:

Rewards, internships, mentorships, and advanced opportunities will be awarded based on performance.

Activities may vary depending on academic calendars and campus schedules.

Team Unstop reserves the right to discontinue a Champion''s association if minimum performance standards are not met.

Eligibility:

Engineering - 1st, 2nd and 3rd Year

MBA - 1st Year

Arts & Commerce - 1st, 2nd and 3rd Year

Undergraduate - 1st, 2nd Year

Post graduate - 1st Year

Stages & Timelines:
• Application Screening (Nov 10, 2026 - Dec 15, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Trial Task Submission Round (Nov 02, 2026 - Dec 15, 2026): Congratulations on completing your application! In this round, you’re required to complete the task outlined in the attached PDF. Go through the instructions carefully, complete the task as specified, and submit the proof link to your completed work in the submission field. Ensure that your link is accessible and that the submitted work meets all the requirements mentioned in the PDF. All the best!  (Access the PDF via Laptop for better clarity)

• Finalize (Dec 02, 2026 - Jan 06, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Unstop',
    '2026-12-15T23:59:21+05:30'::timestamptz,
    '2026-11-10T18:31:21+05:30'::timestamptz,
    '2026-12-15T23:59:21+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Unpaid',
    'Engineering Students, Postgraduate, Undergraduate, Management, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Marketing Promotion', 'Branding', 'Community Outreach', 'Community Engagement', 'Event Marketing', 'Communication Skills', 'Teamwork and Collaboration', 'Stakeholder Engagement']::text[],
    'https://unstop.com/o/FSs3WAt',
    'https://d8it4huxumps7.cloudfront.net/uploads/images/opportunity/mobile_banner/6ae95fc381ece_unstop-campus-champions-applications-reopened.jpg',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/unstop-campus-champions-applications-reopened-unstop-1783927',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/FSs3WAt' OR title = 'Unstop Campus Champions-Applications Reopened!'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Data Science and ML Internship',
    'Seemons Technologies is offering this internship opportunity for candidates interested in contributing to data science and machine learning work. The organization provides a three-month internship experience with flexible hours and hybrid working, along with formal recognition and potential employment opportunities for participants.

Roles and Responsibilities:

Assist with data science and machine learning projects aligned with the team’s objectives.

Support the preparation, organization, and analysis of datasets for project use.

Contribute to the development and implementation of data-driven solutions.

Help assess project outputs and identify opportunities to improve their quality.

Investigate data-related challenges and help explore practical approaches to address them.

Research relevant data science and machine learning concepts to support ongoing work.

Document project activities, findings, and progress for clear team communication.

Collaborate with team members to support the timely completion of assigned tasks.

Stages & Timelines:
• Application Screening (Nov 20, 2026 - Dec 20, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Assessment for opportunity (Dec 27, 2026 - Dec 27, 2026): This will be an Assessment round! You will see the Start button here, once the round is live.

• Finalise & Offer (Jan 19, 2027 - Jan 26, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Seemons Technologies',
    '2026-12-20T11:49:35+05:30'::timestamptz,
    '2026-11-20T00:00:00+05:30'::timestamptz,
    '2026-12-27T11:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    'Undergraduate, Postgraduate, Engineering Students',
    '1 Member',
    ARRAY['Machine Learning Concepts', 'Data Science Tools', 'Data Wrangling', 'Data Interpretation', 'Research Skills']::text[],
    'https://unstop.com/o/f9JQqir',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1795158024.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/data-science-and-ml-internship-seemons-technologies-1820705',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/f9JQqir' OR title = 'Data Science and ML Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Full Stack Developer Internship',
    'Confluent Solutions is actively hiring for the role of Full Stack Developer Internship!

About the Organization:

Confluent Solutions is offering an opportunity for aspiring developers to gain practical exposure through a Full Stack Developer Internship. The organization provides an environment where interns can participate in digital product development, collaborate on technology-focused projects, and strengthen their understanding of modern web and application development. With a focus on hands-on learning, mentorship, and professional growth, Confluent Solutions encourages interns to apply their knowledge while building solutions that support real-world requirements.

Roles and Responsibilities:

Develop and enhance responsive web interfaces using React.js, HTML, and CSS.

Support the creation and integration of backend services using Node.js.

Assist in designing, developing, and maintaining application features across the technology stack.

Contribute to Mobile Application Development initiatives based on project requirements.

Work with MySQL to support data storage, retrieval, and application functionality.

Explore the use of Artificial Intelligence (AI) in suitable application and product development scenarios.

Collaborate with team members to understand requirements, implement solutions, and resolve development challenges.

Test application features, identify issues, and support improvements in functionality and user experience.

Use Canva to assist with relevant visual assets and presentation materials when required.

Document development work, share progress updates, and participate in reviews and learning activities.

Skills and Qualifications:

Bring a strong interest in full-stack development with practical learning across React.js, Node.js, HTML, CSS, and MySQL to help build functional and engaging applications.

Demonstrate enthusiasm for Mobile Application Development and Artificial Intelligence (AI), with the ability to explore these areas as part of evolving project requirements.

Apply Canva alongside the technical skill set when supporting visual communication and project-related creative requirements.

Job Summary:

This 2-month internship with Confluent Solutions is designed for individuals eager to turn their development interests into practical experience across web, backend, mobile, database, and AI-focused projects. With flexible hours and hybrid working, interns can learn in a supportive environment while contributing to meaningful technical work. The opportunity includes a Certificate of Completion, Counselling Support, a Letter of Recommendation, and the possibility of a Job Offer and Pre-Placement Offer, making it a valuable step toward building a strong professional future in technology.

Stages & Timelines:
• Application Screening (Oct 29, 2026 - Nov 28, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Finalise & Offer (Dec 28, 2026 - Jan 04, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Confluent Solutions',
    '2026-11-28T00:00:00+05:30'::timestamptz,
    '2026-10-29T00:00:00+05:30'::timestamptz,
    '2026-11-28T00:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Unpaid',
    'Undergraduate, Postgraduate, Engineering Students',
    '1 Member',
    ARRAY['React.js', 'Node.js', 'MySQL', 'HTML', 'CSS', 'Mobile Application Development', 'Artificial Intelligence (AI)', 'Canva']::text[],
    'https://unstop.com/o/OBLdmVC',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1793258557.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/full-stack-developer-internship-confluent-solutions-1783722',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/OBLdmVC' OR title = 'Full Stack Developer Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Product Design Internship',
    'Satyam Software Solution Pvt Ltd is hiring for Product Design Intern

About the Company

Satyam Software Solution Pvt Ltd works with organizations and projects in the Rapid Transit and Railways sector. The team is seeking a Product Design Intern to contribute to practical design work supporting transit and rail applications. This two-month, full-time, in-office internship is based in Sector 63, Noida, and offers a monthly stipend of ₹5,000–₹15,000, determined according to the candidate’s profile.

Responsibilities

Assist with product design and development tasks related to rapid transit or railway applications.

Support the preparation and refinement of design concepts, 2D drawings, and 3D models.

Use CAD tools and SolidWorks, where applicable, to create, review, and update design files.

Coordinate with the team to incorporate feedback and help maintain clear design documentation.

Requirements

Familiarity with SolidWorks, CAD, or similar design software is preferred.

Interest in product design for the rapid transit or railways industry.

Experience requirements have not been specified; applicants should be ready to learn and contribute during the internship.

Stages & Timelines:
• Application Screening (Nov 19, 2026 - Dec 03, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Finalise & Offer (Jan 18, 2027 - Jan 25, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Satyam Software Solution Pvt Ltd',
    '2026-12-03T00:00:00+05:30'::timestamptz,
    '2026-11-19T00:00:00+05:30'::timestamptz,
    '2026-12-03T00:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others',
    '1 Member',
    ARRAY['Computer-Aided Design (CAD)', 'SolidWorks', 'Mechanical design', 'Technical Drawing', '3D Modeling (Solid Modeling)']::text[],
    'https://unstop.com/o/v6P87of',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1795094380.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/product-design-intern-satyam-software-solution-pvt-ltd-1819751',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/v6P87of' OR title = 'Product Design Internship'
);
INSERT INTO public.opportunities (
    title, description, category, organizer, deadline, start_date, end_date,
    mode, location, prize, stipend, eligibility, team_size, skills,
    apply_url, image_url, status, source, featured, additional_info, created_by
)
SELECT
    'Campus Ambassodor',
    'Thaiyari Global Private Limited is actively hiring for the role of Campus Ambassodor!

About the Organization:

Thaiyari Global Private Limited is offering this campus ambassador internship. Further information about the organization’s background, industry focus, mission, and culture has not been provided.

Roles and Responsibilities:

Represent Thaiyari Global Private Limited as a campus ambassador.

Share organization-approved information with students on campus.

Help raise awareness of the organization and its activities among the campus community.

Connect interested students with the organization’s designated contact or information channels.

Support campus outreach activities as assigned during the internship.

Gather and relay relevant feedback from students to the organization.

Keep the organization informed about completed outreach activities.

Communicate the organization’s approved messages accurately and professionally.

Summary:

This one-month internship with Thaiyari Global Private Limited offers an opportunity to represent the organization and connect with your campus community. The role is based at a location that has not been specified. Details about perks and other benefits were not provided.

Stages & Timelines:
• Application Screening (Nov 21, 2026 - Dec 05, 2026): Initial profile based screening where you will be shortlisted based on your profile''s alignment with the role.

• Finalise & Offer (Jan 20, 2027 - Jan 27, 2027): This round is created automatically to ease the process of shortlisting final candidate(s) and will not be visible publicly on the microsite (listing).',
    'Internships',
    'Thaiyari Global Private Limited',
    '2026-12-05T00:00:00+05:30'::timestamptz,
    '2026-11-21T00:00:00+05:30'::timestamptz,
    '2026-12-05T00:00:00+05:30'::timestamptz,
    'online',
    'Remote',
    NULL,
    'Paid (As per company standards)',
    'Undergraduate, Postgraduate, Engineering Students, Management, Arts, Commerce, Sciences & Others, Medical',
    '1 Member',
    ARRAY['Communication Skills', 'Community Outreach', 'Audience Engagement', 'Professional Communication', 'Feedback Skills']::text[],
    'https://unstop.com/o/hQzeHpK',
    'https://d8it4huxumps7.cloudfront.net/lambda-pdfs/opportunity-bannerImages/1795253856.png',
    'published',
    'admin',
    FALSE,
    'Canonical URL: https://unstop.com/internships/campus-ambassodor-thaiyari-global-private-limited-1822084',
    '7d1a8410-5a21-4b2b-9446-6e8d9e6a19eb'::uuid
WHERE NOT EXISTS (
    SELECT 1 FROM public.opportunities WHERE apply_url = 'https://unstop.com/o/hQzeHpK' OR title = 'Campus Ambassodor'
);
ALTER TABLE public.opportunities ENABLE TRIGGER trg_opportunity_rate_limit;
COMMIT;