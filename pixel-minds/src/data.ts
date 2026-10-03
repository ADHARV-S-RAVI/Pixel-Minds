export type Opp={id:number;title:string;org:string;cat:string;mode:string;deadline:string;days:number;prize:string;skills:string[];tint:string};
export const cats=['Hackathons','Internships','Events','Workshops','Competitions','Scholarships','Courses','Startup Programs','Conferences','Fellowships'];
const t=['#e0f2fe','#e0e7ff','#dcfce7','#fef3c7','#fce7f3','#ccfbf1'];
export const opps:Opp[]=[
['Smart India Hackathon 2026','Ministry of Education','Hackathons','Hybrid','Nov 14',44,'₹1,00,000',['AI','Web','IoT']],
['Summer SDE Internship','Razorpay','Internships','Remote','Oct 20',19,'₹60k/mo',['React','Node','SQL']],
['Google Cloud Study Jam','GDG Mumbai','Workshops','Online','Oct 09',8,'Certificate',['Cloud','DevOps']],
['Codeforces Round Campus Cup','IIT Bombay','Competitions','Online','Oct 27',26,'₹50,000',['DSA','C++']],
['Women in Tech Scholarship','Grace Hopper India','Scholarships','Online','Nov 02',32,'₹2,00,000',['Any stream']],
['Y Combinator Startup School','YC','Startup Programs','Online','Dec 01',61,'Mentorship',['Product','GTM']],
['DevFest Pune 2026','GDG Pune','Events','Onsite','Oct 25',24,'Networking',['Web','AI','Android']],
['Open Source Fellowship','Linux Foundation','Fellowships','Remote','Nov 20',50,'$3,000',['Rust','Go','Linux']],
].map((o,i)=>({id:i+1,title:o[0] as string,org:o[1] as string,cat:o[2] as string,mode:o[3] as string,deadline:o[4] as string,days:o[5] as number,prize:o[6] as string,skills:o[7] as string[],tint:t[i%6]}));
export const users=[['Aarav Mehta',4820,64],['Diya Nair',4310,58],['Rohan Iyer',3975,51],['Sana Qureshi',3120,44],['Kabir Shah',2640,37],['Ishita Rao',1980,29],['Neel Joshi',1210,18],['Meera Das',640,9]].map((u,i)=>({rank:i+1,name:u[0] as string,pixels:u[1] as number,contribs:u[2] as number}));
export const tiers:[number,string][]=[[0,'Pixel Starter'],[500,'Pixel Scout'],[1200,'Pixel Contributor'],[2500,'Pixel Builder'],[4000,'Pixel Master'],[7500,'Pixel Legend']];
export const tierInfo=(p:number)=>{let i=0;tiers.forEach(([m],j)=>{if(p>=m)i=j});const n=tiers[i+1];return {name:tiers[i][1],next:n?n[1]:null,toGo:n?n[0]-p:0,pct:n?Math.round((p-tiers[i][0])/(n[0]-tiers[i][0])*100):100}};
export const rankOf=(p:number)=>tierInfo(p).name;
export const moves=[2,-1,1,0,3,-2,1,0];
export const refs=[['Smart India Hackathon 2026','Kabir S.','Sep 28','Successful'],['Summer SDE Internship','Ishita R.','Sep 25','Pending'],['Open Source Fellowship','Neel J.','Sep 21','Successful'],['DevFest Pune 2026','Meera D.','Sep 17','Successful'],['Google Cloud Study Jam','Sana Q.','Sep 12','Pending'],['Women in Tech Scholarship','Diya N.','Sep 06','Successful']];
export const posts=[
{id:1,user:'Diya Nair',role:'CS student, VIT',time:'2h',text:'Registrations just opened for Smart India Hackathon. Team of 6, problem statements are out — sharing so nobody misses the Nov 14 deadline.',opp:1,likes:128,comments:14},
{id:2,user:'Rohan Iyer',role:'Backend intern',time:'5h',text:'Attended the GDG Pune meetup yesterday. Best talk: shipping ML models on a budget. Slides are in the comments.',likes:76,comments:9,img:true},
{id:3,user:'Sana Qureshi',role:'Open source contributor',time:'1d',text:'The Linux Foundation fellowship is paying $3,000 and takes first-time contributors. Apply before Nov 20.',opp:8,likes:203,comments:31},
];
