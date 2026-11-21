import { db, ref, get, set, update, remove, onValue, runTransaction, serverTimestamp } from '../firebase.js';
import { getLocalCollection, saveLocalItem, putLocalMedia, getLocalMedia } from '../services/local-store.js';
import { isTicTacToeWin, getConnectFourWin, normalizeGuess, isExactAnswerGuess } from './logic.js';

const $ = (selector, root=document) => root.querySelector(selector);
const esc = (v='') => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const rand = (arr) => arr[Math.floor(Math.random()*arr.length)];
const shuffle = (arr) => [...arr].map(v => [Math.random(),v]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
const opposite = role => role === 'host' ? 'guest' : 'host';
const CATEGORIES = ['Food & Drinks','Date Ideas','Lifestyle','Travel','Entertainment','Daily Habits','Relationship','Random & Funny'];
const TD_CATEGORIES = ['Romantic','Funny','Memories','Relationship','Personal','Creative','Long Distance','Random'];

const LOVE_BANK = [
  ['What makes me feel most appreciated?',['Words of affirmation','Quality time','Small gifts','Acts of service'],'Relationship'],
  ['My ideal date night is…',['Dinner and a walk','Movie night at home','Playing games together','A spontaneous adventure'],'Date Ideas'],
  ['Which drink do I usually choose?',['Coffee','Tea','Chocolate','Fresh juice'],'Food & Drinks'],
  ['When am I most active?',['Early morning','Afternoon','Evening','Late at night'],'Daily Habits'],
  ['My dream holiday destination is…',['Beach','Mountains','Big city','Quiet countryside'],'Travel'],
  ['Which movie genre do I prefer?',['Romance','Comedy','Thriller','Sci-fi'],'Entertainment'],
  ['What helps me after a tiring day?',['Talking','Resting quietly','Eating something nice','Listening to music'],'Lifestyle'],
  ['Which little gesture means the most to me?',['A thoughtful message','A surprise call','Remembering details','A warm hug'],'Relationship'],
  ['What would I pick on a free weekend?',['Stay in','Explore somewhere','Meet friends','Learn something new'],'Lifestyle'],
  ['My comfort food is closer to…',['Noodles','Rice meal','Bread or pastry','Something sweet'],'Food & Drinks'],
  ['Which weather do I enjoy most?',['Rainy','Sunny','Cloudy','Cold and breezy'],'Lifestyle'],
  ['What do I enjoy more?',['Taking photos','Making playlists','Watching series','Reading'],'Entertainment'],
  ['What is my preferred way to communicate?',['Texting','Voice call','Video call','Voice notes'],'Daily Habits'],
  ['For a trip, I prefer…',['A detailed plan','A loose itinerary','No plan at all','Let someone else decide'],'Travel'],
  ['Which gift would make me smile?',['A handwritten note','A useful item','A surprise date','A photo memory'],'Relationship'],
  ['What do I do first after waking up?',['Check my phone','Drink water','Stretch','Go back to sleep'],'Daily Habits'],
  ['A perfect virtual date sounds like…',['Watch a movie together','Cook on video call','Play a game','Share stories'],'Date Ideas'],
  ['Which snack wins for me?',['Chips','Chocolate','Fruit','Biscuits'],'Food & Drinks'],
  ['What kind of music suits my mood?',['Pop','Acoustic','Indie','Lo-fi'],'Entertainment'],
  ['If we had one free day together, I would choose…',['A road trip','Staycation','Food hunting','Explore a new place'],'Date Ideas'],
  ['What do I value most in a conversation?',['Honesty','Humour','Patience','Curiosity'],'Relationship'],
  ['Which little ritual would I keep?',['Good morning text','Nightly call','Weekly date','Shared playlist'],'Daily Habits'],
  ['My ideal home atmosphere is…',['Cosy and quiet','Bright and open','Lively and colourful','Minimal and calm'],'Lifestyle'],
  ['Which season would I choose for a holiday?',['Spring','Summer','Autumn','Winter'],'Travel'],
  ['What do I reach for when I need inspiration?',['Music','Nature','Books','People'],'Lifestyle'],
  ['What kind of surprise do I like?',['Planned and thoughtful','Completely unexpected','Something handmade','A shared experience'],'Relationship'],
  ['Which activity sounds most relaxing?',['Long walk','Warm shower','Reading','Watching a comfort show'],'Lifestyle'],
  ['What would I collect from our trips?',['Photos','Postcards','Ticket stubs','Little souvenirs'],'Travel'],
  ['What makes a virtual date feel special?',['Dressing up','A shared activity','A playlist','A long conversation'],'Date Ideas'],
  ['Which dessert would I pick?',['Ice cream','Cheesecake','Pudding','Fruit tart'],'Food & Drinks'],
  ['Which kind of story pulls me in?',['Mystery','Romance','Comedy','Adventure'],'Entertainment']
];
const THIS_OR_THAT_BANK = [
  ['Sunrise or sunset?','Sunrise','Sunset','Lifestyle'],['Beach date or mountain date?','Beach','Mountain','Date Ideas'],
  ['Coffee or tea?','Coffee','Tea','Food & Drinks'],['Movie night or game night?','Movie night','Game night','Entertainment'],
  ['Voice call or video call?','Voice call','Video call','Daily Habits'],['Sweet snacks or salty snacks?','Sweet','Salty','Food & Drinks'],
  ['City trip or nature escape?','City','Nature','Travel'],['Stay in or go out?','Stay in','Go out','Lifestyle'],
  ['Text first or call first?','Text','Call','Relationship'],['Plan everything or be spontaneous?','Plan it','Be spontaneous','Lifestyle'],
  ['Flowers or handwritten letter?','Flowers','Letter','Relationship'],['Breakfast date or dinner date?','Breakfast','Dinner','Date Ideas'],
  ['Cats or dogs?','Cats','Dogs','Random & Funny'],['Rainy day or sunny day?','Rainy','Sunny','Lifestyle'],
  ['Comedy or romance?','Comedy','Romance','Entertainment'],['Road trip or flight?','Road trip','Flight','Travel'],
  ['Cook together or order food?','Cook','Order','Date Ideas'],['Museum or amusement park?','Museum','Amusement park','Date Ideas'],
  ['Long hug or forehead kiss?','Long hug','Forehead kiss','Relationship'],['Matching outfits or matching playlists?','Outfits','Playlists','Random & Funny'],
  ['Pancakes or waffles?','Pancakes','Waffles','Food & Drinks'],['Morning person or night owl?','Morning','Night owl','Daily Habits'],
  ['Bookstore date or art gallery date?','Bookstore','Art gallery','Date Ideas'],['Surprise gift or planned date?','Surprise gift','Planned date','Relationship'],
  ['Train journey or road trip?','Train','Road trip','Travel'],['Board games or video games?','Board games','Video games','Entertainment'],
  ['Fresh flowers or a little plant?','Flowers','Plant','Relationship'],['Homemade dessert or cafe dessert?','Homemade','Cafe','Food & Drinks'],
  ['Send memes or send songs?','Memes','Songs','Daily Habits'],['Stargazing or cloud watching?','Stargazing','Cloud watching','Date Ideas']
];
const TRUTH_BANK = [
  'What was your first impression of your partner?','What small thing about your partner makes you smile?','What is one memory you want to relive together?',
  'What do you miss most when you are apart?','What is something you have always wanted to try together?','What is your favourite shared memory?',
  'When do you feel most connected to your partner?','What song reminds you of the two of you?','What is one thing you appreciate but rarely say?',
  'What would your perfect reunion day look like?','What is a funny habit your partner has?','What is one place you want to visit together?',
  'What was your favourite childhood treat?','What is a skill you want to learn?','What makes you feel cared for?',
  'What is one thing you are proud of this year?','What would you put in a time capsule for your relationship?','What is your ideal lazy Sunday?'
];
const DARE_BANK = [
  'Send your partner a 10-second voice note saying three things you appreciate.','Draw a tiny portrait of your partner in 30 seconds.','Make a 15-second dramatic movie trailer about your next date.',
  'Create a two-line love poem using the words moon and home.','Show your best celebration dance for 10 seconds.','Make up a cute nickname and explain it.',
  'Sing one chorus of a song that reminds you of your partner.','Describe your partner like a travel destination.','Do your best impression of your partner (kindly!).',
  'Name five things you would pack for a surprise weekend together.','Send a photo of something nearby that reminds you of your partner (optional).','Speak in a silly accent for your next two sentences.',
  'Invent a handshake you will try next time you meet.','Make a mini playlist title for your relationship.','Give your partner a virtual standing ovation.',
  'Tell a 20-second story where you both are superheroes.','Pick an emoji that represents today and explain why.','Make a paper heart and show it to the camera.'
];
const WORD_BANK = {
 easy: ['apel','kucing','payung','pizza','sepeda','kamera','bunga','pantai','kopi','bulan','buku','kelinci','pesawat','hujan'],
 medium: ['rumah pohon','naik sepeda','es krim cokelat','bermain layang-layang','kencan pertama','tiket konser','taman bermain','memasak bersama'],
 hard: ['kejutan ulang tahun','terjebak hujan','liburan impian','surat cinta rahasia','menunggu kereta terakhir','piknik di bawah bintang']
};
const FORBIDDEN_WORDS = { 'kucing':['hewan','meong'], 'apel':['buah','merah'], 'pizza':['makanan','keju'], 'kopi':['minuman','kafe'] };
const MEMORY_SYMBOLS = ['♡','✿','☾','☆','🌷','🧸','🍓','🌙','🎀','🦋','🍒','🪻','🐱','🐻','🍰','☁️','💌','🌼'];

const DEFAULTS = {
  lovequiz: { mode:'know', source:'both', categories:CATEGORIES, count:10 },
  thisorthat: { source:'both', categories:CATEGORIES, count:10 },
  truthordare: { mode:'self', source:'mixed', categories:TD_CATEGORIES, intensity:'Sweet', rounds:10 },
  memorycard: { mode:'duel', difficulty:'easy', deck:'diri' },
  drawguess: { difficulty:'mixed', rounds:6, seconds:90 },
  tebakkata: { mode:'classic', difficulty:'mixed', categories:['Animals','Food & Drinks','Objects','Places','Activities','Love & Romance','Random & Funny'], rounds:6, seconds:90 }
};

function publicPath(code, sessionId){ return `roomGames/${code}/${sessionId}/public`; }
function privatePath(code, gameId, sessionId, uid){ return `privateRooms/${code}/${gameId}/${sessionId}/${uid}`; }
function baseSetup(gameId, sessionId, players){
  return { gameId, sessionId, phase:'setup', settings:structuredClone(DEFAULTS[gameId]), approvals:{host:false,guest:false}, ready:{host:false,guest:false}, players, createdAt:Date.now(), matchNumber:1 };
}
function makeTttState(sessionId, players){
  const pair=rand([['♡','✿'],['☾','☆'],['🌷','🦋'],['🍓','🍒']]); return {gameId:'tictactoe',sessionId,phase:'playing',board:Array(9).fill(null),turnUid:rand([players.host.uid,players.guest.uid]),symbols:{[players.host.uid]:pair[0],[players.guest.uid]:pair[1]},scores:{[players.host.uid]:0,[players.guest.uid]:0,draw:0},round:1,matchNumber:1,moves:[],rematch:{host:false,guest:false}};
}
function makeConnectState(sessionId, players){
  return {gameId:'connectfour',sessionId,phase:'playing',board:Array(42).fill(null),turnUid:rand([players.host.uid,players.guest.uid]),theme:'pastel',scores:{[players.host.uid]:0,[players.guest.uid]:0,draw:0},moves:[],round:1,matchNumber:1,rematch:{host:false,guest:false}};
}
const isWinTtt = isTicTacToeWin;
const cfWinner = getConnectFourWin;
function quizDeck(settings, custom=[]){
  const cats=new Set(settings.categories?.length?settings.categories:CATEGORIES);
  let list=LOVE_BANK.filter(q=>cats.has(q[2])).map((q,i)=>({id:`love-${i}`,text:q[0],options:q[1],category:q[2]}));
  if(settings.source!=='custom') list=[...list]; else list=[];
  if(settings.source!=='diri') list.push(...custom.filter(x=>x.kind==='lovequiz'));
  const uniq=[...new Map(list.map(q=>[`${q.text}|${(q.options||[]).join('|')}`,q])).values()];
  return shuffle(uniq).slice(0,Math.max(1,Math.min(30,Number(settings.count)||10)));
}
function thisDeck(settings, custom=[]){
  const cats=new Set(settings.categories?.length?settings.categories:CATEGORIES);
  let list=THIS_OR_THAT_BANK.filter(q=>cats.has(q[3])).map((q,i)=>({id:`tot-${i}`,text:q[0],a:q[1],b:q[2],category:q[3]}));
  if(settings.source==='custom') list=[];
  if(settings.source!=='diri') list.push(...custom.filter(x=>x.kind==='thisorthat'));
  const uniq=[...new Map(list.map(q=>[`${q.text}|${q.a}|${q.b}`,q])).values()];
  return shuffle(uniq).slice(0,Math.max(1,Math.min(30,Number(settings.count)||10)));
}
function buildWordLevels(difficulty='mixed'){
  if(difficulty==='mixed') return shuffle(['easy','easy','medium','medium','hard','hard']);
  return Array(6).fill(['easy','medium','hard'].includes(difficulty)?difficulty:'easy');
}
function truthCards(settings, custom=[]){
  const cards=[]; if(settings.source!=='custom'){
    TRUTH_BANK.forEach((text,i)=>cards.push({id:`truth-${i}`,type:'truth',text,category:TD_CATEGORIES[i%TD_CATEGORIES.length],intensity:settings.intensity}));
    DARE_BANK.forEach((text,i)=>cards.push({id:`dare-${i}`,type:'dare',text,category:TD_CATEGORIES[i%TD_CATEGORIES.length],intensity:settings.intensity}));
  }
  if(settings.source!=='diri') cards.push(...custom.filter(x=>x.kind==='truthordare'));
  return shuffle(cards.filter(c=>settings.categories.includes(c.category)));
}
function createStartedState(old, players, custom=[]){
  const gameId=old.gameId, s=old.settings;
  if(gameId==='lovequiz') return {...old,phase:'question',questions:quizDeck(s,custom),questionIndex:0,turnIndex:0,submissions:{host:false,guest:false},nextReady:{host:false,guest:false},results:[],scores:{[players.host.uid]:0,[players.guest.uid]:0},matchPoints:0};
  if(gameId==='thisorthat') return {...old,phase:'question',questions:thisDeck(s,custom),questionIndex:0,submissions:{host:false,guest:false},nextReady:{host:false,guest:false},results:[],matchPoints:0,streak:0,bestStreak:0};
  if(gameId==='truthordare') return {...old,phase:'choose',round:1,initiatorUid:rand([players.host.uid,players.guest.uid]),cards:truthCards(s,custom),usedCardIds:[],skips:{[players.host.uid]:3,[players.guest.uid]:3},stats:{truth:{[players.host.uid]:0,[players.guest.uid]:0},dare:{[players.host.uid]:0,[players.guest.uid]:0},skips:{[players.host.uid]:0,[players.guest.uid]:0}},nextReady:{host:false,guest:false},currentCard:null,answerText:''};
  if(gameId==='memorycard'){
    const count={easy:8,medium:12,hard:18}[s.difficulty]||8; const by=s.imageHashesByUid||{}; const same=by[players.host.uid]?.length===by[players.guest.uid]?.length&&by[players.host.uid]?.length>=count&&JSON.stringify(by[players.host.uid])===JSON.stringify(by[players.guest.uid]);
    const customCount=s.deck==='custom'?count:(s.deck==='mixed'&&same?Math.min(Math.max(1,Math.floor(count/2)),by[players.host.uid].length):0); const useImages=customCount>0; const customEntries=useImages?by[players.host.uid].slice(0,customCount).map(hash=>({symbol:'',imageHash:hash})):[]; const presetEntries=shuffle(MEMORY_SYMBOLS).slice(0,count-customCount).map(symbol=>({symbol,imageHash:null})); const syms=[...customEntries,...presetEntries];
    const cards=shuffle(syms.flatMap((entry,i)=>[{id:`${i}a`,pairId:i,...entry},{id:`${i}b`,pairId:i,...entry}])).map(x=>({...x,faceUp:false,matched:false}));
    return {...old,phase:'playing',board:cards,customImagesUsed:useImages,turnUid:rand([players.host.uid,players.guest.uid]),openIds:[],scores:{[players.host.uid]:0,[players.guest.uid]:0},pairsFound:0,attempts:0,moves:0,mismatchAt:0,rematch:{host:false,guest:false}};
  }
  if(gameId==='drawguess'){
    const wordLevels=buildWordLevels(s.difficulty); const first=rand([players.host.uid,players.guest.uid]);
    return {...old,phase:'waiting-word',round:1,rounds:6,seconds:90,wordLevels,drawerUid:first,guesserUid:first===players.host.uid?players.guest.uid:players.host.uid,startedAt:null,deadline:null,strokes:[],guesses:[],hintUsed:false,hintRequests:{},hintDelivered:{},result:null,scores:{[players.host.uid]:0,[players.guest.uid]:0},roundResults:[]};
  }
  if(gameId==='tebakkata'){
    const wordLevels=buildWordLevels(s.difficulty); const first=rand([players.host.uid,players.guest.uid]);
    return {...old,phase:'waiting-word',round:1,rounds:6,seconds:90,wordLevels,clueUid:first,guesserUid:first===players.host.uid?players.guest.uid:players.host.uid,deadline:null,startedAt:null,clues:[],guesses:[],hintUsed:false,hintRequests:{},hintDelivered:{},skips:{[players.host.uid]:2,[players.guest.uid]:2},score:{[players.host.uid]:0,[players.guest.uid]:0},roundResults:[]};
  }
  return old;
}

export function mountGame(root, context){
  const {code,session,room,role,player,onBack,toast=()=>{}}=context;
  const gameId=session.gameId, sessionId=session.sessionId, myUid=player.uid;
  const players={host:room.host,guest:room.guest};
  const stateRef=ref(db,publicPath(code,sessionId));
  let state=null, localSecret='', localHint='', localItems=[], busy=false, timer=0, unsubscribe=null, drawCanvasCleanup=null, memoryMismatchTimer=0, lastRoomTouch=0, memoryUrls={}, serverOffset=0, preparingSecret=false, lastRoundSeen=0, drawColor='#34303c';
  const cleanup=()=>{ if(unsubscribe)unsubscribe(); if(timer)clearInterval(timer); if(memoryMismatchTimer)clearTimeout(memoryMismatchTimer); if(drawCanvasCleanup)drawCanvasCleanup(); Object.values(memoryUrls).forEach(URL.revokeObjectURL); root.removeEventListener('click',clickHandler);root.removeEventListener('submit',submitHandler);root.removeEventListener('change',changeHandler); };
  root.addEventListener('click',clickHandler); root.addEventListener('submit',submitHandler); root.addEventListener('change',changeHandler);

  async function init(){
    try{
      localItems=await getLocalCollection(`custom-${gameId}`);
      try { const offsetSnap=await get(ref(db,'.info/serverTimeOffset')); serverOffset=Number(offsetSnap.val())||0; } catch {}
      const snap=await get(stateRef);
      if(!snap.exists() && role==='host'){
        const initial=gameId==='tictactoe'?makeTttState(sessionId,players):gameId==='connectfour'?makeConnectState(sessionId,players):baseSetup(gameId,sessionId,players);
        await set(stateRef,initial);
      }
      unsubscribe=onValue(stateRef,s=>{
        const incoming=s.val(); if(!incoming){state=null;renderMissing();return;}
        if(incoming.round && incoming.round!==lastRoundSeen){lastRoundSeen=incoming.round;localHint='';localSecret='';}
        state=incoming;
        if(state.gameId==='memorycard') void hydrateMemoryMedia();
        if(state.gameId==='memorycard' && state.mismatchAt && state.openIds?.length===2) scheduleMemoryMismatch();
        render();
        if(state.gameId==='drawguess'||state.gameId==='tebakkata') void onSecretGameUpdate();
        if((state.gameId==='drawguess'||state.gameId==='tebakkata')&&state.hintDelivered?.[myUid]) void loadLocalHint();
        if(state.gameId==='lovequiz' && state.submissions?.host && state.submissions?.guest && state.phase==='question') void resolveLoveQuestion();
        if(state.gameId==='thisorthat' && state.submissions?.host && state.submissions?.guest && state.phase==='question') void resolveThisQuestion();
      },e=>toast('Koneksi game bermasalah: '+e.message,'error'));
    }catch(e){toast('Game gagal disiapkan: '+e.message,'error');}
  }
  function missingHtml(){return `<section class="panel game-panel"><h1>Game session not ready</h1><p>Host belum membuat state permainan. Minta host kembali ke lobby lalu mulai ulang.</p><button class="button" data-action="back-room">Kembali ke room</button></section>`;}
  function renderMissing(){root.innerHTML=missingHtml();}
  async function updateState(mutator){
    const result = await runTransaction(stateRef,current=>{ if(!current)return; const next=structuredClone(current); const outcome=mutator(next,current); if(outcome===false)return; return next; },{applyLocally:false});
    if(Date.now()-lastRoomTouch>60000){lastRoomTouch=Date.now();void update(ref(db,`rooms/${code}/lastMeaningfulActivityAt`),serverTimestamp()).catch(()=>{});}
    return result;
  }
  async function setPrivate(key,value,uid=myUid){ await set(ref(db,`${privatePath(code,gameId,sessionId,uid)}/${key}`),value); }
  async function getPrivate(key,uid=myUid){ const s=await get(ref(db,`${privatePath(code,gameId,sessionId,uid)}/${key}`)); return s.val(); }
  async function getAllPrivate(uid){ const s=await get(ref(db,privatePath(code,gameId,sessionId,uid))); return s.val()||{}; }
  const myRole=role;
  function render(){
    if(!state)return;
    if(state.phase==='setup'){root.innerHTML=renderSetup();return;}
    if(gameId==='tictactoe')root.innerHTML=renderTtt();
    else if(gameId==='connectfour')root.innerHTML=renderConnect();
    else if(gameId==='lovequiz')root.innerHTML=renderLove();
    else if(gameId==='thisorthat')root.innerHTML=renderThis();
    else if(gameId==='truthordare')root.innerHTML=renderTruthDare();
    else if(gameId==='memorycard')root.innerHTML=renderMemory();
    else if(gameId==='drawguess') {if(drawCanvasCleanup){drawCanvasCleanup();drawCanvasCleanup=null;}root.innerHTML=renderDrawGuess(); attachDrawCanvas();}
    else if(gameId==='tebakkata')root.innerHTML=renderTebakKata();
    else root.innerHTML=`<section class="panel game-panel"><h1>Unknown game</h1></section>`;
    if((gameId==='drawguess'||gameId==='tebakkata')&&state.phase==='playing')startClock();
  }
  function playerName(uid){return Object.values(players).find(p=>p?.uid===uid)?.name||'Player';}
  function playerPill(uid){return `<span class="player-pill">${esc(playerName(uid))}</span>`;}
  function topBar(sub='A little game for two'){return `<div class="game-topbar"><div><span class="eyebrow">DiRi PLAYROOM · ${esc(gameId.toUpperCase())}</span><h1>${esc(({tictactoe:'Tic Tac Toe',lovequiz:'Love Quiz',thisorthat:'This or That',truthordare:'Truth or Dare',memorycard:'Memory Card',connectfour:'Connect Four',drawguess:'Draw & Guess',tebakkata:'Tebak Kata'})[gameId])}</h1><p>${esc(sub)}</p></div><div class="game-top-actions"><span class="room-code-mini">${esc(code)}</span>${role==='host'?'<button class="button button-quiet" data-action="back-room">Room lobby</button>':'<span class="ready-chip">Waiting for host</span>'}</div></div>`;}
  function renderSetup(){
    const s=state.settings||DEFAULTS[gameId], approved=state.approvals||{};
    let controls='';
    if(gameId==='lovequiz') controls=`<label>Mode<select data-setting="mode" ${role!=='host'?'disabled':''}><option value="know" ${s.mode==='know'?'selected':''}>How Well You Know Me</option><option value="compat" ${s.mode==='compat'?'selected':''}>How Compatible Are We</option></select></label><label>Question source<select data-setting="source" ${role!=='host'?'disabled':''}><option value="diri" ${s.source==='diri'?'selected':''}>DiRi bank</option><option value="custom" ${s.source==='custom'?'selected':''}>Custom questions</option><option value="both" ${s.source==='both'?'selected':''}>Combined</option></select></label><label>Questions per session<input data-setting="count" type="number" min="1" max="30" value="${s.count}" ${role!=='host'?'disabled':''}></label>`;
    if(gameId==='thisorthat') controls=`<label>Question source<select data-setting="source" ${role!=='host'?'disabled':''}><option value="diri" ${s.source==='diri'?'selected':''}>DiRi bank</option><option value="custom" ${s.source==='custom'?'selected':''}>Custom questions</option><option value="both" ${s.source==='both'?'selected':''}>Combined</option></select></label><label>Questions<input data-setting="count" type="number" min="1" max="30" value="${s.count}" ${role!=='host'?'disabled':''}></label>`;
    if(gameId==='truthordare') controls=`<label>Mode<select data-setting="mode" ${role!=='host'?'disabled':''}><option value="self" ${s.mode==='self'?'selected':''}>Self Selection</option><option value="partner" ${s.mode==='partner'?'selected':''}>Partner Challenge</option></select></label><label>Intensity<select data-setting="intensity" ${role!=='host'?'disabled':''}><option ${s.intensity==='Sweet'?'selected':''}>Sweet</option><option ${s.intensity==='Funny'?'selected':''}>Funny</option><option ${s.intensity==='Deep'?'selected':''}>Deep</option><option ${s.intensity==='Challenge'?'selected':''}>Challenge</option></select></label><label>Rounds<input data-setting="rounds" type="number" min="1" max="20" value="${s.rounds}" ${role!=='host'?'disabled':''}></label>`;
    if(gameId==='memorycard') controls=`<label>Mode<select data-setting="mode" ${role!=='host'?'disabled':''}><option value="duel" ${s.mode==='duel'?'selected':''}>Memory Duel</option><option value="together" ${s.mode==='together'?'selected':''}>Together Mode</option></select></label><label>Difficulty<select data-setting="difficulty" ${role!=='host'?'disabled':''}><option value="easy" ${s.difficulty==='easy'?'selected':''}>Easy · 4×4</option><option value="medium" ${s.difficulty==='medium'?'selected':''}>Medium · 4×6</option><option value="hard" ${s.difficulty==='hard'?'selected':''}>Hard · 6×6</option></select></label><label>Deck<select data-setting="deck" ${role!=='host'?'disabled':''}><option value="diri" ${s.deck==='diri'?'selected':''}>DiRi Preset</option><option value="custom" ${s.deck==='custom'?'selected':''}>Custom photo set</option><option value="mixed" ${s.deck==='mixed'?'selected':''}>Mixed</option></select></label>`;
    if(gameId==='drawguess') controls=`<label>Difficulty<select data-setting="difficulty" ${role!=='host'?'disabled':''}><option value="easy" ${s.difficulty==='easy'?'selected':''}>Easy</option><option value="medium" ${s.difficulty==='medium'?'selected':''}>Medium</option><option value="hard" ${s.difficulty==='hard'?'selected':''}>Hard</option><option value="mixed" ${s.difficulty==='mixed'?'selected':''}>Mixed</option></select></label><div class="field-note">6 rounds · 90 seconds each · one hint per round.</div>`;
    if(gameId==='tebakkata') controls=`<label>Mode<select data-setting="mode" ${role!=='host'?'disabled':''}><option value="classic" ${s.mode==='classic'?'selected':''}>Classic Clue</option><option value="forbidden" ${s.mode==='forbidden'?'selected':''}>Forbidden Words</option></select></label><label>Difficulty<select data-setting="difficulty" ${role!=='host'?'disabled':''}><option value="easy" ${s.difficulty==='easy'?'selected':''}>Easy</option><option value="medium" ${s.difficulty==='medium'?'selected':''}>Medium</option><option value="hard" ${s.difficulty==='hard'?'selected':''}>Hard</option><option value="mixed" ${s.difficulty==='mixed'?'selected':''}>Mixed</option></select></label><div class="field-note">6 rounds · 90 seconds each · 2 Skip tokens per player.</div>`;
    const catOptions=(gameId==='truthordare'?TD_CATEGORIES:CATEGORIES).map(c=>`<label class="check-option"><input type="checkbox" data-category="${esc(c)}" ${s.categories?.includes(c)?'checked':''} ${role!=='host'?'disabled':''}>${esc(c)}</label>`).join('');
    const categoryBlock=['lovequiz','thisorthat','truthordare','tebakkata'].includes(gameId)?`<div class="field-group"><span class="field-label">Categories</span><div class="category-checks">${catOptions}</div></div>`:'';
    const customLabel=gameId==='lovequiz'?'Question|Option A|Option B|Option C|Option D':gameId==='thisorthat'?'Question|Option A|Option B':gameId==='truthordare'?'Dare|Text or Truth text':gameId==='drawguess'?'Word|easy/medium/hard':gameId==='tebakkata'?'Word|easy/medium/hard|forbidden1,forbidden2|alternative1,alternative2':'Secret word';
    const memoryUpload=gameId==='memorycard'?`<div class="custom-library-box"><strong>Our Memories · Local image deck</strong><p>Untuk memakai foto custom, kedua perangkat harus mengimpor file gambar yang sama dalam urutan yang sama. File tetap berada di perangkat; database hanya menyimpan hash.</p><input type="file" accept="image/*" multiple data-memory-files><small>Upload maksimal 18 gambar. Untuk Deck Custom, kedua pemain wajib memilih file yang sama dan urutannya sama.</small></div>`:'';
    const addCustom=(['lovequiz','thisorthat','truthordare','drawguess','tebakkata'].includes(gameId))?`<div class="custom-library-box"><strong>Personal Custom Library</strong><p>Tambahkan konten khusus ke koleksi pribadi browser ini. Bagikan snapshot ke room sebelum mulai.</p><form data-form="custom-item"><input name="customText" placeholder="${esc(customLabel)}" required><button class="button button-small button-secondary" type="submit">Save to my library</button></form><button class="button button-small button-quiet" data-action="share-custom">Share my custom items (${localItems.length})</button><button class="button button-small button-quiet" data-action="export-custom">Export JSON</button><label class="button button-small button-quiet file-button">Import JSON<input type="file" accept="application/json,.json" data-import-custom hidden></label><small>${localItems.length} item tersimpan di perangkat ini. ${['drawguess','tebakkata'].includes(gameId)?'Daftar kata disimpan privat pada setiap pemain.':''}</small></div>`:'';
    return `${topBar('Set the rules together before the first round.')}<section class="panel game-panel setup-panel"><div class="setup-heading"><span class="game-symbol">♡</span><div><h2>Game setup</h2><p>Host mengatur pilihan. Kedua pemain wajib menyetujui pengaturan yang sama sebelum mulai.</p></div></div><div class="setup-grid">${controls}</div>${categoryBlock}${memoryUpload}${addCustom}<div class="approval-grid"> <div><strong>Host</strong><span class="ready-chip ${approved.host?'done':''}">${approved.host?'Approved':'Waiting approval'}</span></div><div><strong>Guest</strong><span class="ready-chip ${approved.guest?'done':''}">${approved.guest?'Approved':'Waiting approval'}</span></div></div><div class="ready-panel"><div class="ready-copy"><strong>${approved.host&&approved.guest?'Both approved':'Mutual approval required'}</strong><span>${role==='host'?'Host can start once both approvals are complete.':'Review the configuration, then approve it.'}</span></div><div class="ready-actions"><button class="button button-secondary" data-action="approve-setup">${approved[role]?'Cancel approval':'Approve setup'}</button>${role==='host'?`<button class="button button-primary" data-action="start-session" ${approved.host&&approved.guest?'':'disabled'}>Start game</button>`:''}</div></div></section>`;
  }
  function renderTtt(){
    const board=state.board||Array(9).fill(null), winner=state.winnerUid, finished=state.phase==='result';
    const cells=board.map((v,i)=>`<button class="ttt-cell ${v?'filled':''}" data-action="ttt-move" data-index="${i}" ${v||finished||state.turnUid!==myUid?'disabled':''}>${v||''}</button>`).join('');
    return `${topBar('Three in a row. One little victory.')}<section class="panel game-panel"><div class="game-status-line">${finished?winner?`${esc(playerName(winner))} wins this round`:'It is a draw':`Turn: ${esc(playerName(state.turnUid))}`}</div><div class="ttt-board">${cells}</div><div class="score-line">${Object.entries(state.scores||{}).filter(([u])=>u!=='draw').map(([u,n])=>`<span>${esc(playerName(u))}: <b>${n}</b></span>`).join('')}<span>Draws: <b>${state.scores?.draw||0}</b></span></div>${finished?renderRematch():`<p class="hint">You play ${state.symbols?.[myUid]||'?'}. Wait for your turn if the other player is active.</p>`}</section>`;
  }
  function renderConnect(){
    const winner=state.phase==='result'; const board=state.board||Array(42).fill(null);
    const cols=Array.from({length:7},(_,c)=>`<button class="cf-column" data-action="cf-drop" data-col="${c}" ${winner||state.turnUid!==myUid?'disabled':''} aria-label="Drop in column ${c+1}">${Array.from({length:6},(_,r)=>{const v=board[r*7+c];return `<span class="cf-slot ${v?'filled '+(v===players.host.uid?'host-token':'guest-token'):''}">${v?(state.theme==='heart'?'♥':'●'):''}</span>`}).join('')}</button>`).join('');
    return `${topBar('Plan ahead, connect four.')}<section class="panel game-panel"><div class="game-status-line">${winner?state.winnerUid?`${esc(playerName(state.winnerUid))} wins!`:'Draw game':`Turn: ${esc(playerName(state.turnUid))}`}</div><div class="cf-board">${cols}</div><div class="score-line">${Object.entries(state.scores||{}).filter(([u])=>u!=='draw').map(([u,n])=>`<span>${esc(playerName(u))}: <b>${n}</b></span>`).join('')}<span>Draws: <b>${state.scores?.draw||0}</b></span></div><button class="button button-small button-quiet" data-action="toggle-cf-theme">${state.theme==='heart'?'Use pastel tokens':'Use Heart Theme'}</button>${winner?renderRematch():''}</section>`;
  }
  function renderRematch(){return `<div class="rematch-box"><p>Rematch needs both players' approval.</p><div class="approval-grid"><span>Host ${state.rematch?.host?'✓':'…'}</span><span>Guest ${state.rematch?.guest?'✓':'…'}</span></div><button class="button button-primary" data-action="request-rematch">${state.rematch?.[role]?'Cancel rematch':'Approve rematch'}</button></div>`;}
  function renderLove(){
    if(state.phase==='result') return `${topBar('A little look at how well you know each other.')}<section class="panel game-panel"><h2>Love Quiz complete ♡</h2>${state.settings.mode==='compat'?`<div class="big-score">${Math.round((state.matchPoints||0)/(state.results?.length||1)*100)}%</div><p>Compatibility snapshot: ${state.matchPoints||0} matching answers from ${state.results?.length||0} questions.</p>`:`<p>Correct guesses: ${state.matchPoints||0}</p><p>${state.results?.length||0} answers revealed across two sessions.</p>`}${(state.results||[]).map((r,i)=>`<div class="result-row"><strong>${i+1}. ${esc(r.question)}</strong><span>${esc(r.label||'Revealed')}</span></div>`).join('')}${renderRematch()}</section>`;
    const q=state.questions?.[state.questionIndex]; if(!q)return `<section class="panel game-panel"><p>Preparing questions…</p></section>`;
    const targetUid=state.settings.mode==='know'?(state.turnIndex===0?players.host.uid:players.guest.uid):null;
    const target=targetUid===myUid, submitted=state.submissions?.[role], both=state.submissions?.host&&state.submissions?.guest;
    const opts=q.options||[];
    const reveal=state.currentResult;
    const answerKey=`q${state.turnIndex}_${state.questionIndex}`;
    const revealHtml=reveal?`<div class="result-card"><span class="eyebrow">REVEAL</span><h3>${esc(reveal.question)}</h3><p>Host: <b>${esc(reveal.hostAnswer)}</b></p><p>Guest: <b>${esc(reveal.guestAnswer)}</b></p><strong>${reveal.match?'Same answer! +1 Match Point':'Different answers — tell each other why!'}</strong></div>`:'';
    return `${topBar(state.settings.mode==='know'?(target?`Your turn to answer about yourself.`:`Guess what ${playerName(targetUid)} would choose.`):'Both answer separately. Reveal after both submit.')}<section class="panel game-panel"><div class="progress-label">Question ${state.questionIndex+1} / ${state.questions.length} · Session ${state.settings.mode==='know'?state.turnIndex+1:1}</div><h2 class="question-title">${esc(q.text)}</h2><div class="answer-options">${opts.map((o,i)=>`<button class="answer-option" data-action="quiz-answer" data-answer="${i}" ${submitted||reveal?'disabled':''}>${String.fromCharCode(65+i)}. ${esc(o)}</button>`).join('')}</div>${submitted&&!reveal?'<p class="waiting-note">Your answer is locked. Waiting for your partner…</p>':''}${revealHtml}${reveal?`<button class="button button-primary" data-action="next-question">${state.questionIndex===state.questions.length-1&&!(state.settings.mode==='know'&&state.turnIndex===0)?'Finish':'Next question'}</button>`:''}<p class="hint">Answers stay private until both players submit.</p></section>`;
  }
  function renderThis(){
    if(state.phase==='result') return `${topBar('A little snapshot of your shared preferences.')}<section class="panel game-panel"><h2>That is your match score ♡</h2><div class="big-score">${Math.round((state.matchPoints||0)/(state.questions?.length||1)*100)}%</div><p>${state.matchPoints||0} of ${state.questions?.length||0} same choices · Best streak ${state.bestStreak||0}</p>${(state.results||[]).map((r,i)=>`<div class="result-row"><strong>${i+1}. ${esc(r.question)}</strong><span>${r.match?'♡ Match':'Different choices'}</span></div>`).join('')}${renderRematch()}</section>`;
    const q=state.questions?.[state.questionIndex]; if(!q)return `${topBar()}<section class="panel game-panel">Preparing…</section>`;
    const submitted=state.submissions?.[role], reveal=state.currentResult;
    return `${topBar('One question. Two choices. Reveal together.')}<section class="panel game-panel"><div class="progress-label">Question ${state.questionIndex+1} / ${state.questions.length}</div><h2 class="question-title">${esc(q.text)}</h2><div class="two-choice-grid"><button class="choice-card" data-action="this-answer" data-answer="0" ${submitted||reveal?'disabled':''}><span>A</span><strong>${esc(q.a)}</strong></button><button class="choice-card lavender" data-action="this-answer" data-answer="1" ${submitted||reveal?'disabled':''}><span>B</span><strong>${esc(q.b)}</strong></button></div>${submitted&&!reveal?'<p class="waiting-note">Choice locked. Waiting for your partner…</p>':''}${reveal?`<div class="result-card"><strong>${reveal.match?'Same choice! Match point +1.':'Different choices — tell each other why!'}</strong><p>Host: ${reveal.hostAnswer==='0'?esc(q.a):esc(q.b)}</p><p>Guest: ${reveal.guestAnswer==='0'?esc(q.a):esc(q.b)}</p><p>Current streak: ${reveal.streak}</p></div><button class="button button-primary" data-action="next-question">${state.questionIndex===state.questions.length-1?'Finish':'Next question'}</button>`:''}</section>`;
  }
  function renderTruthDare(){
    if(state.phase==='result') return `${topBar('Stories, surprises, and sweet challenges.')}<section class="panel game-panel"><h2>Truth or Dare complete ✨</h2><p>Truth completed: ${Object.values(state.stats.truth).reduce((a,b)=>a+b,0)}</p><p>Dare completed: ${Object.values(state.stats.dare).reduce((a,b)=>a+b,0)}</p><p>Skipped: ${Object.values(state.stats.skips).reduce((a,b)=>a+b,0)}</p>${renderRematch()}</section>`;
    const initiator=state.initiatorUid===myUid, card=state.currentCard, targetUid=card?.targetUid||state.initiatorUid;
    const isTarget=targetUid===myUid;
    const skipButton=isTarget&&state.phase==='response'?`<button class="button button-quiet" data-action="td-skip" ${state.skips?.[myUid]===0?'disabled':''}>Skip this card (${state.skips?.[myUid]||0} left)</button>`:'';
    const nextStatus=`<p class="small-note">Next turn · Host ${state.nextReady?.host?'Ready':'waiting'} · Guest ${state.nextReady?.guest?'Ready':'waiting'}</p>`;
    return `${topBar(`Round ${state.round} / ${state.settings.rounds} · ${state.settings.mode==='self'?'Self Selection':'Partner Challenge'}`)}<section class="panel game-panel"><div class="game-status-line">${initiator?'Your turn to choose.':`${esc(playerName(state.initiatorUid))} is choosing.`}</div><div class="skip-line">Your skips: ${state.skips?.[myUid]??0} · Partner: ${state.skips?.[players[opposite(role)]?.uid]??0}</div>${state.phase==='choose'?`<div class="answer-options"><button class="answer-option" data-action="td-type" data-type="truth" ${!initiator?'disabled':''}>♡ Truth</button><button class="answer-option" data-action="td-type" data-type="dare" ${!initiator?'disabled':''}>✧ Dare</button></div>`:`<div class="result-card"><span class="eyebrow">${esc(card.type.toUpperCase())} · ${esc(card.category)}</span><h2>${esc(card.text)}</h2><p>Target: ${esc(playerName(targetUid))}</p>${state.phase==='response'&&isTarget?(card.type==='truth'?`<form data-form="td-response"><textarea name="response" placeholder="Your answer…" required></textarea><button class="button button-primary" type="submit">Submit answer</button></form>`:`<button class="button button-primary" data-action="td-done">I did it!</button>`):state.phase==='response'?'<p class="waiting-note">Waiting for target response.</p>':`<p>${esc(state.lastResponse||'Round complete.')}</p>${nextStatus}<button class="button button-primary" data-action="td-next" ${state.nextReady?.[role]?'disabled':''}>${state.nextReady?.[role]?'Waiting for partner…':'Continue'}</button>`}${skipButton}</div>`}</section>`;
  }
  function renderMemory(){
    const total=state.board?.length||0, done=state.pairsFound||0, result=state.phase==='result';
    return `${topBar(`${state.settings.mode==='duel'?'Memory Duel':'Together Mode'} · ${state.settings.difficulty.toUpperCase()}`)}<section class="panel game-panel"><div class="game-status-line">${result?'All pairs found!':`Turn: ${esc(playerName(state.turnUid))} · Pairs ${done}/${total/2}`}</div><div class="memory-board diff-${state.settings.difficulty}">${(state.board||[]).map((c,i)=>{const face=c.matched||c.faceUp;const media=face&&c.imageHash?memoryUrls[c.imageHash]:null;return `<button class="memory-card ${c.matched?'matched':''} ${c.faceUp?'face-up':''}" data-action="memory-flip" data-index="${i}" ${c.matched||c.faceUp||state.phase!=='playing'||state.turnUid!==myUid||state.openIds?.length>=2?'disabled':''}>${face?(media?`<img src="${media}" alt="Memory">`:esc(c.symbol||'♡')):'♡'}</button>`;}).join('')}</div><p class="hint">${state.customImagesUsed?'Our Memories deck is active.':'DiRi preset deck is active. For custom photos, both players must import the identical files before Start.'}</p><div class="score-line">${state.settings.mode==='duel'?Object.entries(state.scores||{}).map(([u,n])=>u==='draw'?'':`<span>${esc(playerName(u))}: <b>${n}</b></span>`).join(''):`Attempts: ${state.attempts||0}`}</div>${result?renderRematch():''}</section>`;
  }
  function renderDrawGuess(){
    if(state.phase==='result-game') return `${topBar('Every drawing tells a little story.')}<section class="panel game-panel"><h2>Draw & Guess complete</h2><p>${esc(playerName(players.host.uid))}: ${state.scores?.[players.host.uid]||0} · ${esc(playerName(players.guest.uid))}: ${state.scores?.[players.guest.uid]||0}</p>${renderRematch()}</section>`;
    const drawer=state.drawerUid===myUid, remaining=Math.max(0,Math.ceil(((state.deadline||Date.now()+serverOffset)-(Date.now()+serverOffset))/1000));
    const secret=drawer?localSecret:'Guess the word';
    const resultBlock=state.phase==='round-result'?`<div class="result-card"><strong>${esc(state.result?.word||'Round finished')}</strong><p>${esc(state.result?.message||'')}</p><p class="small-note">Next round · Host ${state.nextReady?.host?'Ready':'waiting'} · Guest ${state.nextReady?.guest?'Ready':'waiting'}</p><button class="button button-primary" data-action="round-next" ${state.nextReady?.[role]?'disabled':''}>${state.nextReady?.[role]?'Waiting for partner…':'Ready for next round'}</button></div>`:'';
    const controls=state.phase==='playing'?(drawer?`<div class="draw-tools"><button class="button button-small" data-color="#34303c">Black</button><button class="button button-small" data-color="#e28db4">Pink</button><button class="button button-small" data-color="#9b8bd0">Lavender</button><button class="button button-small" data-action="draw-undo">Undo</button><button class="button button-small" data-action="draw-clear">Clear</button></div>`:`<form data-form="draw-guess"><input name="guess" placeholder="Your guess…" required><button class="button button-primary" type="submit">Guess</button></form><button class="button button-small button-quiet" data-action="draw-hint" ${state.hintUsed?'disabled':''}>Hint (${state.hintUsed?'used':'1'})</button>${localHint?`<p class="hint">Hint: ${esc(localHint)}</p>`:''}`):'';
    return `${topBar(`Round ${state.round}/6 · ${drawer?'You are drawing':'You are guessing'}`)}<section class="panel game-panel"><div class="game-status-line">${drawer?`Draw: ${esc(secret||'Preparing secret word…')}`:`Category: ${esc(state.category||'Random')}`} · <b data-timer>${remaining}s</b></div><canvas id="draw-canvas" width="900" height="500" class="draw-canvas"></canvas>${controls}<div class="score-line">${Object.entries(state.scores||{}).map(([u,n])=>`<span>${esc(playerName(u))}: <b>${n}</b></span>`).join('')}</div>${resultBlock}</section>`;
  }
  function renderTebakKata(){
    if(state.phase==='result-game')return `${topBar('Find the word, one clue at a time.')}<section class="panel game-panel"><h2>Tebak Kata complete</h2><p>${esc(playerName(players.host.uid))}: ${state.score?.[players.host.uid]||0} · ${esc(playerName(players.guest.uid))}: ${state.score?.[players.guest.uid]||0}</p>${renderRematch()}</section>`;
    const clue=state.clueUid===myUid, remaining=Math.max(0,Math.ceil(((state.deadline||Date.now()+serverOffset)-(Date.now()+serverOffset))/1000));
    const resultBlock=state.phase==='round-result'?`<div class="result-card"><strong>${esc(state.result?.word||'Round ended')}</strong><p>${esc(state.result?.message||'')}</p><p class="small-note">Next round · Host ${state.nextReady?.host?'Ready':'waiting'} · Guest ${state.nextReady?.guest?'Ready':'waiting'}</p><button class="button button-primary" data-action="round-next" ${state.nextReady?.[role]?'disabled':''}>${state.nextReady?.[role]?'Waiting for partner…':'Ready for next round'}</button></div>`:'';
    const active=state.phase==='playing'?(clue?`<div class="result-card"><span class="eyebrow">SECRET WORD</span><h2>${esc(localSecret||'Preparing…')}</h2>${state.settings.mode==='forbidden'?`<p>Do not say: ${esc((localSecret&&FORBIDDEN_WORDS[localSecret])?.join(', ')||'Use the registered forbidden list')}</p>`:''}</div><form data-form="tebak-clue"><input name="clue" placeholder="Write a clue for your partner…" required><button class="button button-primary" type="submit">Send clue</button></form><button class="button button-small button-quiet" data-action="tebak-skip" ${!state.skips?.[myUid]?'disabled':''}>Skip word (${state.skips?.[myUid]||0} left)</button>`:`<div class="clue-list">${(state.clues||[]).map(c=>`<p>${esc(c.text)}</p>`).join('')}</div><form data-form="tebak-guess"><input name="guess" placeholder="Guess the word…" required><button class="button button-primary" type="submit">Submit guess</button></form><button class="button button-small button-quiet" data-action="tebak-hint" ${state.hintUsed?'disabled':''}>Hint (${state.hintUsed?'used':'1'})</button>${localHint?`<p class="hint">Hint: ${esc(localHint)}</p>`:''}<button class="button button-small button-quiet" data-action="tebak-giveup" ${!state.skips?.[myUid]?'disabled':''}>Give up (${state.skips?.[myUid]||0} left)</button>`):'';
    return `${topBar(`Round ${state.round}/6 · ${clue?'You give clues':'You guess'}`)}<section class="panel game-panel"><div class="game-status-line"><b data-timer>${remaining}s</b> · ${state.settings.mode==='forbidden'?'Forbidden Words':'Classic Clue'}</div>${active}<div class="skip-line">Skip tokens: ${state.skips?.[myUid]||0}</div>${resultBlock}<div class="score-line">${Object.entries(state.score||{}).map(([u,n])=>`<span>${esc(playerName(u))}: <b>${n}</b></span>`).join('')}</div></section>`;
  }
  async function handleSetupChange(){
    if(role!=='host')return;
    const settings=structuredClone(state.settings||{});
    root.querySelectorAll('[data-setting]').forEach(el=>{settings[el.dataset.setting]=el.type==='number'?Number(el.value):el.value;});
    if (Number.isFinite(settings.count)) settings.count=Math.max(1,Math.min(30,Math.round(settings.count)));
    if (Number.isFinite(settings.rounds)) settings.rounds=Math.max(1,Math.min(20,Math.round(settings.rounds)));
    const cats=[...root.querySelectorAll('[data-category]:checked')].map(x=>x.dataset.category);
    if (root.querySelector('[data-category]')) settings.categories=cats.length?cats:(gameId==='truthordare'?TD_CATEGORIES:CATEGORIES);
    await updateState(s=>{s.settings=settings;s.approvals={host:false,guest:false};s.ready={host:false,guest:false};});
  }
  async function begin(){
    if(role!=='host')return;
    const snap=await get(stateRef), curr=snap.val(); if(!curr?.approvals?.host||!curr?.approvals?.guest)throw new Error('Kedua pemain harus menyetujui setup.');
    const custom=(gameId==='drawguess'||gameId==='tebakkata')?[]:[...(curr.settings.customItems?.[players.host.uid]||[]),...(curr.settings.customItems?.[players.guest.uid]||[])];
    if(gameId==='lovequiz' && quizDeck(curr.settings,custom).length < Math.max(1,Number(curr.settings.count)||10)) throw new Error('Soal yang tersedia belum cukup. Tambahkan soal custom atau pilih sumber DiRi/gabungan.');
    if(gameId==='thisorthat' && thisDeck(curr.settings,custom).length < Math.max(1,Number(curr.settings.count)||10)) throw new Error('Pertanyaan yang tersedia belum cukup. Tambahkan pertanyaan custom atau pilih sumber DiRi/gabungan.');
    if(gameId==='truthordare' && truthCards(curr.settings,custom).length < Math.max(1,Number(curr.settings.rounds)||10)) throw new Error('Kartu Truth/Dare untuk kategori terpilih belum cukup. Pilih kategori lain atau tambahkan kartu custom.');
    if(gameId==='memorycard' && curr.settings.deck==='custom') { const by=curr.settings.imageHashesByUid||{}; const count={easy:8,medium:12,hard:18}[curr.settings.difficulty]||8; if(by[players.host.uid]?.length<count||JSON.stringify(by[players.host.uid])!==JSON.stringify(by[players.guest.uid])) throw new Error(`Deck Custom memerlukan ${count} file gambar yang sama dalam urutan sama pada kedua perangkat.`); }
    await updateState(s=>{const started=createStartedState(s,players,custom);Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,started);});
    if(gameId==='drawguess'||gameId==='tebakkata') await prepareSecretRound();
  }
  async function shareCustom(){
    const items=await getLocalCollection(`custom-${gameId}`);
    if(gameId==='drawguess'||gameId==='tebakkata'){
      // Word lists are private to their contributor until that player becomes the active clue-giver/drawer.
      await setPrivate('custom-word-bank',items);
      await updateState(s=>{s.settings.customSharedByUid=s.settings.customSharedByUid||{};s.settings.customSharedByUid[myUid]=items.length;s.approvals={host:false,guest:false};});
    }else{
      await updateState(s=>{s.settings.customItems=s.settings.customItems||{};s.settings.customItems[myUid]=items; s.approvals={host:false,guest:false};});
    }
    toast(`${items.length} custom items shared for this room. Secret word lists remain private.`,'success');
  }
  async function saveCustom(form){
    const text=form.elements.customText.value.trim(); if(!text)return;
    const parts=text.split('|').map(x=>x.trim());
    let item;
    if(gameId==='lovequiz'){if(parts.length!==5||parts.some(x=>!x))throw new Error('Format Love Quiz: pertanyaan|opsi A|opsi B|opsi C|opsi D. Semua bagian wajib diisi.');if(new Set(parts.slice(1).map(x=>x.toLowerCase())).size!==4)throw new Error('Keempat opsi Love Quiz harus berbeda.');item={id:randomId(),kind:gameId,text:parts[0],options:parts.slice(1),category:'Relationship'};}
    else if(gameId==='thisorthat'){if(parts.length!==3||parts.some(x=>!x))throw new Error('Format This or That: pertanyaan|opsi A|opsi B. Semua bagian wajib diisi.');if(parts[1].toLowerCase()===parts[2].toLowerCase())throw new Error('Opsi A dan B harus berbeda.');item={id:randomId(),kind:gameId,text:parts[0],a:parts[1],b:parts[2],category:'Random & Funny'};}
    else if(gameId==='truthordare'){const type=parts.length>1&&parts[0].toLowerCase()==='dare'?'dare':'truth';item={id:randomId(),kind:gameId,text:parts.length>1?parts.slice(1).join('|'):parts[0],type,category:'Personal',intensity:'Sweet'};}
    else if(gameId==='drawguess'){item={id:randomId(),kind:gameId,text:parts[0],category:'Custom',difficulty:['easy','medium','hard'].includes(parts[1]?.toLowerCase())?parts[1].toLowerCase():'medium'};}
    else if(gameId==='tebakkata'){item={id:randomId(),kind:gameId,text:parts[0],category:'Custom',difficulty:['easy','medium','hard'].includes(parts[1]?.toLowerCase())?parts[1].toLowerCase():'medium',forbidden:(parts[2]||'').split(',').map(x=>x.trim()).filter(Boolean),alternatives:(parts[3]||'').split(',').map(x=>x.trim()).filter(Boolean)};}
    else item={id:randomId(),kind:gameId,text:parts[0],category:'Custom',difficulty:'medium'};
    await saveLocalItem(`custom-${gameId}`,item); localItems=await getLocalCollection(`custom-${gameId}`); render(); toast('Saved to your personal library on this device.');
  }
  async function exportCustom(){
    const items=await getLocalCollection(`custom-${gameId}`);
    const blob=new Blob([JSON.stringify({format:'diri-custom-library',version:1,gameId,items},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`diri-${gameId}-custom-library.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importCustom(file){
    if(!file)return;const data=JSON.parse(await file.text());
    if(data?.format!=='diri-custom-library'||!Array.isArray(data.items))throw new Error('File JSON bukan koleksi custom DiRi yang valid.');
    const valid=data.items.filter(x=>x&&typeof x.text==='string'&&x.text.trim()&&x.kind===gameId).slice(0,300);
    for(const item of valid)await saveLocalItem(`custom-${gameId}`,{...item,id:item.id||randomId()});
    localItems=await getLocalCollection(`custom-${gameId}`);render();toast(`${valid.length} item berhasil diimpor ke Personal Library.`,'success');
  }
  async function rematch(){
    await updateState(s=>{s.rematch=s.rematch||{host:false,guest:false};s.rematch[role]=!s.rematch[role];if(s.rematch.host&&s.rematch.guest){const scores=s.scores||s.score||{};const n=(s.matchNumber||1)+1;let next=gameId==='tictactoe'?makeTttState(sessionId,players):gameId==='connectfour'?makeConnectState(sessionId,players):null;if(next){next.scores=scores;next.matchNumber=n;Object.assign(s,next);}else{s.phase='setup';s.matchNumber=n;s.approvals={host:false,guest:false};s.results=[];s.rematch={host:false,guest:false};}}});
  }
  async function tttMove(index){
    await updateState(s=>{if(s.phase!=='playing'||s.turnUid!==myUid||s.board[index])return false;const mark=s.symbols[myUid];s.board[index]=mark;s.moves.push({uid:myUid,index,at:Date.now()});if(isWinTtt(s.board,mark)){s.phase='result';s.winnerUid=myUid;s.scores[myUid]=(s.scores[myUid]||0)+1;}else if(s.board.every(Boolean)){s.phase='result';s.winnerUid=null;s.scores.draw=(s.scores.draw||0)+1;}else{s.turnUid=players.host.uid===myUid?players.guest.uid:players.host.uid;}});
  }
  async function cfDrop(col){
    await updateState(s=>{if(s.phase!=='playing'||s.turnUid!==myUid)return false;let row=-1;for(let r=5;r>=0;r--)if(!s.board[r*7+col]){row=r;break;}if(row<0)return false;s.board[row*7+col]=myUid;s.moves.push({uid:myUid,col,row,at:Date.now()});const win=cfWinner(s.board);if(win){s.phase='result';s.winnerUid=myUid;s.winningCells=win.cells;s.scores[myUid]=(s.scores[myUid]||0)+1;}else if(s.board.every(Boolean)){s.phase='result';s.winnerUid=null;s.scores.draw=(s.scores.draw||0)+1;}else{s.turnUid=players.host.uid===myUid?players.guest.uid:players.host.uid;}});
  }
  async function quizAnswer(index){
    if(state.submissions?.[role])return;
    const q=state.questions[state.questionIndex]; await setPrivate(`q${state.turnIndex}_${state.questionIndex}`,{answer:index,submittedAt:Date.now()});
    await updateState(s=>{if(s.phase!=='question'||s.submissions?.[role])return false;s.submissions[role]=true;});
  }
  async function resolveLoveQuestion(){
    try{
      const question=state.questions[state.questionIndex], targetUid=state.settings.mode==='know'?(state.turnIndex===0?players.host.uid:players.guest.uid):null;
      const h=await getPrivate(`q${state.turnIndex}_${state.questionIndex}`,players.host.uid),g=await getPrivate(`q${state.turnIndex}_${state.questionIndex}`,players.guest.uid);
      if(!h||!g)return;
      const match=h.answer===g.answer, guesserUid=targetUid?(targetUid===players.host.uid?players.guest.uid:players.host.uid):null;
      await updateState(s=>{if(s.currentResult)return false;const r={question:question.text,hostAnswer:question.options[h.answer],guestAnswer:question.options[g.answer],match,label:match?'Match':'Different'};s.currentResult=r;s.results.push(r);if(s.settings.mode==='compat'){if(match)s.matchPoints++;}else if(match){s.scores[guesserUid]=(s.scores[guesserUid]||0)+1;s.matchPoints++;}});
    }catch(e){console.warn('Love Quiz reveal will retry',e);}
  }
  async function thisAnswer(index){
    if(state.submissions?.[role])return;
    await setPrivate(`this-${state.questionIndex}`,{answer:index,submittedAt:Date.now()});
    await updateState(s=>{if(s.phase!=='question'||s.submissions[role])return false;s.submissions[role]=true;});
  }
  async function resolveThisQuestion(){
    try{const h=await getPrivate(`this-${state.questionIndex}`,players.host.uid),g=await getPrivate(`this-${state.questionIndex}`,players.guest.uid);if(!h||!g)return;const match=h.answer===g.answer;
      await updateState(s=>{if(s.currentResult)return false;s.streak=match?(s.streak||0)+1:0;s.bestStreak=Math.max(s.bestStreak||0,s.streak);if(match)s.matchPoints++;s.currentResult={match,hostAnswer:String(h.answer),guestAnswer:String(g.answer),streak:s.streak,question:s.questions[s.questionIndex].text};s.results.push(s.currentResult);});
    }catch(e){console.warn(e);}
  }
  async function nextQuestion(){
    await updateState(s=>{if(!s.currentResult)return false;s.nextReady=s.nextReady||{host:false,guest:false};s.nextReady[role]=true;if(s.nextReady.host&&s.nextReady.guest){s.currentResult=null;s.submissions={host:false,guest:false};s.nextReady={host:false,guest:false};s.questionIndex++;if(s.questionIndex>=s.questions.length){if(s.settings.mode==='know'&&s.turnIndex===0){s.turnIndex=1;s.questionIndex=0;}else{s.phase='result';}}}});
    if(gameId==='lovequiz'&&state?.phase==='result') await set(ref(db,`${privatePath(code,gameId,sessionId,myUid)}`),null);
    if(gameId==='thisorthat'&&state?.phase==='result') await set(ref(db,`${privatePath(code,gameId,sessionId,myUid)}`),null);
  }
  async function tdChoose(type){
    await updateState(s=>{if(s.phase!=='choose'||s.initiatorUid!==myUid)return false;const targetUid=s.settings.mode==='self'?myUid:(myUid===players.host.uid?players.guest.uid:players.host.uid);const card=s.cards.find(c=>c.type===type&&!s.usedCardIds.includes(c.id));if(!card)return false;s.usedCardIds.push(card.id);s.currentCard={...card,targetUid,initiatorUid:myUid};s.phase='response';s.lastResponse='';});
  }
  async function tdResolve(response, skipped=false){
    await updateState(s=>{if(s.phase!=='response'||s.currentCard?.targetUid!==myUid)return false;if(skipped){if(!s.skips[myUid])return false;s.skips[myUid]--;s.stats.skips[myUid]++;}else if(s.currentCard.type==='truth'){s.stats.truth[myUid]++;s.lastResponse=String(response||'').slice(0,500);}else{s.stats.dare[myUid]++;s.lastResponse='Challenge completed';}s.phase='round-result';s.nextReady={host:false,guest:false};});
  }
  async function tdNext(){
    await updateState(s=>{if(s.phase!=='round-result')return false;s.nextReady[role]=true;if(s.nextReady.host&&s.nextReady.guest){if(s.round>=s.settings.rounds){s.phase='result';}else{s.round++;s.initiatorUid=s.currentCard.initiatorUid===players.host.uid?players.guest.uid:players.host.uid;s.currentCard=null;s.phase='choose';s.nextReady={host:false,guest:false};}}});
  }
  async function hydrateMemoryMedia(){
    const hashes=[...new Set((state.board||[]).map(c=>c.imageHash).filter(Boolean))];let changed=false;
    for(const hash of hashes){if(memoryUrls[hash])continue;try{const blob=await getLocalMedia('memory',hash);if(blob){memoryUrls[hash]=URL.createObjectURL(blob);changed=true;}}catch{}}
    if(changed && gameId==='memorycard') render();
  }
  function scheduleMemoryMismatch(){
    if(memoryMismatchTimer)clearTimeout(memoryMismatchTimer);
    const remaining=Math.max(0,(state?.mismatchAt||Date.now())-(Date.now()+serverOffset));
    memoryMismatchTimer=window.setTimeout(()=>{void updateState(s=>{if(!s.openIds?.length||!s.mismatchAt||Date.now()+serverOffset<s.mismatchAt)return false;s.openIds.forEach(i=>{if(s.board[i]&&!s.board[i].matched)s.board[i].faceUp=false;});s.openIds=[];s.mismatchAt=0;s.turnUid=oppositeUid(s.pendingMismatchUid);s.pendingMismatchUid=null;});},remaining+40);
  }
  async function memoryFlip(index){
    let needHide=false;
    await updateState(s=>{if(s.phase!=='playing'||s.turnUid!==myUid||s.openIds.length>=2)return false;const card=s.board[index];if(!card||card.matched||card.faceUp)return false;card.faceUp=true;s.openIds.push(index);if(s.openIds.length===2){s.attempts++;s.moves++;const [a,b]=s.openIds.map(i=>s.board[i]);if(a.pairId===b.pairId){a.matched=b.matched=true;s.pairsFound++;if(s.settings.mode==='duel')s.scores[myUid]++;s.openIds=[];if(s.board.every(c=>c.matched))s.phase='result';else if(s.settings.mode==='together')s.turnUid=oppositeUid(myUid);}else{needHide=true;s.mismatchAt=Date.now()+serverOffset+900;s.pendingMismatchUid=myUid;}}});
    if(needHide)scheduleMemoryMismatch();
  }
  function oppositeUid(uid){return uid===players.host.uid?players.guest.uid:players.host.uid;}
  async function serverNow(){return Date.now()+serverOffset;}
  async function prepareSecretRound(){
    if(preparingSecret)return;
    preparingSecret=true;
    try{
      const snap=await get(stateRef);const fresh=snap.val();if(!fresh)return;
      const drawerUid=gameId==='drawguess'?fresh.drawerUid:fresh.clueUid;
      if(drawerUid!==myUid||fresh.phase!=='waiting-word')return;
      const round=fresh.round;const secretRef=ref(db,`${privatePath(code,gameId,sessionId,myUid)}/word-${round}`);
      let cached=await get(secretRef);let secret=cached.val();
      if(!secret){
        const level=fresh.wordLevels?.[round-1]||'easy';
        const bank=await getPrivate('custom-word-bank')||[];
        const custom=bank.filter(item=>item?.text&&(!item.difficulty||item.difficulty===level));
        const used=(fresh.roundResults||[]).map(item=>item.word);
        const preset=WORD_BANK[level]||WORD_BANK.easy;
        const candidates=[...custom.map(item=>({word:item.text,forbidden:item.forbidden||[],alternatives:item.alternatives||[],category:item.category||'Custom'})),...preset.map(word=>({word,forbidden:FORBIDDEN_WORDS[word]||[],alternatives:[],category:'Preset'}))].filter(item=>!used.includes(item.word));
        const selected=rand(candidates)||{word:rand(preset)||'bunga',forbidden:[],alternatives:[],category:'Preset'};
        const tx=await runTransaction(secretRef,current=>current||selected,{applyLocally:false});
        secret=tx.snapshot.val();
      }
      localSecret=secret.word;
      const start=await serverNow();
      await updateState(s=>{if(s.phase!=='waiting-word'||s.round!==round)return false;s.phase='playing';s.startedAt=start;s.deadline=start+(s.seconds||90)*1000;s.category=secret.category||'Custom';s.strokes=[];s.clues=[];s.guesses=[];s.hintUsed=false;s.hintRequests={};s.hintDelivered={};s.nextReady={host:false,guest:false};});
    } finally { preparingSecret=false; }
  }
  async function onSecretGameUpdate(){
    if(!state)return;
    await prepareSecretRound();
    const snap=await get(stateRef);const live=snap.val();if(!live)return;state=live;
    const isDrawer=gameId==='drawguess'?state.drawerUid===myUid:state.clueUid===myUid;
    if(!isDrawer||state.phase!=='playing')return;
    const secret=await getPrivate(`word-${state.round}`);if(!secret)return;localSecret=secret.word;
    for(const reqUid of Object.keys(state.hintRequests||{})){
      if(state.hintRequests[reqUid]&&!state.hintDelivered?.[reqUid]){
        const level=state.wordLevels?.[state.round-1]||'easy';
        const pieces=secret.word.split(/\s+/);
        const text=level==='medium' ? `${pieces.length} words · first word starts with “${pieces[0][0].toUpperCase()}”` : level==='hard' ? `Think of a ${secret.category||'mystery'} idea with ${pieces.length} word${pieces.length===1?'':'s'}.` : `Starts with “${secret.word[0].toUpperCase()}” · ${secret.word.replace(/\s/g,'').length} letters`;
        await setPrivate(`hint-${state.round}`,text,reqUid);
        await updateState(s=>{if(s.phase!=='playing'||s.round!==state.round)return false;s.hintDelivered=s.hintDelivered||{};s.hintDelivered[reqUid]=true;s.hintUsed=true;});
      }
    }
    if(state.phase!=='playing')return;
    const last=state.guesses?.at(-1);
    if(last&&!last.checked){
      const accepted=gameId==='drawguess'?[secret.word]:[secret.word,...(secret.alternatives||[])];
      const good=isExactAnswerGuess(last.text,accepted);
      if(good)await finishSecretRound(true,'Correct answer!');
      else await updateState(s=>{if(s.phase!=='playing')return false;const latest=s.guesses?.at(-1);if(latest)latest.checked=true;});
    }
  }
  const normalizeAnswer = normalizeGuess;
  async function finishSecretRound(correct,message){
    const secret=await getPrivate(`word-${state.round}`);
    if(!secret)return;
    const round=state.round;
    const now=await serverNow();
    await updateState(s=>{
      if(s.phase!=='playing'||s.round!==round)return false;
      s.phase='round-result';s.result={word:secret.word,message,correct};
      if(correct){s.scores[myUid]=(s.scores[myUid]||0)+1;const fast=now-s.startedAt<=30000&&!s.hintUsed;s.scores[s.guesserUid]=(s.scores[s.guesserUid]||0)+(fast?2:1);}
      s.roundResults=s.roundResults||[];s.roundResults.push({round:s.round,word:secret.word,correct,drawerUid:gameId==='drawguess'?s.drawerUid:s.clueUid});
      s.nextReady={host:false,guest:false};
    });
  }
  function startClock(){
    if(timer)return;
    timer=setInterval(()=>{
      const el=root.querySelector('[data-timer]');
      if(!el || state?.phase!=='playing') { clearInterval(timer); timer=0; return; }
      const remaining=Math.max(0,Math.ceil(((state?.deadline||Date.now()+serverOffset)-(Date.now()+serverOffset))/1000));
      el.textContent=`${remaining}s`;
      if(remaining===0){const drawer=gameId==='drawguess'?state.drawerUid===myUid:state.clueUid===myUid;if(drawer)void finishSecretRound(false,'Time is up.');}
    },250);
  }
  function attachDrawCanvas(){
    const canvas=$('#draw-canvas',root);if(!canvas)return;
    const ctx=canvas.getContext('2d');const drawAll=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);(state.strokes||[]).forEach(st=>{ctx.strokeStyle=st.color;ctx.lineWidth=st.width;ctx.lineCap='round';ctx.beginPath();st.points.forEach((p,i)=>{const x=p.x*canvas.width,y=p.y*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();});};drawAll();
    if(state.drawerUid!==myUid||state.phase!=='playing')return;
    let active=null;const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
    const down=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);active={color:drawColor,width:5,points:[point(e)]};};
    const move=e=>{if(!active)return;active.points.push(point(e));drawAll();ctx.strokeStyle=active.color;ctx.lineWidth=active.width;ctx.lineCap='round';ctx.beginPath();active.points.forEach((p,i)=>{const x=p.x*canvas.width,y=p.y*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();};
    const up=async()=>{if(!active)return;const st=active;active=null;if(st.points.length>80)st.points=st.points.filter((_,i)=>i%2===0);await updateState(s=>{if(s.phase!=='playing'||s.drawerUid!==myUid)return false;s.strokes=(s.strokes||[]).slice(-119);s.strokes.push(st);});};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
    drawCanvasCleanup=()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
  }
  async function nextSecretRound(){
    await updateState(s=>{
      if(s.phase!=='round-result')return false;
      s.nextReady=s.nextReady||{host:false,guest:false};s.nextReady[role]=true;
      if(!s.nextReady.host||!s.nextReady.guest)return;
      if(s.round>=6){s.phase='result-game';return;}
      s.round++;const old=gameId==='drawguess'?s.drawerUid:s.clueUid;const next=oppositeUid(old);
      if(gameId==='drawguess'){s.drawerUid=next;s.guesserUid=old;}else{s.clueUid=next;s.guesserUid=old;}
      s.phase='waiting-word';s.deadline=null;s.startedAt=null;s.result=null;s.hintUsed=false;s.hintRequests={};s.hintDelivered={};s.nextReady={host:false,guest:false};s.strokes=[];s.clues=[];s.guesses=[];
    });
  }
  async function loadLocalHint(){try{const hint=await getPrivate(`hint-${state.round}`);if(hint&&hint!==localHint){localHint=hint;render();}}catch{}}
  async function requestHint(){
    await updateState(s=>{if(s.phase!=='playing'||s.hintUsed)return false;s.hintRequests=s.hintRequests||{};s.hintRequests[myUid]=true;s.hintUsed=true;});
    if(gameId==='drawguess'||gameId==='tebakkata'){const h=await getPrivate(`hint-${state.round}`);if(h){localHint=h;render();}}
  }
  async function submitClue(value){
    const secret=await getPrivate(`word-${state.round}`); if(!secret)throw new Error('Secret word belum tersedia.');
    const clue=String(value||'').trim(); if(!clue) return;
    if(state.settings.mode==='forbidden'){
      const normalizedClue=normalizeAnswer(clue);
      const blocked=[secret.word,...(secret.forbidden||[])].find(w=>` ${normalizedClue} `.includes(` ${normalizeAnswer(w)} `));
      if(blocked)throw new Error(`Clue ditolak karena memuat kata terlarang: ${blocked}`);
    }
    await updateState(s=>{if(s.phase!=='playing'||s.clueUid!==myUid)return false;s.clues.push({text:clue.slice(0,120),by:myUid,at:Date.now()});});
  }
  async function submitGuess(value){
    const text=String(value||'').trim();if(!text)return;
    await updateState(s=>{if(s.phase!=='playing'||s.guesserUid!==myUid)return false;s.guesses=s.guesses||[];s.guesses.push({text:text.slice(0,100),uid:myUid,at:Date.now(),checked:false});});
  }
  async function handleAction(action,el){
    if(busy)return; busy=true;
    try{
      if(action==='back-room'){if(role==='host'){await onBack();}else toast('Host akan mengembalikan room ke lobby.');return;}
      if(action==='approve-setup'){await updateState(s=>{s.approvals[role]=!s.approvals[role];});return;}
      if(action==='start-session'){await begin();return;}
      if(action==='share-custom'){await shareCustom();return;}
      if(action==='export-custom'){await exportCustom();return;}
      if(action==='ttt-move')return await tttMove(Number(el.dataset.index));
      if(action==='cf-drop')return await cfDrop(Number(el.dataset.col));
      if(action==='toggle-cf-theme'){await updateState(s=>{s.theme=s.theme==='heart'?'pastel':'heart';});return;}
      if(action==='request-rematch')return await rematch();
      if(action==='quiz-answer')return await quizAnswer(Number(el.dataset.answer));
      if(action==='this-answer')return await thisAnswer(Number(el.dataset.answer));
      if(action==='next-question')return await nextQuestion();
      if(action==='td-type')return await tdChoose(el.dataset.type);
      if(action==='td-done')return await tdResolve('done',false);
      if(action==='td-skip')return await tdResolve('',true);
      if(action==='td-next')return await tdNext();
      if(action==='memory-flip')return await memoryFlip(Number(el.dataset.index));
      if(action==='draw-undo'){await updateState(s=>{if(s.drawerUid!==myUid)return false;s.strokes=(s.strokes||[]).slice(0,-1);});return;}
      if(action==='draw-clear'){await updateState(s=>{if(s.drawerUid!==myUid)return false;s.strokes=[];});return;}
      if(action==='draw-hint')return await requestHint();
      if(action==='round-next')return await nextSecretRound();
      if(action==='tebak-hint')return await requestHint();
      if(action==='tebak-skip'){
        if(!state.skips?.[myUid]||state.phase!=='playing'||state.clueUid!==myUid)return;const oldSecret=await getPrivate(`word-${state.round}`);const used=(state.roundResults||[]).map(x=>x.word);const level=state.wordLevels?.[state.round-1]||'easy';const bank=await getPrivate('custom-word-bank')||[];const custom=bank.filter(item=>item?.text&&(!item.difficulty||item.difficulty===level)).map(item=>({word:item.text,forbidden:item.forbidden||[],alternatives:item.alternatives||[],category:item.category||'Custom'}));const candidates=[...custom,...(WORD_BANK[level]||WORD_BANK.easy).map(word=>({word,forbidden:FORBIDDEN_WORDS[word]||[],alternatives:[],category:'Preset'}))].filter(item=>item.word!==oldSecret?.word&&!used.includes(item.word));const picked=rand(candidates)||{word:rand(WORD_BANK.easy)||'bunga',forbidden:[],alternatives:[],category:'Preset'};await setPrivate(`word-${state.round}`,picked);localSecret=picked.word;await updateState(s=>{if(s.phase!=='playing'||s.clueUid!==myUid||!s.skips[myUid])return false;s.skips[myUid]--;s.clues=[];s.guesses=[];s.hintUsed=false;s.hintRequests={};s.hintDelivered={};s.category=picked.category;});return;
      }
      if(action==='tebak-giveup'){
        if(!state.skips?.[myUid])return;await updateState(s=>{if(s.phase!=='playing'||s.guesserUid!==myUid||!s.skips[myUid])return false;s.skips[myUid]--;s.phase='round-result';s.result={word:'Answer revealed',message:'You gave up. No points.'};});try{const secret=await getPrivate(`word-${state.round}`,state.clueUid);if(secret?.word)await updateState(s=>{if(s.phase==='round-result'&&s.result)s.result.word=secret.word;});}catch{}return;
      }
    }catch(e){toast(e.message,'error');}finally{busy=false;}
  }
  async function clickHandler(event){const colorEl=event.target.closest('[data-color]');if(colorEl){drawColor=colorEl.dataset.color;root.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b===colorEl));return;}const el=event.target.closest('[data-action]');if(!el||el.disabled)return;event.preventDefault();await handleAction(el.dataset.action,el);}
  async function changeHandler(event){
    const el=event.target;
    if(el.matches('[data-setting],[data-category]')){try{await handleSetupChange();}catch(e){toast(e.message,'error');}}
    if(el.matches('[data-import-custom]')){try{await importCustom(el.files?.[0]);}catch(e){toast(e.message,'error');}}
    if(el.matches('[data-memory-files]')){
      try{const files=[...el.files].slice(0,18);const hashes=[];for(const file of files){const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());const hash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');await putLocalMedia('memory',hash,file);hashes.push(hash);}await updateState(s=>{s.settings.imageHashesByUid=s.settings.imageHashesByUid||{};s.settings.imageHashesByUid[myUid]=hashes;s.approvals={host:false,guest:false};});toast(`${files.length} foto tersimpan lokal. Pasangan harus mengimpor urutan file yang sama.`,'success');}catch(e){toast(e.message,'error');}}
  }
  async function submitHandler(event){
    const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();
    try{
      const kind=form.dataset.form;
      if(kind==='custom-item')await saveCustom(form);
      if(kind==='td-response')await tdResolve(form.elements.response.value,false);
      if(kind==='draw-guess'){const input=form.elements.guess;await submitGuess(input.value);input.value='';}
      if(kind==='tebak-clue'){const input=form.elements.clue;await submitClue(input.value);input.value='';}
      if(kind==='tebak-guess'){const input=form.elements.guess;await submitGuess(input.value);input.value='';}
    }catch(e){toast(e.message,'error');}
  }
  function renderMissing(){root.innerHTML=missingHtml();}
  void init();
  return {destroy:cleanup};
}
