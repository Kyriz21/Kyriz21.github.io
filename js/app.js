import {
  auth, db, ref, get, set, remove, onValue, runTransaction,
  onDisconnect, ensureSignedIn
} from './firebase.js';
import { mountPhotobooth, unmountPhotobooth } from './photobooth.js';

const root = document.querySelector('#app');
const toastRoot = document.querySelector('#toast-root');
const ROOM_KEY = 'diriLdrPlayroomRoomV1';
const GAMES = [
  { id:'tictactoe', title:'Tic Tac Toe', desc:'Crosses & circles', icon:'×', active:true },
  { id:'lovequiz', title:'Love Quiz', desc:'Seberapa kenal kalian?', icon:'♡', active:true },
  { id:'thisorthat', title:'This or That', desc:'Pilih salah satu', icon:'↔', active:true },
  { id:'truthordare', title:'Truth or Dare', desc:'Jujur atau tantangan', icon:'✿', active:true },
  { id:'memorycard', title:'Memory Card', desc:'Find a pair', icon:'▧', active:true },
  { id:'connectfour', title:'Connect Four', desc:'Four in a row', icon:'●', active:true },
  { id:'drawguess', title:'Draw & Guess', desc:'Draw together', icon:'✎', active:true },
  { id:'wordguess', title:'Tebak Kata', desc:'Word game', icon:'Aa', active:true }
];
const QUIZ_QUESTIONS = [
  { q:'Saat sedang lelah, hal kecil apa yang paling bikin kamu senang?', a:['Dikirimi pesan panjang','Ditemani telepon tanpa harus banyak bicara','Diberi kejutan kecil','Dikasih waktu untuk istirahat'] },
  { q:'Kalau kita punya satu hari libur bersama, kamu pilih...', a:['Masak dan makan di rumah','Jalan-jalan spontan','Nonton film seharian','Cari tempat baru untuk dikunjungi'] },
  { q:'Hal yang paling kamu rindukan saat LDR?', a:['Pelukan','Makan bersama','Cerita sebelum tidur','Melakukan hal sederhana bersama'] },
  { q:'Kalau aku sedang bad mood, kamu biasanya akan...', a:['Mendengarkan ceritaku','Mengirim meme lucu','Mengajak video call','Memberi aku ruang sebentar'] },
  { q:'Kencan sederhana yang paling kamu suka?', a:['Ngopi sambil ngobrol','Jalan sore','Main game berdua','Memasak bersama'] }
];
const THIS_OR_THAT = [
  ['Video call lama','Chat sepanjang hari'],['Sunrise bersama','Sunset bersama'],['Masak berdua','Pesan makanan'],['Movie night','Game night'],['Road trip','Staycation'],['Pelukan lama','Pegangan tangan']
];
const TRUTHS = ['Apa hal kecil dariku yang selalu kamu ingat?','Kapan terakhir kali kamu merasa sangat dirindukan?','Apa kebiasaan lucuku yang kamu suka?','Apa hal yang ingin kita lakukan saat bertemu?','Apa pesan yang ingin kamu dengar hari ini?'];
const DARES = ['Kirim voice note berisi tiga hal yang kamu suka dariku.','Tirukan ekspresi wajahku selama lima detik.','Nyanyikan potongan lagu yang mengingatkanmu padaku.','Kirim foto dengan pose paling lucu.','Buat satu kalimat gombal spontan.'];
const WORDS = ['PELANGI','KAMERA','BUNGA','KOPI','LIBURAN','JENDELA','COKELAT','PANTAI','BINTANG','MELATI'];
const DRAW_PROMPTS = ['Kucing memakai mahkota','Rumah impian','Secangkir kopi','Bunga matahari','Pesawat terbang','Es krim tiga rasa','Payung saat hujan','Kelinci lucu'];

const state = {
  user:null, view:'home', modal:null, modalError:'', busy:false,
  roomCode:null, role:null, room:null, roomUnsubscribe:null,
  toastTimer:null, memoryTimer:null, pendingMemoryAt:null,
  photoReturn:'home', photoboothCleanup:null, drawPointer:null
};

function esc(value='') { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function roomPath(code) { return `rooms/${code}`; }
function userRole() { return state.role; }
function otherRole(role=state.role) { return role === 'host' ? 'guest' : 'host'; }
function runSafely(task) { Promise.resolve(task).catch(error => { console.error(error); toast(friendlyError(error), 'error'); }); }
function toast(message, kind='') {
  toastRoot.innerHTML = `<div class="toast ${kind}">${esc(message)}</div>`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { toastRoot.innerHTML=''; }, 3400);
}
function initial(str='?') { return (String(str).trim()[0] || '?').toUpperCase(); }
function saveLocalRoom() { if (state.roomCode && state.role) localStorage.setItem(ROOM_KEY, JSON.stringify({code:state.roomCode,role:state.role})); }
function clearLocalRoom() { localStorage.removeItem(ROOM_KEY); }
function randomCode() { const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join(''); }
function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
function playerFor(role) { return role === 'host' ? state.room?.host : state.room?.guest; }
function bothPlayersHere() { return Boolean(state.room?.host?.uid && state.room?.guest?.uid); }
function selectedGame(role) { return state.room?.selections?.[role] || ''; }
function sameGameSelected() { return Boolean(selectedGame('host') && selectedGame('host') === selectedGame('guest')); }
function gameById(id) { return GAMES.find(g=>g.id===id); }

function homeTemplate() {
  const cards = GAMES.map(g=>`<div class="game-card ${g.active?'available':''}">
    <span class="game-icon">${g.icon}</span><span class="game-title">${g.title}</span><span class="game-desc">${g.desc}</span>
    <span class="game-status">${g.active?'Play in a room':'Soon'}</span></div>`).join('');
  return `<div class="site-shell">
    <header class="topbar">
      <a class="brand" href="#home" data-action="go-home"><span class="brand-mark">♡</span><span class="brand-copy"><span class="brand-name">LDR Playroom</span><span class="brand-by">A DiRi original</span></span></a>
      <div class="top-actions"><button class="btn btn-outline btn-small" data-action="open-photo">Photobooth ✧</button><button class="btn btn-primary btn-small" data-action="open-create">Create room ♡</button></div>
    </header>
    <main>
      <section class="home-hero">
        <div class="hero-copy"><div class="eyebrow">A LITTLE SPACE FOR TWO</div><h1>Two places.<br><em>One happy place.</em></h1><p>Walau jarak memisahkan, kalian tetap bisa punya waktu berdua. Pilih permainan, tertawa bersama, dan simpan momen kecil kalian di sini.</p>
          <div class="hero-actions"><button class="btn btn-primary" data-action="open-create">Create a room ♡</button><button class="btn btn-outline" data-action="open-join">Join your person</button></div>
          <div class="hero-note"><span>♡</span> Made for two hearts, miles apart.</div>
        </div>
        <div class="hero-art"><span class="floating-heart one">♡</span><span class="floating-heart two">✧</span><div class="polaroid"><div class="polaroid-top">THE TWO OF US · DiRi</div><div class="polaroid-pair"><div class="polaroid-person"><strong>Y</strong><small>YOUR SIDE</small></div><div class="polaroid-person"><strong>♡</strong><small>THEIR SIDE</small></div></div><div class="polaroid-caption">same time, different places.</div></div></div>
      </section>
      <section class="section"><div class="section-heading"><div><div class="eyebrow">PICK YOUR LITTLE ADVENTURE</div><h2>Play something together.</h2><p>Semua permainan tersedia setelah kalian masuk ke room.</p></div><button class="btn btn-outline btn-small" data-action="open-join">Join with a code</button></div>
        <div class="game-grid">${cards}</div>
        <div class="feature-row">
          <article class="feature-card"><div><div class="eyebrow">MAKE A KEEPSAKE</div><h3>DiRi Photobooth</h3><p>Ambil empat foto, pilih frame, lalu unduh photo strip kalian.</p><button class="btn btn-primary btn-small" data-action="open-photo">Open photobooth ♡</button></div><div class="feature-illustration">▣</div></article>
          <article class="feature-card"><div><div class="eyebrow">YOUR PRIVATE SPACE</div><h3>A room for two.</h3><p>Buat room pribadi dan bagikan kode enam karakter ke pasangan.</p><button class="btn btn-outline btn-small" data-action="open-create">Create your room</button></div><div class="feature-illustration">♡</div></article>
        </div>
      </section>
    </main>
    <footer class="site-footer"><span>© 2026 DiRi. All rights reserved.</span><span>LDR Playroom · Made with ♡ by DiRi</span></footer>
  </div>${modalTemplate()}`;
}

function modalTemplate() {
  if (!state.modal) return '';
  const isCreate = state.modal === 'create';
  return `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button class="icon-btn modal-close" data-action="close-modal" aria-label="Tutup">×</button><div class="modal-symbol">♡</div><div class="eyebrow">YOUR LITTLE SPACE</div>
    <h2 id="modal-title">${isCreate?'Let’s get together.':'Join your person.'}</h2><p class="modal-intro">${isCreate?'Buat ruang kecil untuk kalian berdua. Bagikan kodenya kepada pasangan.':'Masukkan nama dan kode room yang dibagikan pasanganmu.'}</p>
    <form id="room-form" data-mode="${isCreate?'create':'join'}">
      <div class="field"><label for="player-name">Nama panggilanmu</label><input id="player-name" name="name" maxlength="24" minlength="1" autocomplete="nickname" placeholder="Contoh: Rahmad" required></div>
      ${isCreate?'':`<div class="field"><label for="room-code-input">Room code</label><input id="room-code-input" name="code" maxlength="6" minlength="6" autocapitalize="characters" autocomplete="off" placeholder="ABC123" required></div>`}
      ${state.modalError?`<div class="form-error" role="alert">${esc(state.modalError)}</div>`:''}
      <button class="btn btn-primary btn-full" type="submit" ${state.busy?'disabled':''}>${state.busy?'<span class="spinner"></span> Connecting...':isCreate?'Create room ♡':'Join room ♡'}</button>
    </form>
  </section></div>`;
}

function renderHome() { state.view='home'; root.innerHTML=homeTemplate(); }

function renderPlayerCard(role) {
  const player = role === 'host' ? state.room?.host : state.room?.guest;
  const isOnline = state.room?.presence?.[role] !== false && Boolean(player?.uid);
  if (!player) return `<article class="player-card"><div class="player-avatar">♡</div><div class="player-info"><strong>Waiting for your person...</strong><small>${role==='host'?'Host':'Guest'}</small></div><span class="muted" style="font-size:10px">Waiting</span></article>`;
  return `<article class="player-card"><div class="player-avatar">${esc(initial(player.name))}</div><div class="player-info"><strong>${esc(player.name)}${player.uid===state.user?.uid?' (You)':''}</strong><small>${role==='host'?'Room host':'Guest'} · ${role==='host'?'X':'O'}</small></div><span class="online">${isOnline?'Online':'Offline'}</span></article>`;
}

function renderLobby() {
  const hostPick=selectedGame('host'); const guestPick=selectedGame('guest');
  const matched=sameGameSelected(); const guestPresent=bothPlayersHere();
  const selectedName=gameById(hostPick)?.title || 'Belum memilih';
  const cards=GAMES.map(g=>`<button class="lobby-game-card ${selectedGame(state.role)===g.id?'selected':''}" data-action="select-game" data-game="${g.id}" ${!guestPresent?'disabled':''} aria-pressed="${selectedGame(state.role)===g.id}">
    <span class="game-icon">${g.icon}</span><span><span class="game-title">${g.title}</span><span class="game-desc">${g.desc}</span></span><span class="select-indicator">${selectedGame(state.role)===g.id?'♥':'○'}</span></button>`).join('');
  const summary = !guestPresent ? 'Bagikan kode room kepada pasangan. Setelah mereka bergabung, kalian bisa memilih game.' : matched ? `Pilihan kalian cocok: ${selectedName}. ${state.role==='host'?'Kamu bisa memulai permainan sekarang.':'Menunggu host memulai permainan.'}` : `Pilihanmu: ${gameById(selectedGame(state.role))?.title || 'belum memilih'}. Pasanganmu: ${gameById(selectedGame(otherRole()))?.title || 'belum memilih'}. Pilih game yang sama untuk melanjutkan.`;
  root.innerHTML=`<div class="room-shell">
    <div class="room-top"><button class="brand" data-action="go-home"><span class="brand-mark">♡</span><span class="brand-copy"><span class="brand-name">LDR Playroom</span><span class="brand-by">by DiRi</span></span></button><div class="top-actions"><button class="btn btn-outline btn-small" data-action="open-photo">Photobooth ✧</button><button class="icon-btn" data-action="leave-room" aria-label="Keluar room">×</button></div></div>
    <div class="room-code-card"><div class="room-code-label">YOUR ROOM CODE</div><div class="room-code">${esc(state.roomCode||'------')}</div><div class="room-copy-row"><button class="btn btn-outline btn-small" data-action="copy-code">Copy code</button></div></div>
    <p class="room-status-note">${guestPresent?'Yeay! Kalian sudah berada di room yang sama. Sekarang pilih game bersama ♡':'Bagikan kode ini kepada pasanganmu untuk mulai bermain bersama.'}</p>
    <div class="players-grid">${renderPlayerCard('host')}${renderPlayerCard('guest')}</div>
    <section class="lobby-section"><div class="lobby-section-head"><div><div class="eyebrow">YOU’RE BOTH HERE</div><h2>Choose your game.</h2></div><span style="color:var(--rose);font-size:22px">♡</span></div>
      <div class="selection-summary ${matched?'match':''}">${esc(summary)}</div>
      <div class="lobby-game-grid">${cards}</div>
      <div class="lobby-bottom"><div class="start-panel"><div><strong>${matched?'Ready to play?':'Waiting for a match'}</strong><p>${matched?(state.role==='host'?'Kedua pemain memilih game yang sama.':'Pilihan sudah cocok. Tunggu host memulai.'):'Kalian harus memilih game yang sama.'}</p></div><button class="btn btn-primary" data-action="start-game" ${!(matched&&guestPresent&&state.role==='host')?'disabled':''}>Start game ♡</button></div><div class="lobby-actions"><button class="btn btn-outline btn-full" data-action="leave-room">Leave room</button></div></div>
    </section>
  </div>`;
}

function checkTicWinner(board) {
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) if(board[a] && board[a]===board[b] && board[a]===board[c]) return board[a];
  return board.every(Boolean) ? 'draw' : null;
}
function checkConnectWinner(grid, row, col, player) {
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(const [dr,dc] of dirs){let count=1;for(const sign of [-1,1]){let r=row+dr*sign,c=col+dc*sign;while(r>=0&&r<6&&c>=0&&c<7&&grid[r*7+c]===player){count++;r+=dr*sign;c+=dc*sign;}}if(count>=4)return player;}
  return grid.every(Boolean)?'draw':null;
}
function shuffle(list){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function initialGameData(id){
  switch(id){
    case 'tictactoe': return {board:Array(9).fill(''),turn:'host',winner:null,moves:0};
    case 'lovequiz': return {index:0,answers:{host:'',guest:''},history:[]};
    case 'thisorthat': return {index:0,choices:{host:'',guest:''},history:[]};
    case 'truthordare': return {turn:'host',type:null,prompt:null,round:1};
    case 'memorycard': return {cards:shuffle(['🌷','🌷','🍓','🍓','🐻','🐻','🌙','🌙','🎀','🎀','🍰','🍰','🧸','🧸','💌','💌']),revealed:[],matched:[],turn:'host',moves:0,resolveAt:null};
    case 'connectfour': return {grid:Array(42).fill(''),turn:'host',winner:null,moves:0};
    case 'drawguess': return {drawer:'host',prompt:DRAW_PROMPTS[Math.floor(Math.random()*DRAW_PROMPTS.length)],strokes:[],guessed:false,round:1};
    case 'wordguess': {const word=WORDS[Math.floor(Math.random()*WORDS.length)];return {secret:word,letters:[],turn:'guest',attempts:7,round:1};}
    default: return {};
  }
}

function gameMessage(text, strong='') { return `<div class="game-message">${strong?`<strong>${esc(strong)}</strong><br>`:''}${esc(text)}</div>`; }
function renderGameHeader(game) {
  const title=gameById(game.id)?.title || 'Our game';
  return `<div class="game-topbar"><button class="btn btn-outline btn-small" data-action="game-exit" ${state.role!=='host'?'disabled title="Host yang mengembalikan semua pemain ke lobby"':''}>← Lobby</button><div class="game-title-wrap"><div class="eyebrow">DiRi PLAYROOM · ${esc(state.roomCode||'')}</div><h1>${esc(title)}</h1></div><button class="icon-btn" data-action="leave-room" aria-label="Leave room">×</button></div>
    <div class="game-players"><div class="game-player"><span class="player-avatar">${esc(initial(state.room?.host?.name))}</span><span><strong>${esc(state.room?.host?.name||'Host')}</strong><small>PLAYER 1 · X</small></span></div><span class="vs-label">VS</span><div class="game-player"><span class="player-avatar">${esc(initial(state.room?.guest?.name))}</span><span><strong>${esc(state.room?.guest?.name||'Guest')}</strong><small>PLAYER 2 · O</small></span></div></div>`;
}
function renderTic(game) {
  const d=game.data; const win=d.winner; const isTurn=d.turn===state.role; const symbol=state.role==='host'?'X':'O';
  let msg=win==='draw'?'Permainan seri!':win?`${win==='host'?state.room.host.name:state.room.guest.name} menang!`:(isTurn?'Giliranmu. Pilih kotak kosong.':'Menunggu pasanganmu bermain...');
  const cells=d.board.map((v,i)=>`<button class="ttt-cell" data-action="tic-move" data-index="${i}" ${v||win||!isTurn?'disabled':''} aria-label="Kotak ${i+1}">${v==='host'?'×':v==='guest'?'○':''}</button>`).join('');
  return `<div class="game-board-wrap"><div class="ttt-board">${cells}</div>${gameMessage(msg,win?'Round finished':isTurn?'Your turn':'Partner’s turn')}<div class="game-controls">${win?`<button class="btn btn-primary" data-action="restart-game" ${state.role!=='host'?'disabled':''}>Play again ♡</button>`:''}${state.role==='host'?'<button class="btn btn-outline" data-action="game-exit">Back to game selection</button>':'<span class="muted" style="font-size:11px">Host dapat kembali ke lobby.</span>'}</div></div>`;
}
function renderLoveQuiz(game){
  const d=game.data, q=QUIZ_QUESTIONS[d.index];
  if(!q) return `<div class="game-board-wrap">${gameMessage('Kalian menyelesaikan semua pertanyaan. Terima kasih sudah bermain!','Love Quiz complete')}<div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">Play again ♡</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div></div>`;
  const answerMine=d.answers?.[state.role], answerTheirs=d.answers?.[otherRole()]; const mine=Number.isInteger(answerMine)?answerMine:null, theirs=Number.isInteger(answerTheirs)?answerTheirs:null;
  return `<div class="game-board-wrap"><div class="prompt-card"><div class="eyebrow">QUESTION ${d.index+1} / ${QUIZ_QUESTIONS.length}</div><h2>${esc(q.q)}</h2><p class="muted" style="font-size:11px">Pilih jawabanmu sendiri. Lihat apakah pasanganmu menebak hal yang sama.</p></div>
    ${mine===null?`<div class="quiz-options" style="margin-top:14px">${q.a.map((a,i)=>`<button class="quiz-option" data-action="quiz-answer" data-index="${i}">${esc(a)}</button>`).join('')}</div>`:`<div class="game-message">Jawabanmu tersimpan: <strong>${esc(q.a[mine])}</strong>. ${theirs==null?'Menunggu jawaban pasangan...':'Keduanya sudah menjawab!'}</div>`}
    ${mine!==null&&theirs!==null?`<div class="game-message"><strong>Jawaban kalian</strong><br>${esc(state.room.host.name)}: ${esc(q.a[d.answers.host])}<br>${esc(state.room.guest.name)}: ${esc(q.a[d.answers.guest])}</div>${state.role==='host'?`<div class="game-controls"><button class="btn btn-primary" data-action="quiz-next">${d.index===QUIZ_QUESTIONS.length-1?'Finish quiz':'Next question'} ♡</button></div>`:'<p class="muted text-center" style="font-size:11px">Menunggu host melanjutkan...</p>'}`:''}
  </div>`;
}
function renderThisThat(game){
  const d=game.data, pair=THIS_OR_THAT[d.index];
  if(!pair)return `<div class="game-board-wrap">${gameMessage('Selesai! Kalian sudah menjawab semua pilihan.','This or That complete')}<div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">Play again ♡</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div></div>`;
  const choiceMine=d.choices?.[state.role], choiceTheirs=d.choices?.[otherRole()]; const mine=Number.isInteger(choiceMine)?choiceMine:null, theirs=Number.isInteger(choiceTheirs)?choiceTheirs:null;
  return `<div class="game-board-wrap"><div class="prompt-card"><div class="eyebrow">THIS OR THAT · ${d.index+1}/${THIS_OR_THAT.length}</div><h2>Pilih yang paling kamu suka.</h2><p class="muted" style="font-size:11px">Tidak ada jawaban benar atau salah.</p></div>
    <div class="quiz-options" style="margin-top:14px">${pair.map((p,i)=>`<button class="quiz-option ${mine===i?'selected':''}" data-action="thisthat-answer" data-index="${i}" ${mine!==null?'disabled':''}>${esc(p)}</button>`).join('')}</div>
    ${mine!==null?gameMessage(`Pilihanmu: ${pair[mine]}. ${theirs==null?'Menunggu pasangan memilih...':'Kalian sudah memilih!'}`):''}
    ${mine!==null&&theirs!==null?`<div class="game-message"><strong>Hasil pilihan</strong><br>${esc(state.room.host.name)}: ${esc(pair[d.choices.host])}<br>${esc(state.room.guest.name)}: ${esc(pair[d.choices.guest])}</div>${state.role==='host'?`<div class="game-controls"><button class="btn btn-primary" data-action="thisthat-next">${d.index===THIS_OR_THAT.length-1?'Finish':'Next choice'} ♡</button></div>`:'<p class="muted text-center" style="font-size:11px">Menunggu host...</p>'}`:''}
  </div>`;
}
function renderTruthDare(game){
  const d=game.data, isTurn=d.turn===state.role;
  return `<div class="game-board-wrap"><div class="prompt-card"><div class="eyebrow">ROUND ${d.round} · TRUTH OR DARE</div><h2>${d.prompt?esc(d.type==='truth'?'Truth':'Dare'):'Giliran '+esc((d.turn==='host'?state.room.host.name:state.room.guest.name))}</h2>${d.prompt?`<p>${esc(d.prompt)}</p>`:'<p class="muted" style="font-size:11px">Pilih Truth atau Dare untuk membuka tantangan.</p>'}</div>
    ${!d.prompt&&isTurn?`<div class="game-controls"><button class="btn btn-outline" data-action="truthdare-pick" data-type="truth">Truth ♡</button><button class="btn btn-primary" data-action="truthdare-pick" data-type="dare">Dare ✧</button></div>`:''}
    ${!d.prompt&&!isTurn?gameMessage('Menunggu pasangan memilih Truth atau Dare...'):''}
    ${d.prompt?`${gameMessage(isTurn?'Selesaikan tantangannya, lalu lanjutkan giliran.':'Pasanganmu sedang menyelesaikan tantangan.','Be honest, have fun!')}${isTurn?`<div class="game-controls"><button class="btn btn-primary" data-action="truthdare-next">Done, next turn ♡</button></div>`:''}`:''}
  </div>`;
}
function renderMemory(game){
  const d=game.data, isTurn=d.turn===state.role, matched=new Set(d.matched||[]), revealed=new Set(d.revealed||[]);
  const cards=d.cards.map((v,i)=>{const shown=matched.has(i)||revealed.has(i);return `<button class="memory-card ${matched.has(i)?'matched':shown?'flipped':''}" data-action="memory-flip" data-index="${i}" ${!isTurn||shown||d.resolveAt||game.status==='finished'?'disabled':''}>${shown?esc(v):'♡'}</button>`;}).join('');
  const done=matched.size===d.cards.length;
  return `<div class="game-board-wrap"><div class="game-message"><strong>${done?'All pairs found!':isTurn?'Your turn to find a pair':'Waiting for your partner'}</strong><br>Pairs: ${matched.size/2} / 8 · Moves: ${d.moves}</div><div class="memory-grid" style="margin-top:14px">${cards}</div>${done?`<div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">Play again ♡</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div>`:''}</div>`;
}
function renderConnect(game){
  const d=game.data, isTurn=d.turn===state.role, cells=d.grid.map((v,i)=>`<button class="connect-cell ${v||''}" data-action="connect-drop" data-column="${i%7}" ${v||!isTurn||d.winner?'disabled':''} aria-label="Kolom ${i%7+1}"></button>`).join('');
  const status=d.winner==='draw'?'Permainan seri.':d.winner?`${d.winner==='host'?state.room.host.name:state.room.guest.name} menang!`:isTurn?'Pilih kolom untuk menjatuhkan keping.':'Menunggu pasangan menjatuhkan keping...';
  return `<div class="game-board-wrap"><div class="game-message">${esc(status)}</div><div class="connect-board" style="margin-top:12px">${cells}</div>${d.winner?`<div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">Play again ♡</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div>`:''}</div>`;
}
function renderDrawGuess(game){
  const d=game.data, isDrawer=d.drawer===state.role;
  return `<div class="game-board-wrap"><div class="prompt-card"><div class="eyebrow">DRAW & GUESS · ROUND ${d.round}</div><h2>${isDrawer?`Gambarkan: ${esc(d.prompt)}`:'Tebak gambar pasanganmu!'}</h2><p class="muted" style="font-size:11px">${isDrawer?'Gambar di area putih. Pasanganmu akan melihat garisnya secara langsung.':'Kirim tebakanmu di bawah gambar.'}</p></div>
    <canvas class="draw-canvas" id="draw-canvas" width="720" height="540" aria-label="Papan gambar"></canvas>
    ${isDrawer?`<div class="game-controls"><button class="btn btn-outline btn-small" data-action="draw-clear">Clear canvas</button></div>`:`<form id="draw-guess-form" class="guess-row"><input name="guess" maxlength="50" placeholder="Tebak gambarnya..." required><button class="btn btn-primary btn-small" type="submit">Guess</button></form>`}
    ${d.guessed?gameMessage('Tebakan benar! Kalian berhasil menebak bersama.','You got it!'):''}
    ${d.guessed?`<div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">Play another round</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div>`:''}
  </div>`;
}
function renderWordGuess(game){
  const d=game.data, isTurn=d.turn===state.role, letters=new Set(d.letters||[]), secret=d.secret||'';
  const won=[...secret].every(ch=>letters.has(ch));
  const lost=d.attempts<=0;
  const finished=won||lost;
  const masked=[...secret].map(ch=>`<span class="word-letter">${letters.has(ch)||finished?esc(ch):'_'}</span>`).join('');
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(ch=>`<button class="letter-button" data-action="word-letter" data-letter="${ch}" ${letters.has(ch)||!isTurn||finished?'disabled':''}>${ch}</button>`).join('');
  return `<div class="game-board-wrap"><div class="game-message"><strong>${finished?(won?'You got it!':'Kesempatan habis.'):(isTurn?'Giliranmu menebak huruf.':'Menunggu pasangan menebak...')}</strong><br>Sisa kesempatan: ${d.attempts}</div><div class="word-display">${masked}</div><div class="letter-grid">${alphabet}</div>${finished?`<div class="game-message">Kata rahasianya: <strong>${esc(secret)}</strong></div><div class="game-controls">${state.role==='host'?'<button class="btn btn-primary" data-action="restart-game">New word ♡</button>':'<p class="muted" style="font-size:11px">Menunggu host memulai ulang.</p>'}</div>`:''}</div>`;
}
function renderGame(){
  const game=state.room?.game;
  if(!game){state.view='lobby';renderLobby();return;}
  const body=({tictactoe:renderTic,lovequiz:renderLoveQuiz,thisorthat:renderThisThat,truthordare:renderTruthDare,memorycard:renderMemory,connectfour:renderConnect,drawguess:renderDrawGuess,wordguess:renderWordGuess})[game.id];
  if(!body){root.innerHTML='<div class="room-shell">Game tidak dikenal. <button data-action="game-exit">Kembali</button></div>';return;}
  root.innerHTML=`<main class="game-shell">${renderGameHeader(game)}${body(game)}</main>`;
  if(game.id==='drawguess') attachDrawCanvas();
}

async function makeRoom(name) {
  const user=await ensureSignedIn();state.user=user;
  let createdCode=null;
  for(let attempt=0;attempt<8&&!createdCode;attempt++){
    const code=randomCode();
    const result=await runTransaction(ref(db,roomPath(code)),current=>{
      if(current!==null)return;
      return {host:{uid:user.uid,name},createdAt:Date.now(),selections:{host:''},presence:{host:true}};
    },{applyLocally:false});
    if(result.committed)createdCode=code;
  }
  if(!createdCode)throw new Error('Belum berhasil membuat kode room. Coba sekali lagi.');
  state.roomCode=createdCode;state.role='host';saveLocalRoom();
  await onDisconnect(ref(db,`${roomPath(createdCode)}/presence/host`)).set(false);
  await set(ref(db,`${roomPath(createdCode)}/presence/host`),true);
  subscribeRoom(createdCode,'host');
}

async function joinRoom(name, code) {
  const user=await ensureSignedIn();state.user=user;
  const roomRef=ref(db,roomPath(code));
  const existing=await get(roomRef);
  if(!existing.exists())throw new Error('Room tidak ditemukan. Periksa kode yang diberikan pasanganmu.');
  const room=existing.val();
  if(room.host?.uid===user.uid)throw new Error('Kamu adalah host room ini. Gunakan perangkat atau browser lain untuk pasanganmu.');
  const guestRef=ref(db,`${roomPath(code)}/guest`);
  const result=await runTransaction(guestRef,current=>{
    if(current===null)return {uid:user.uid,name,joinedAt:Date.now()};
    if(current.uid===user.uid)return {...current,name};
    return;
  },{applyLocally:false});
  if(!result.committed)throw new Error('Room sudah memiliki dua pemain. Minta host membuat room baru.');
  state.roomCode=code;state.role='guest';saveLocalRoom();
  await set(ref(db,`${roomPath(code)}/selections/guest`),'');
  await onDisconnect(ref(db,`${roomPath(code)}/presence/guest`)).set(false);
  await set(ref(db,`${roomPath(code)}/presence/guest`),true);
  subscribeRoom(code,'guest');
}

function subscribeRoom(code,role) {
  state.roomUnsubscribe?.();state.roomCode=code;state.role=role;saveLocalRoom();
  state.roomUnsubscribe=onValue(ref(db,roomPath(code)),snapshot=>{
    if(!snapshot.exists()){
      if(state.roomCode===code){state.room=null;state.roomCode=null;state.role=null;clearLocalRoom();state.view='home';state.roomUnsubscribe?.();state.roomUnsubscribe=null;renderHome();toast('Room sudah ditutup oleh host.','error');}
      return;
    }
    const room=snapshot.val();
    const expected=role==='host'?room.host?.uid:room.guest?.uid;
    if(expected!==state.user?.uid){state.room=null;state.roomCode=null;state.role=null;clearLocalRoom();state.view='home';renderHome();toast('Sesi room ini sudah tidak aktif.','error');return;}
    state.room=room;
    if(state.view!=='photobooth')state.view=room.game?'game':'lobby';
    renderCurrent();scheduleMemoryResolver();
  },error=>{
    console.error('Room listener error:',error);
    toast(`Tidak dapat membaca room: ${friendlyError(error)}`,'error');
  });
}

function friendlyError(error) {
  const code=error?.code||'';
  if(code.includes('PERMISSION_DENIED')||code.includes('permission-denied'))return 'Akses Firebase ditolak. Periksa Realtime Database Rules dan Authorized Domains.';
  if(code.includes('NETWORK'))return 'Koneksi internet terputus. Periksa jaringan lalu coba lagi.';
  if(code.includes('unauthorized-domain'))return 'Domain website belum ditambahkan ke Authentication → Settings → Authorized domains.';
  return error?.message||'Terjadi kesalahan. Coba lagi.';
}

async function chooseGame(id) {
  if(!GAMES.some(g=>g.id===id))return;
  if(state.room?.game){toast('Selesaikan atau kembali ke lobby sebelum memilih game lain.');return;}
  try{
    await set(ref(db,`${roomPath(state.roomCode)}/selections/${state.role}`),id);
    toast(`${gameById(id).title} dipilih.`,'success');
  }catch(error){toast(friendlyError(error),'error');}
}

async function startSelectedGame() {
  if(state.role!=='host')return;
  if(!bothPlayersHere()||!sameGameSelected())return;
  const id=selectedGame('host');
  try{
    await set(ref(db,`${roomPath(state.roomCode)}/game`),{id,status:'playing',data:initialGameData(id),updatedAt:Date.now()});
  }catch(error){toast(`Game belum bisa dimulai: ${friendlyError(error)}`,'error');}
}

async function mutateGame(mutator) {
  if(!state.roomCode)throw new Error('Room tidak aktif.');
  const result=await runTransaction(ref(db,`${roomPath(state.roomCode)}/game`),current=>{
    if(!current)return;
    const next=mutator(clone(current));
    if(!next)return;
    next.updatedAt=Date.now();
    return next;
  },{applyLocally:false});
  return result;
}

async function leaveRoom() {
  if(!state.roomCode||!state.role)return;
  const code=state.roomCode, role=state.role;
  const proceed=window.confirm('Keluar dari room sekarang?');
  if(!proceed)return;
  try{
    if(role==='host'){
      await remove(ref(db,roomPath(code)));
    }else{
      await remove(ref(db,`${roomPath(code)}/game`));
      await remove(ref(db,`${roomPath(code)}/selections/guest`));
      await remove(ref(db,`${roomPath(code)}/presence/guest`));
      await remove(ref(db,`${roomPath(code)}/guest`));
    }
  }catch(error){
    console.error('Leave room cleanup error:',error);
    toast(`Keluar lokal, tetapi pembersihan data gagal: ${friendlyError(error)}`,'error');
  }
  state.roomUnsubscribe?.();state.roomUnsubscribe=null;state.room=null;state.roomCode=null;state.role=null;state.view='home';clearLocalRoom();renderHome();
}

async function returnToLobby() {
  if(state.role!=='host'){toast('Tunggu host mengembalikan room ke lobby.');return;}
  try{
    await remove(ref(db,`${roomPath(state.roomCode)}/game`));
    await set(ref(db,`${roomPath(state.roomCode)}/selections/host`),'');
  }catch(error){toast(friendlyError(error),'error');}
}

async function restartGame() {
  if(state.role!=='host')return;
  const game=state.room?.game;if(!game)return;
  try{await set(ref(db,`${roomPath(state.roomCode)}/game`),{id:game.id,status:'playing',data:initialGameData(game.id),updatedAt:Date.now()});}
  catch(error){toast(friendlyError(error),'error');}
}

function scheduleMemoryResolver() {
  const game=state.room?.game;
  if(game?.id!=='memorycard'||!game.data?.resolveAt)return;
  if(state.pendingMemoryAt===game.data.resolveAt)return;
  state.pendingMemoryAt=game.data.resolveAt;
  clearTimeout(state.memoryTimer);
  const delay=Math.max(50,game.data.resolveAt-Date.now()+80);
  state.memoryTimer=setTimeout(async()=>{
    try{
      await mutateGame(current=>{
        if(current.id!=='memorycard'||!current.data.resolveAt||current.data.revealed?.length!==2||Date.now()<current.data.resolveAt)return;
        const d=current.data;d.matched ||= [];const [a,b]=d.revealed;
        const match=d.cards[a]===d.cards[b];
        if(match)d.matched=[...d.matched,a,b];
        d.revealed=[];d.resolveAt=null;d.moves=(d.moves||0)+0;
        if(!match)d.turn=otherRole(d.turn);
        if(d.matched.length===d.cards.length)current.status='finished';
        return current;
      });
    }catch(error){console.warn('Memory resolution:',error);}
    state.pendingMemoryAt=null;
  },delay);
}

function showPhotobooth() {
  state.photoReturn=state.view==='photobooth'?'home':state.view;
  state.view='photobooth';
  mountPhotobooth(root,{onBack:()=>{state.view=state.photoReturn;renderCurrent();}});
}

function renderCurrent() {
  if(state.view==='photobooth')return;
  if(state.view==='lobby'&&state.room){renderLobby();return;}
  if(state.view==='game'&&state.room){renderGame();return;}
  renderHome();
}

function showModal(type){state.modal=type;state.modalError='';state.busy=false;renderHome();setTimeout(()=>root.querySelector('#player-name')?.focus(),80);}
function closeModal(){state.modal=null;state.modalError='';state.busy=false;renderHome();}

async function handleRoomForm(form) {
  const data=new FormData(form);const name=String(data.get('name')||'').trim();const mode=form.dataset.mode;
  const code=String(data.get('code')||'').trim().toUpperCase();
  if(!name){state.modalError='Masukkan nama panggilan terlebih dahulu.';renderHome();return;}
  if(name.length>24){state.modalError='Nama maksimal 24 karakter.';renderHome();return;}
  if(mode==='join'&&!/^[A-Z0-9]{6}$/.test(code)){state.modalError='Kode room harus terdiri dari enam karakter.';renderHome();return;}
  state.busy=true;state.modalError='';renderHome();
  try{
    if(mode==='create')await makeRoom(name);else await joinRoom(name,code);
    state.modal=null;state.busy=false;state.view='lobby';toast(mode==='create'?'Room berhasil dibuat. Bagikan kodenya!':'Berhasil bergabung ke room.','success');
  }catch(error){
    console.error('Room form error:',error);state.busy=false;state.modal=mode;state.modalError=friendlyError(error);renderHome();
  }
}

function openPhotoFromCurrent(){state.photoReturn=state.view;showPhotobooth();}
function copyRoomCode(){if(!state.roomCode)return;const text=state.roomCode;if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>toast('Kode room berhasil disalin.','success')).catch(()=>fallbackCopy(text));}else fallbackCopy(text);}
function fallbackCopy(text){const input=document.createElement('textarea');input.value=text;document.body.appendChild(input);input.select();try{document.execCommand('copy');toast('Kode room berhasil disalin.','success');}catch{toast(`Kode room: ${text}`);}input.remove();}

async function handleTicMove(index) {
  await mutateGame(current=>{
    if(current.id!=='tictactoe'||current.status!=='playing')return;
    const d=current.data;if(d.turn!==state.role||d.board[index])return;
    d.board[index]=state.role;d.moves++;
    const winner=checkTicWinner(d.board);
    if(winner){d.winner=winner;current.status='finished';}else d.turn=otherRole(state.role);
    return current;
  });
}
async function handleQuizAnswer(index){
  await mutateGame(current=>{if(current.id!=='lovequiz'||current.status!=='playing')return;const d=current.data;d.answers ||= {host:'',guest:''};if(d.answers[state.role]!==''&&d.answers[state.role]!=null)return;d.answers[state.role]=index;return current;});
}
async function handleQuizNext(){
  if(state.role!=='host')return;
  await mutateGame(current=>{if(current.id!=='lovequiz')return;const d=current.data;if(!Number.isInteger(d.answers?.host)||!Number.isInteger(d.answers?.guest))return;d.index++;d.answers={host:'',guest:''};if(d.index>=QUIZ_QUESTIONS.length)current.status='finished';return current;});
}
async function handleThisThatAnswer(index){
  await mutateGame(current=>{if(current.id!=='thisorthat'||current.status!=='playing')return;const d=current.data;d.choices ||= {host:'',guest:''};if(d.choices[state.role]!==''&&d.choices[state.role]!=null)return;d.choices[state.role]=index;return current;});
}
async function handleThisThatNext(){
  if(state.role!=='host')return;
  await mutateGame(current=>{if(current.id!=='thisorthat')return;const d=current.data;if(!Number.isInteger(d.choices?.host)||!Number.isInteger(d.choices?.guest))return;d.index++;d.choices={host:'',guest:''};if(d.index>=THIS_OR_THAT.length)current.status='finished';return current;});
}
async function handleTruthDarePick(type){
  if(!['truth','dare'].includes(type))return;
  await mutateGame(current=>{if(current.id!=='truthordare'||current.status!=='playing')return;const d=current.data;if(d.turn!==state.role||d.prompt)return;const pool=type==='truth'?TRUTHS:DARES;d.type=type;d.prompt=pool[Math.floor(Math.random()*pool.length)];return current;});
}
async function handleTruthDareNext(){
  await mutateGame(current=>{if(current.id!=='truthordare')return;const d=current.data;if(d.turn!==state.role||!d.prompt)return;d.turn=otherRole(d.turn);d.type=null;d.prompt=null;d.round++;return current;});
}
async function handleMemoryFlip(index){
  await mutateGame(current=>{
    if(current.id!=='memorycard'||current.status!=='playing')return;
    const d=current.data;d.revealed ||= [];d.matched ||= [];if(d.turn!==state.role||d.resolveAt||d.revealed.includes(index)||d.matched.includes(index))return;
    d.revealed.push(index);
    if(d.revealed.length===2){d.moves++;d.resolveAt=Date.now()+950;}
    return current;
  });
}
async function handleConnectDrop(column){
  await mutateGame(current=>{
    if(current.id!=='connectfour'||current.status!=='playing')return;
    const d=current.data;if(d.turn!==state.role||d.winner)return;
    let row=-1;for(let r=5;r>=0;r--){if(!d.grid[r*7+column]){row=r;break;}}
    if(row<0)return;
    d.grid[row*7+column]=state.role;d.moves++;
    const winner=checkConnectWinner(d.grid,row,column,state.role);
    if(winner){d.winner=winner;current.status='finished';}else d.turn=otherRole(state.role);
    return current;
  });
}
async function handleDrawGuessSubmit(form){
  const guess=String(new FormData(form).get('guess')||'').trim().toLocaleLowerCase('id');
  if(!guess)return;
  try{
    const result=await mutateGame(current=>{
      if(current.id!=='drawguess'||current.status!=='playing')return;
      const d=current.data;if(d.drawer===state.role||d.guessed)return;
      if(guess.replace(/[^a-z0-9]/g,'')!==String(d.prompt).toLocaleLowerCase('id').replace(/[^a-z0-9]/g,''))return;
      d.guessed=true;current.status='finished';return current;
    });
    if(!result.committed)toast('Belum tepat, coba lagi!');
  }catch(error){toast(friendlyError(error),'error');}
}
async function handleWordLetter(letter){
  await mutateGame(current=>{
    if(current.id!=='wordguess'||current.status!=='playing')return;
    const d=current.data;d.letters ||= [];if(d.turn!==state.role||d.letters.includes(letter))return;
    d.letters.push(letter);if(!d.secret.includes(letter))d.attempts--;
    const won=[...d.secret].every(ch=>d.letters.includes(ch));
    if(won||d.attempts<=0)current.status='finished';else d.turn=otherRole(state.role);
    return current;
  });
}

function attachDrawCanvas(){
  const canvas=root.querySelector('#draw-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d');const strokes=state.room?.game?.data?.strokes||[];
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineCap='round';ctx.lineJoin='round';
  for(const stroke of strokes){if(!stroke.points?.length)continue;ctx.beginPath();ctx.strokeStyle=stroke.role==='host'?'#bd637f':'#9585af';ctx.lineWidth=5;stroke.points.forEach((p,i)=>{const x=p.x*canvas.width,y=p.y*canvas.height;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.stroke();}
  const isDrawer=state.room?.game?.data?.drawer===state.role;
  if(!isDrawer||state.room?.game?.status!=='playing')return;
  let points=[];
  const getPoint=e=>{const rect=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))};};
  canvas.addEventListener('pointerdown',e=>{points=[getPoint(e)];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!points.length)return;const p=getPoint(e);points.push(p);const a=points[points.length-2];ctx.beginPath();ctx.strokeStyle=state.role==='host'?'#bd637f':'#9585af';ctx.lineWidth=5;ctx.lineCap='round';ctx.moveTo(a.x*canvas.width,a.y*canvas.height);ctx.lineTo(p.x*canvas.width,p.y*canvas.height);ctx.stroke();});
  const finish=async()=>{if(points.length>1){const stroke={role:state.role,points:points.slice(0,500)};try{await mutateGame(current=>{if(current.id!=='drawguess'||current.data.drawer!==state.role)return;current.data.strokes=[...(current.data.strokes||[]),stroke].slice(-120);return current;});}catch(error){toast(friendlyError(error),'error');}}points=[];};
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
}

function handleClick(event){
  const target=event.target.closest('[data-action]');if(!target)return;
  const action=target.dataset.action;
  if(action==='backdrop-close'){if(event.target===target)closeModal();return;}
  if(action==='open-create'){showModal('create');return;}
  if(action==='open-join'){showModal('join');return;}
  if(action==='close-modal'){closeModal();return;}
  if(action==='go-home'){if(state.room){toast('Keluar dari room terlebih dahulu untuk kembali ke halaman utama.');return;}state.view='home';renderHome();return;}
  if(action==='open-photo'){openPhotoFromCurrent();return;}
  if(action==='copy-code'){copyRoomCode();return;}
  if(action==='leave-room'){leaveRoom();return;}
  if(action==='select-game'){chooseGame(target.dataset.game);return;}
  if(action==='start-game'){startSelectedGame();return;}
  if(action==='game-exit'){returnToLobby();return;}
  if(action==='restart-game'){restartGame();return;}
  if(action==='tic-move'){runSafely(handleTicMove(Number(target.dataset.index)));return;}
  if(action==='quiz-answer'){runSafely(handleQuizAnswer(Number(target.dataset.index)));return;}
  if(action==='quiz-next'){runSafely(handleQuizNext());return;}
  if(action==='thisthat-answer'){runSafely(handleThisThatAnswer(Number(target.dataset.index)));return;}
  if(action==='thisthat-next'){runSafely(handleThisThatNext());return;}
  if(action==='truthdare-pick'){runSafely(handleTruthDarePick(target.dataset.type));return;}
  if(action==='truthdare-next'){runSafely(handleTruthDareNext());return;}
  if(action==='memory-flip'){runSafely(handleMemoryFlip(Number(target.dataset.index)));return;}
  if(action==='connect-drop'){runSafely(handleConnectDrop(Number(target.dataset.column)));return;}
  if(action==='draw-clear'){mutateGame(current=>{if(current.id!=='drawguess'||current.data.drawer!==state.role)return;current.data.strokes=[];return current;}).catch(error=>toast(friendlyError(error),'error'));return;}
  if(action==='word-letter'){runSafely(handleWordLetter(target.dataset.letter));return;}
}

function handleSubmit(event){
  if(event.target.id==='room-form'){event.preventDefault();handleRoomForm(event.target);return;}
  if(event.target.id==='draw-guess-form'){event.preventDefault();handleDrawGuessSubmit(event.target);return;}
}
root.addEventListener('click',handleClick);
root.addEventListener('submit',handleSubmit);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.modal)closeModal();});

async function resumePreviousRoom(){
  try{
    const raw=localStorage.getItem(ROOM_KEY);if(!raw)return false;
    const saved=JSON.parse(raw);if(!saved?.code||!['host','guest'].includes(saved.role))return false;
    const snapshot=await get(ref(db,roomPath(saved.code)));if(!snapshot.exists()){clearLocalRoom();return false;}
    const room=snapshot.val();const expected=saved.role==='host'?room.host?.uid:room.guest?.uid;
    if(expected!==state.user.uid){clearLocalRoom();return false;}
    state.roomCode=saved.code;state.role=saved.role;
    await onDisconnect(ref(db,`${roomPath(saved.code)}/presence/${saved.role}`)).set(false);
    await set(ref(db,`${roomPath(saved.code)}/presence/${saved.role}`),true);
    subscribeRoom(saved.code,saved.role);return true;
  }catch(error){console.warn('Room resume skipped:',error);clearLocalRoom();return false;}
}

async function boot(){
  try{
    state.user=await ensureSignedIn();
    const resumed=await resumePreviousRoom();
    if(!resumed)renderHome();
  }catch(error){
    console.error('Firebase initialization failed:',error);
    root.innerHTML=`<div class="room-shell"><div class="modal-symbol">♡</div><div class="eyebrow">DiRi PLAYROOM</div><h1 class="serif">We couldn’t connect.</h1><p class="muted">${esc(friendlyError(error))}</p><button class="btn btn-primary" onclick="location.reload()">Try again</button><p class="muted" style="font-size:11px">Periksa Firebase Authentication → Anonymous, Authorized domains, dan Realtime Database URL.</p></div>`;
  }
}
boot();
