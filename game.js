(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SJGame=api})(typeof self!=='undefined'?self:this,function(){
const MINUTE_MS=1000,DAY_MIN=1440;
const HOBBIES=[
{id:'aion',short:'아이온2',name:'아이온2 (PC게임)',icon:'⚔️',type:'normal',durationMin:180,cooldownMin:1440,max:100,base:10,bonus:5,reward:15,recoverMin:1440,scene:'pc',line:'이번 판만 하고 끈다.'},
{id:'fishing',short:'낚시',name:'낚시',icon:'🎣',type:'normal',durationMin:360,cooldownMin:20160,max:200,base:40,bonus:15,reward:35,recoverMin:20160,scene:'fish',line:'오늘은 대물이 올 것 같은데.'},
{id:'jimook',short:'지묵이형 까불기',name:'카톡으로 지묵이형한테 까불기',icon:'😜',type:'chat',durationMin:1,daily:20,max:20,base:2,bonus:1,reward:2,recoverMin:1440,line:'형, 또 속았죠? ㅋㅋ'},
{id:'seongwoo',short:'성우 퇴근 놀리기',name:'카톡으로 성우 퇴근 늦게한다고 놀리기',icon:'😏',type:'chat',durationMin:1,daily:5,max:30,base:3,bonus:2,reward:4,recoverMin:1440,line:'성우야, 아직도 회사냐?'},
{id:'friends',short:'친구들과 게임',name:'동네친구들과 만나서 게임하기',icon:'🎮',type:'normal',durationMin:360,cooldownMin:10080,max:150,base:30,bonus:10,reward:25,recoverMin:10080,scene:'friends',line:'한 판만 더! 이번엔 진짜 이긴다.'},
{id:'garden',short:'회사 텃밭',name:'사장님 지시로 회사 텃밭 가꾸기',icon:'🌱',type:'normal',durationMin:60,cooldownMin:2880,max:80,base:15,bonus:5,reward:12,recoverMin:2880,scene:'garden',line:'이게 회사 일이 맞나…'}];
const byId=id=>HOBBIES.find(h=>h.id===id);
function gameMinutes(s,now=Date.now()){return Math.max(480,Math.floor((now-s.epoch)/MINUTE_MS))}
function dayAt(s,now=Date.now()){return Math.floor(gameMinutes(s,now)/DAY_MIN)+1}
function create(now=Date.now()){const s={version:2,epoch:now-480*MINUTE_MS,lastSaved:now,boredom:0,stepCleared:false,sound:true,normalActive:null,chatActive:null,chatDay:1,hobbies:Object.fromEntries(HOBBIES.map(h=>[h.id,{value:0,uses:0,cooldownUntil:0,recoverUntil:0,dailyUses:0}])),logs:[]};s.chatDay=dayAt(s,now);return s}
function clock(s,now=Date.now()){const m=gameMinutes(s,now),d=Math.floor(m/DAY_MIN)+1,t=m%DAY_MIN;return{day:d,hour:Math.floor(t/60),minute:t%60,text:`DAY ${d} · ${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`}}
function addLog(s,msg,now=Date.now()){s.logs.unshift({time:clock(s,now).text,msg});s.logs=s.logs.slice(0,100)}
function expected(s,id){const h=byId(id),x=s.hobbies[id];return Math.min(h.max-x.value,h.base+x.uses*h.bonus)}
function resetDaily(s,now){const d=dayAt(s,now);if(d!==s.chatDay){s.chatDay=d;HOBBIES.filter(h=>h.type==='chat').forEach(h=>s.hobbies[h.id].dailyUses=0);addLog(s,'게임 내 자정: 카톡 이용 횟수가 초기화됐다.',now)}}
function recover(s,now,events){HOBBIES.forEach(h=>{const x=s.hobbies[h.id];if(x.recoverUntil&&now>=x.recoverUntil){x.recoverUntil=0;x.value=0;x.uses=0;events.push({type:'recovered',id:h.id});addLog(s,`${h.short}의 지루함과 반복 횟수가 회복됐다.`,now)}})}
function complete(s,a,events){const h=byId(a.id),x=s.hobbies[h.id],gain=Math.min(h.max-x.value,a.gain);x.value+=gain;x.uses++;if(h.type==='chat')x.dailyUses++;addLog(s,`${h.short} 완료, 지루함 +${gain}.`,a.endAt);events.push({type:'complete',id:h.id,gain});if(x.value>=h.max){x.recoverUntil=a.endAt+h.recoverMin*MINUTE_MS;s.boredom=Math.min(100,s.boredom+h.reward);addLog(s,`${h.short} 지루함 MAX, 심심 지수 +${h.reward}.`,a.endAt);events.push({type:'max',id:h.id,reward:h.reward})}}
function sync(s,now=Date.now()){const events=[];resetDaily(s,now);if(s.normalActive&&now>=s.normalActive.endAt){const a=s.normalActive;s.normalActive=null;complete(s,a,events)}if(s.chatActive&&now>=s.chatActive.endAt){const a=s.chatActive;s.chatActive=null;complete(s,a,events)}recover(s,now,events);s.lastSaved=now;return events}
function availability(s,id,now=Date.now()){sync(s,now);const h=byId(id),x=s.hobbies[id];if(s.stepCleared)return{ok:false,reason:'Step 1을 이미 클리어했습니다.'};if(x.recoverUntil>now)return{ok:false,reason:'지루함 회복 중입니다.'};if(h.type==='normal'){if(s.normalActive)return{ok:false,reason:'다른 일반 취미를 수행 중입니다.'};if(x.cooldownUntil>now)return{ok:false,reason:'이용 주기가 아직 남았습니다.'}}else{if(s.chatActive)return{ok:false,reason:'다른 카톡 행동을 입력 중입니다.'};if(x.dailyUses>=h.daily)return{ok:false,reason:'오늘 이용 횟수를 모두 사용했습니다.'}}return{ok:true,reason:''}}
function start(s,id,now=Date.now()){const h=byId(id),a=availability(s,id,now);if(!a.ok)return a;const x=s.hobbies[id],active={id,startAt:now,endAt:now+h.durationMin*MINUTE_MS,gain:expected(s,id)};if(h.type==='normal'){s.normalActive=active;x.cooldownUntil=now+h.cooldownMin*MINUTE_MS}else s.chatActive=active;addLog(s,`${h.short} 시작.`,now);s.lastSaved=now;return{ok:true,active}}
function rejectDate(s,now=Date.now()){if(s.boredom<100||s.stepCleared)return false;s.boredom=Math.max(0,s.boredom-30);addLog(s,'소개팅 제안을 거절했다. 심심 지수 -30.',now);return true}
function acceptDate(s,now=Date.now()){if(s.boredom<100||s.stepCleared)return false;s.stepCleared=true;addLog(s,'소개팅 제안을 수락했다. Step 1 클리어!',now);return true}
function remaining(ms){const sec=Math.max(0,Math.ceil(ms/1000));if(sec<60)return`${sec}초`;const min=Math.ceil(sec/60);if(min<60)return`${min}분`;const hr=Math.floor(min/60),m=min%60;return m?`${hr}시간 ${m}분`:`${hr}시간`}
return{MINUTE_MS,HOBBIES,byId,create,gameMinutes,dayAt,clock,expected,sync,availability,start,rejectDate,acceptDate,remaining};
});
