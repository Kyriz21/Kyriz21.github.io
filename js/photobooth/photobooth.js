import { db, ref, get, set, update, remove, onValue, runTransaction, serverTimestamp } from '../firebase.js';
import { putLocalMedia, getLocalMedia, setLocalValue, getLocalValue, cleanupExpiredMedia } from '../services/local-store.js';

const FRAMES = [
  ['classic','Classic Strip','#ffffff','#59515a'], ['pink','Pink Romance','#fde8f0','#b85f86'],
  ['lavender','Lavender Dream','#eee8fb','#77659f'], ['retro','Retro Film','#f2e0cb','#875d42'],
  ['beige','Minimalist Beige','#f0e8dc','#86745d'], ['scrapbook','Scrapbook','#fff3dc','#916c5c'],
  ['cinema','Cinema Date','#26232c','#f2d9e6'], ['korean','Korean Four Cut','#fff7fb','#a87999'],
  ['y2k','Y2K Flash','#ece8ff','#806ac3'], ['floral','Floral Garden','#f5f1e6','#688269'],
  ['travel','Travel Postcard','#f5e8d8','#9b7155'], ['birthday','Birthday Special','#fff0f1','#c66d8c']
];
const FILTERS = ['Original','Soft Pink','Warm Film','Vintage','Black & White','Lavender','Bright','Cool Tone'];
const STICKERS = ['♡','✿','☾','☆','🌷','🦋','🎀','✨','💌','🌼'];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const randomId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const roomPublic = (code, sessionId) => ref(db, `roomGames/${code}/${sessionId}/public`);
const signalPath = (code, sessionId, attempt) => `roomGames/${code}/${sessionId}/signal/${attempt}`;
const localKey = (sessionId, token, role, index) => `${sessionId}:${token}:${role}:${index}`;

function readDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('File foto tidak dapat dibaca.'));
    reader.readAsDataURL(blob);
  });
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gambar tidak dapat diproses pada perangkat ini.'));
    image.src = source;
  });
}
async function hashBlob(blob) {
  const bytes = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function imageFilter(filter, values) {
  const preset = {
    'Original':'', 'Soft Pink':'sepia(.08) saturate(1.12) hue-rotate(315deg)',
    'Warm Film':'sepia(.22) saturate(1.13)', 'Vintage':'sepia(.35) contrast(.92)',
    'Black & White':'grayscale(1)', 'Lavender':'hue-rotate(12deg) saturate(.88)',
    'Bright':'brightness(1.12)', 'Cool Tone':'hue-rotate(12deg) saturate(.9)'
  }[filter] ?? '';
  const temp = values.temperature > 0 ? ` sepia(${values.temperature / 300})` : values.temperature < 0 ? ` hue-rotate(${values.temperature / 5}deg)` : '';
  return `${preset} brightness(${values.brightness / 100}) contrast(${values.contrast / 100}) saturate(${values.saturation / 100})${temp}`;
}

export function mountPhotobooth(root, context) {
  const { code, session, room, role, player, onBack, toast = () => {} } = context;
  const myUid = player.uid;
  const partnerRole = role === 'host' ? 'guest' : 'host';
  const partnerUid = room[partnerRole]?.uid;
  const publicRef = roomPublic(code, session.sessionId);

  let mode = 'choose';
  let pState = null;
  let unsubscribers = [];
  let stream = null;
  let rtc = null;
  let channel = null;
  let destroyed = false;
  let p2pAttemptSeen = 0;
  let p2pStarted = false;
  let p2pTimer = null;
  let candidateUnsubscribe = null;
  let lastSeenRetakeToken = null;
  let sendStarted = false;
  let localSent = false;
  let remoteDone = false;
  let incomingFile = null;
  let localPhotos = [];
  let remotePhotos = [];
  let manualPhotos = [];
  let editorData = null;
  let editorLoadKey = '';
  let selectedElementId = null;
  let soloPhotos = [];
  let soloElements = [];
  let soloFrame = 'pink';
  let soloFilter = 'Original';
  let soloAdjust = { brightness:100, contrast:100, saturation:100, temperature:0 };
  let lastTouch = 0;
  let restoringCapture = false;
  const myRoleLabel = role === 'host' ? 'Host' : 'Guest';

  function showToast(message, type = 'default') { toast(message, type); }
  function stopCamera() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    const video = root.querySelector('#pb-video');
    if (video) video.srcObject = null;
  }
  function disposePeer() {
    if (p2pTimer) clearTimeout(p2pTimer);
    p2pTimer = null;
    if (candidateUnsubscribe) { try { candidateUnsubscribe(); } catch {} }
    candidateUnsubscribe = null;
    if (rtc) { try { rtc.close(); } catch {} }
    rtc = null;
    channel = null;
  }
  function cleanup() {
    destroyed = true;
    stopCamera();
    disposePeer();
    unsubscribers.forEach(unsub => { try { unsub(); } catch {} });
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    root.removeEventListener('submit', onSubmit);
  }

  async function touchRoom() {
    if (Date.now() - lastTouch < 45000) return;
    lastTouch = Date.now();
    try { await set(ref(db, `rooms/${code}/lastMeaningfulActivityAt`), serverTimestamp()); } catch {}
  }
  async function mutate(mutator) {
    const result = await runTransaction(publicRef, current => {
      if (!current) return;
      const next = structuredClone(current);
      if (mutator(next) === false) return;
      next.updatedAt = Date.now();
      return next;
    }, { applyLocally:false });
    void touchRoom();
    return result;
  }
  async function ensureSessionState() {
    if (role !== 'host') return;
    const snapshot = await get(publicRef);
    if (snapshot.exists()) return;
    await set(publicRef, {
      gameId:'photobooth', sessionId:session.sessionId, phase:'setup',
      frameByUid:{}, filter:{preset:'Original',brightness:100,contrast:100,saturation:100,temperature:0},
      ready:{host:false,guest:false}, photosDone:{host:false,guest:false},
      p2p:{attempt:0,status:'idle'}, manualHashes:{}, elements:[], approvals:{host:false,guest:false},
      retakeRequests:{host:false,guest:false}, retakeToken:0, updatedAt:Date.now()
    });
  }
  async function init() {
    try {
      // Opportunistic cleanup for temporary photo files only. Private Gallery is stored separately and is never expired here.
      await cleanupExpiredMedia('photobooth', 24 * 60 * 60 * 1000).catch(error => console.debug('Temporary photo cleanup skipped:', error));
      await ensureSessionState();
      unsubscribers.push(onValue(publicRef, snapshot => {
        pState = snapshot.val();
        if (!pState || destroyed) return;
        const currentRetakeToken = Number(pState.retakeToken || 0);
        if (lastSeenRetakeToken === null) lastSeenRetakeToken = currentRetakeToken;
        else if (currentRetakeToken !== lastSeenRetakeToken) {
          lastSeenRetakeToken = currentRetakeToken;
          localPhotos = []; remotePhotos = []; manualPhotos = []; editorData = null; editorLoadKey = '';
          p2pStarted = false; p2pAttemptSeen = 0; localSent = false; remoteDone = false; sendStarted = false;
          disposePeer();
        }
        if (mode === 'couple') {
          if (pState.phase === 'capture') void restoreCaptureMedia();
          if (pState.phase === 'manual') { void restoreCaptureMedia(); void restoreManualPhotos(); }
          if (pState.phase === 'editor' || pState.phase === 'finalized') void ensureEditorData();
          renderCouple();
          if (role === 'guest' && pState.phase === 'capture' && pState.p2p?.status === 'connecting' && pState.p2p.attempt > p2pAttemptSeen) {
            p2pAttemptSeen = pState.p2p.attempt;
            void connectPeer('guest', p2pAttemptSeen);
          }
          if (role === 'host' && pState.phase === 'capture' && pState.photosDone?.host && pState.photosDone?.guest && pState.p2p?.status === 'idle' && !p2pStarted) {
            p2pStarted = true;
            void beginP2P();
          }
        }
      }, error => showToast(`Photobooth realtime error: ${error.message}`, 'error')));
      renderChoose();
    } catch (error) {
      root.innerHTML = `<section class="panel game-panel"><h1>Photobooth belum siap</h1><p>${esc(error.message)}</p><button class="button button-quiet" data-pb="back">Room lobby</button></section>`;
    }
  }

  function gameTop(title, subtitle, eyebrow = 'A DIRI ORIGINAL FEATURE') {
    return `<div class="game-topbar"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div><button class="button button-quiet" data-pb="back">Room lobby</button></div>`;
  }
  function renderChoose() {
    mode = 'choose';
    root.innerHTML = `<div class="photo-app">${gameTop('DiRi Photobooth ♡','A little keepsake, even from far away.')}<section class="panel photo-mode-panel"><h2>Choose your photobooth</h2><p>Ambil foto sendiri atau buat satu photo strip bersama pasangan.</p><div class="photo-mode-grid"><button class="photo-mode-card" data-pb="solo"><span>♡</span><strong>Solo Photobooth</strong><small>Four shots, 12 frames, filters and a private gallery on this device.</small></button><button class="photo-mode-card" data-pb="couple"><span>✿</span><strong>Couple Photobooth</strong><small>Four photos each, shared frame, P2P transfer, editor and final approval.</small></button></div><p class="small-note">File foto tidak diunggah ke Firebase. Couple mode mencoba WebRTC P2P menggunakan STUN, lalu menyediakan Manual Transfer jika jaringan tidak mengizinkan koneksi langsung.</p></section></div>`;
  }
  function frameButtons(active, attribute = 'solo-frame') {
    return FRAMES.map(([id, name]) => `<button type="button" class="frame-chip ${active===id?'active':''}" data-pb="${attribute}" data-frame="${id}">${name}</button>`).join('');
  }
  function renderFilterControls(filter, values, prefix = 'solo') {
    return `<div class="filter-chip-grid">${FILTERS.map(item => `<button type="button" class="filter-chip ${filter===item?'active':''}" data-pb="${prefix}-filter" data-filter="${item}">${item}</button>`).join('')}</div><div class="adjust-grid"><label>Brightness <input type="range" min="60" max="140" value="${values.brightness}" data-adjust="${prefix}-brightness"></label><label>Contrast <input type="range" min="60" max="140" value="${values.contrast}" data-adjust="${prefix}-contrast"></label><label>Saturation <input type="range" min="0" max="180" value="${values.saturation}" data-adjust="${prefix}-saturation"></label><label>Temperature <input type="range" min="-60" max="60" value="${values.temperature}" data-adjust="${prefix}-temperature"></label></div>`;
  }

  // ----------------------------- Solo Photobooth -----------------------------
  function renderSoloPreview() {
    const selected = FRAMES.find(frame => frame[0] === soloFrame) || FRAMES[1];
    const cssFilter = imageFilter(soloFilter, soloAdjust);
    return `<div class="pb-strip-header" style="color:${selected[3]}">DiRi · ${selected[1]} <span>♡</span></div><div class="pb-solo-photos">${[0,1,2,3].map(index => soloPhotos[index] ? `<div class="pb-solo-photo"><img src="${soloPhotos[index]}" style="filter:${cssFilter}" alt="Photo ${index+1}"><small>MOMENT ${String(index+1).padStart(2,'0')}</small></div>` : `<div class="pb-solo-photo empty">Your moment ${index+1}</div>`).join('')}</div><div class="pb-strip-footer" style="color:${selected[3]}">same time, different places · DiRi</div>${soloElements.map((element,index) => `<div class="pb-deco" style="left:${element.x}%;top:${element.y}%" data-solo-element="${index}">${esc(element.text)}</div>`).join('')}`;
  }
  async function renderGallery() {
    const holder = root.querySelector('#pb-gallery-list');
    if (!holder) return;
    try {
      const items = await getLocalValue('photobooth-gallery') || [];
      if (!root.querySelector('#pb-gallery-list')) return;
      holder.innerHTML = items.length ? `<div class="gallery-grid">${items.map((item,index)=>`<article class="gallery-item"><img src="${item.data}" alt="Private photo strip ${index+1}"><small>${new Date(item.date).toLocaleString()}</small><button class="button button-small button-quiet" data-pb="gallery-delete" data-index="${index}">Delete</button></article>`).join('')}</div>` : '<p class="small-note">Belum ada hasil tersimpan di galeri perangkat ini.</p>';
    } catch (error) { holder.textContent = `Galeri lokal tidak dapat dibuka: ${error.message}`; }
  }
  function attachCameraToCurrentVideo() {
    const video = root.querySelector('#pb-video');
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
      root.querySelector('#pb-camera-placeholder')?.classList.add('hidden');
    }
  }
  function renderSolo() {
    mode = 'solo';
    root.innerHTML = `<div class="photo-app">${gameTop('Solo Photobooth','Four shots, one keepsake.','SOLO SESSION · LOCAL ONLY')}<div class="photo-layout"><section class="panel photo-camera-card"><div class="camera-stage"><video id="pb-video" autoplay muted playsinline></video><div id="pb-camera-placeholder" class="camera-placeholder"><span>♡</span><b>Ready for a little photo?</b><small>Open the camera or choose four images from your gallery.</small><strong id="pb-countdown"></strong></div></div><div class="photo-controls"><button class="button button-secondary" data-pb="camera">Open camera</button><button class="button button-primary" data-pb="capture" ${stream && soloPhotos.length<4?'':'disabled'}>Take photo</button><label class="button button-quiet" for="pb-solo-files">Choose four photos</label><input id="pb-solo-files" type="file" accept="image/*" multiple hidden></div><div class="photo-slot-grid">${[0,1,2,3].map(index=>`<div class="photo-slot">${soloPhotos[index]?`<img src="${soloPhotos[index]}" alt="Photo ${index+1}">`:`<span>${index+1}</span>`}<small>${index+1}</small></div>`).join('')}</div><p class="small-note">${soloPhotos.length}/4 photos ready. File tetap tersimpan pada browser ini.</p></section><section class="panel photo-editor-card"><h2>Choose a frame</h2><div class="frame-chip-grid">${frameButtons(soloFrame)}</div><h2>Photo look</h2>${renderFilterControls(soloFilter,soloAdjust)}<div class="photo-controls"><button class="button button-secondary" data-pb="solo-sticker">Add sticker</button><form data-pb-form="solo-text"><input name="text" maxlength="50" placeholder="Add a caption"><button class="button button-quiet" type="submit">Add text</button></form></div><div class="photo-controls"><button class="button button-primary" data-pb="solo-png" ${soloPhotos.length===4?'':'disabled'}>Download PNG</button><button class="button button-secondary" data-pb="solo-jpeg" ${soloPhotos.length===4?'':'disabled'}>Download JPEG</button><button class="button button-quiet" data-pb="solo-save" ${soloPhotos.length===4?'':'disabled'}>Save to Private Gallery</button><button class="button button-quiet" data-pb="solo-reset">Retake all</button></div><div class="pb-strip ${soloFrame}" id="solo-strip">${renderSoloPreview()}</div></section></div><section class="panel private-gallery-panel"><h3>Private Gallery · This device</h3><p class="small-note">Galeri hanya tersimpan di browser/perangkat ini. Tidak otomatis tersinkron ke pasangan.</p><div id="pb-gallery-list">Loading…</div></section></div>`;
    attachCameraToCurrentVideo();
    void renderGallery();
  }
  async function openCamera() {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung akses kamera. Gunakan Choose photos.');
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video:{facingMode:'user'}, audio:false });
    const video = root.querySelector('#pb-video');
    if (!video) return;
    video.srcObject = stream;
    await video.play();
    const placeholder = root.querySelector('#pb-camera-placeholder');
    if (placeholder) placeholder.classList.add('hidden');
    const capture = root.querySelector('[data-pb="capture"]');
    if (capture) capture.disabled = soloPhotos.length >= 4;
    const coupleCapture = root.querySelector('[data-pb="capture-couple"]');
    if (coupleCapture) coupleCapture.disabled = localPhotos.filter(Boolean).length >= 4;
  }
  async function captureFromCamera(targetMode, index = null) {
    const video = root.querySelector('#pb-video');
    if (!video || !stream || !video.videoWidth) throw new Error('Kamera belum siap. Pilih Open camera terlebih dahulu.');
    const countdown = root.querySelector('#pb-countdown');
    for (let number=3; number>0; number--) {
      if (countdown) countdown.textContent = String(number);
      await wait(1000);
    }
    if (countdown) countdown.textContent = '';
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(1600, video.videoWidth);
    canvas.height = Math.round(canvas.width * video.videoHeight / video.videoWidth);
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width,0); ctx.scale(-1,1); ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/jpeg',0.88));
    if (!blob) throw new Error('Foto tidak berhasil dibuat.');
    const data = await readDataUrl(blob);
    const nextIndex = Number.isInteger(index) && index >= 0 ? index : (targetMode === 'solo' ? soloPhotos.findIndex(photo => !photo) : localPhotos.findIndex(photo => !photo));
    if (nextIndex < 0 || nextIndex >= 4) throw new Error('Empat slot foto sudah terisi. Gunakan Retake all untuk mengambil ulang.');
    if (targetMode === 'solo') {
      soloPhotos[nextIndex] = data;
      renderSolo();
    } else {
      await addCouplePhoto(blob, nextIndex, `camera-${nextIndex+1}.jpg`);
      renderCouple();
    }
  }
  async function processImages(files, max = 4) {
    if (!files?.length) return [];
    const list = [...files].filter(file => file.type.startsWith('image/')).slice(0,max);
    if (!list.length) throw new Error('Pilih file gambar yang valid.');
    const result=[];
    for (const file of list) {
      const image=await loadImage(await readDataUrl(file));
      const scale=Math.min(1,1600/Math.max(image.width,image.height));
      const canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
      canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.84));
      if (!blob) throw new Error('Salah satu gambar tidak dapat dikompres.');
      result.push({blob,url:await readDataUrl(blob),name:file.name||'photo.jpg'});
    }
    return result;
  }
  async function downloadBlob(blob, filename) {
    if (!blob) throw new Error('Hasil export tidak dapat dibuat.');
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=filename;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function renderStripBlob(photos, frameId, filter, values, elements, couple=false, mime='image/png') {
    const selected=FRAMES.find(frame=>frame[0]===frameId)||FRAMES[1];
    const canvas=document.createElement('canvas');canvas.width=couple?1200:900;canvas.height=couple?2400:2600;
    const ctx=canvas.getContext('2d');ctx.fillStyle=selected[2];ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle=selected[3];ctx.textAlign='center';ctx.font='bold 42px Georgia';ctx.fillText(`DiRi · ${selected[1]}`,canvas.width/2,70);
    const css=imageFilter(filter,values);
    if(couple){
      for(let row=0;row<4;row++)for(let column=0;column<2;column++){
        const photo=photos[column][row];if(!photo?.url)continue;
        const image=await loadImage(photo.url);const x=45+column*565,y=110+row*550;
        ctx.fillStyle='#fff';ctx.fillRect(x-5,y-5,545,510);ctx.save();ctx.filter=css;ctx.drawImage(image,x,y,535,500);ctx.restore();
      }
    }else{
      for(let index=0;index<4;index++){
        const photo=photos[index];if(!photo)continue;
        const image=await loadImage(photo);const y=110+index*585;
        ctx.fillStyle='#fff';ctx.fillRect(72,y-8,756,530);ctx.save();ctx.filter=css;ctx.drawImage(image,80,y,740,514);ctx.restore();
        ctx.fillStyle=selected[3];ctx.textAlign='left';ctx.font='18px Arial';ctx.fillText(`MOMENT ${String(index+1).padStart(2,'0')}`,85,y+542);
      }
    }
    ctx.textAlign='center';ctx.fillStyle=selected[3];ctx.font='italic 27px Georgia';ctx.fillText('same time, different places.',canvas.width/2,canvas.height-45);
    (elements||[]).forEach(element=>{ctx.save();ctx.fillStyle=element.color||selected[3];ctx.textAlign='center';ctx.font=`${Math.max(20,38*(element.scale||1))}px Georgia`;ctx.fillText(element.text,canvas.width*(element.x??.5),canvas.height*(element.y??.5));ctx.restore();});
    const type=mime==='image/jpeg'?'image/jpeg':'image/png';
    return await new Promise(resolve=>canvas.toBlob(resolve,type,0.9));
  }
  async function saveSoloGallery() {
    const blob=await renderStripBlob(soloPhotos,soloFrame,soloFilter,soloAdjust,soloElements,false,'image/jpeg');
    const data=await readDataUrl(blob);const items=await getLocalValue('photobooth-gallery')||[];
    items.unshift({id:randomId(),data,date:Date.now()});await setLocalValue('photobooth-gallery',items.slice(0,15));
    showToast('Photo strip disimpan pada Private Gallery perangkat ini.','success');void renderGallery();
  }

  // ----------------------------- Couple Photobooth ---------------------------
  function sharedFilter() { return pState?.filter?.preset || 'Original'; }
  function sharedAdjustments() { return {brightness:pState?.filter?.brightness??100,contrast:pState?.filter?.contrast??100,saturation:pState?.filter?.saturation??100,temperature:pState?.filter?.temperature??0}; }
  function renderCoupleSetup() {
    const frames=pState?.frameByUid||{};const matched=frames.host&&frames.host===frames.guest;const approved=pState?.ready||{};
    const filter=pState?.filter||{preset:'Original',brightness:100,contrast:100,saturation:100,temperature:0};
    return `${gameTop('Couple Photobooth ♡','Choose the same frame and photo look together.','COUPLE SESSION · TWO DEVICES')}<section class="panel photo-editor-card"><h2>1. Choose the same frame</h2><div class="frame-chip-grid">${frameButtons(frames[role]||'pink','couple-frame')}</div><div class="approval-grid"><span>Host: ${esc(FRAMES.find(f=>f[0]===frames.host)?.[1]||'Not selected')}</span><span>Guest: ${esc(FRAMES.find(f=>f[0]===frames.guest)?.[1]||'Not selected')}</span></div><h2>2. Shared Filter</h2>${role==='host'?renderFilterControls(filter.preset,filter,'couple'): `<p class="small-note">Host mengatur preset dan nilai filter. Kamu meninjau filter yang sama di bawah.</p><p><strong>${esc(filter.preset)}</strong> · Brightness ${filter.brightness} · Contrast ${filter.contrast} · Saturation ${filter.saturation} · Temperature ${filter.temperature}</p>`}<div class="approval-grid"><span class="ready-chip ${approved.host?'done':''}">Host ${approved.host?'Ready':'Not ready'}</span><span class="ready-chip ${approved.guest?'done':''}">Guest ${approved.guest?'Ready':'Not ready'}</span></div><div class="photo-controls"><button class="button button-primary" data-pb="couple-ready" ${matched?'':'disabled'}>${approved[role]?'Cancel Ready':'I am ready'}</button><span class="small-note">Countdown 3 seconds begins after both players are ready.</span></div><p class="small-note">Pilih satu dari 12 frame. Jika frame atau filter berubah, status Ready kedua pemain akan direset.</p></section>`;
  }
  function renderCapture() {
    const done=pState?.photosDone||{};const ready=localPhotos.length===4;
    return `${gameTop('Your four moments','Each player prepares four photos on their own device.','COUPLE PHOTO CAPTURE')}<div class="photo-layout"><section class="panel photo-camera-card"><div class="camera-stage"><video id="pb-video" autoplay muted playsinline></video><div id="pb-camera-placeholder" class="camera-placeholder"><span>♡</span><b>Four photos for your shared strip</b><small>Use camera or import four photos.</small><strong id="pb-countdown"></strong></div></div><div class="photo-controls"><button class="button button-secondary" data-pb="camera">Open camera</button><button class="button button-primary" data-pb="capture-couple" ${stream && localPhotos.filter(Boolean).length<4?'':'disabled'}>Take next photo</button><label class="button button-quiet" for="pb-couple-files">Choose four photos</label><input id="pb-couple-files" type="file" accept="image/*" multiple hidden></div><div class="photo-slot-grid">${[0,1,2,3].map(index=>`<div class="photo-slot">${localPhotos[index]?`<img src="${localPhotos[index].url}" alt="Your photo ${index+1}">`:`<span>${index+1}</span>`}<small>${index+1}</small></div>`).join('')}</div><p class="small-note">${localPhotos.length}/4 photos prepared on this device.</p><button class="button button-primary" data-pb="couple-photos-ready" ${ready?'':'disabled'}>Confirm my four photos ready</button><p class="small-note">Host: ${done.host?'4 photos ready':'preparing'} · Guest: ${done.guest?'4 photos ready':'preparing'}</p></section></div>`;
  }
  function renderManualTransfer() {
    const hashes=pState?.manualHashes||{};
    return `${gameTop('Manual Transfer','P2P could not connect after one retry. Exchange the same eight images outside this website.','PHOTObooth · MANUAL FALLBACK')}<section class="panel photo-editor-card"><div class="room-alert">Tidak ada foto yang diunggah ke server. Kirim 8 file melalui aplikasi lain, lalu kedua perangkat mengimpor file yang sama dengan urutan yang sama: Host 1–4, kemudian Guest 1–4.</div><label class="button button-secondary file-button">Import the same eight photos<input type="file" accept="image/*" multiple data-pb-manual hidden></label><p class="small-note">Imported: ${manualPhotos.length}/8. Host ${hashes.host?'verified':'waiting'} · Guest ${hashes.guest?'verified':'waiting'}.</p><div class="photo-controls"><button class="button button-primary" data-pb="verify-manual" ${manualPhotos.length===8?'':'disabled'}>Verify identical photo set</button><button class="button button-quiet" data-pb="solo-fallback">Use Solo instead</button><button class="button button-quiet" data-pb="abort-couple">Cancel session</button></div></section>`;
  }
  function renderSharedStrip() {
    if(!editorData) return '<div class="photo-editor-card"><p>Memulihkan foto lokal untuk editor bersama…</p></div>';
    const selected=FRAMES.find(f=>f[0]===pState.frameByUid?.host)||FRAMES[1];
    const css=imageFilter(sharedFilter(),sharedAdjustments());
    const rows=[0,1,2,3].map(index=>`<div class="pb-couple-row"><img src="${editorData.host[index]?.url||''}" alt="Host photo ${index+1}" style="filter:${css}"><img src="${editorData.guest[index]?.url||''}" alt="Guest photo ${index+1}" style="filter:${css}"></div>`).join('');
    const elements=(pState.elements||[]).map(element=>`<button type="button" class="pb-shared-element ${selectedElementId===element.id?'selected':''}" style="left:${(element.x??.5)*100}%;top:${(element.y??.5)*100}%;font-size:${Math.max(16,38*(element.scale||1))}px;color:${esc(element.color||selected[3])}" data-pb="select-element" data-element-id="${esc(element.id)}">${esc(element.text)}</button>`).join('');
    return `<div class="pb-couple-strip ${selected[0]}"><div class="pb-strip-header" style="color:${selected[3]}">DiRi · ${selected[1]} <span>♡</span></div><div class="pb-couple-rows">${rows}${elements}</div><div class="pb-strip-footer" style="color:${selected[3]}">two places, one little memory · DiRi</div></div>`;
  }
  function renderSharedEditor() {
    const approvals=pState?.approvals||{};
    const selected=(pState.elements||[]).find(element=>element.id===selectedElementId);
    return `${gameTop('Our Shared Editor','One shared strip. Both of you can add and arrange decorations.','COUPLE PHOTOBOOTH · SHARED EDITOR')}<div class="photo-layout"><section class="panel shared-editor-panel"><div class="photo-controls"><button class="button button-secondary" data-pb="add-sticker">Add sticker</button><form data-pb-form="couple-text"><input name="text" maxlength="50" placeholder="Add a caption"><button class="button button-quiet" type="submit">Add text</button></form></div><p class="small-note">Tap a sticker/text on the strip to select it, then use the move, size, or delete controls. Undo only removes your own latest decoration.</p><div class="element-tools"><button class="button button-small" data-pb="move-left" ${selected?'':'disabled'}>←</button><button class="button button-small" data-pb="move-right" ${selected?'':'disabled'}>→</button><button class="button button-small" data-pb="move-up" ${selected?'':'disabled'}>↑</button><button class="button button-small" data-pb="move-down" ${selected?'':'disabled'}>↓</button><button class="button button-small" data-pb="size-up" ${selected?'':'disabled'}>A+</button><button class="button button-small" data-pb="size-down" ${selected?'':'disabled'}>A−</button><button class="button button-small button-quiet" data-pb="delete-element" ${selected?'':'disabled'}>Delete selected</button><button class="button button-small button-quiet" data-pb="undo-own">Undo my last</button></div><div class="pb-shared-preview">${renderSharedStrip()}</div><div class="approval-grid"><span class="ready-chip ${approvals.host?'done':''}">Host ${approvals.host?'Approved':'Pending'}</span><span class="ready-chip ${approvals.guest?'done':''}">Guest ${approvals.guest?'Approved':'Pending'}</span></div><div class="photo-controls"><button class="button button-primary" data-pb="final-approve">${approvals[role]?'Cancel approval':'Approve final photo'}</button><button class="button button-quiet" data-pb="retake-all">Request mutual full retake</button></div><p class="small-note">Frame/filter selection is locked after capture. Full retake requires both players' approval. Pair-specific retake is noted for a later refinement after review.</p></section></div>`;
  }
  function renderFinalized() {
    const approvals=pState?.approvals||{};
    return `${gameTop('Our little keepsake ♡','Both players approved the final strip. Each device can save its own copy.','FINALIZED PHOTO STRIP')}<section class="panel photo-editor-card"><div class="pb-shared-preview">${renderSharedStrip()}</div><p class="small-note">Host ${approvals.host?'approved':'pending'} · Guest ${approvals.guest?'approved':'pending'}</p><div class="photo-controls"><button class="button button-primary" data-pb="couple-png">Download PNG</button><button class="button button-secondary" data-pb="couple-jpeg">Download JPEG</button><button class="button button-quiet" data-pb="save-couple-gallery">Save to this device's Private Gallery</button><button class="button button-quiet" data-pb="retake-all">Request mutual full retake</button></div><p class="small-note">Private Gallery is local to this browser. It does not sync to the other device.</p></section>`;
  }
  function renderCouple() {
    mode = 'couple';
    if (!pState) { root.innerHTML = '<section class="panel game-panel"><p>Menyiapkan Couple Photobooth…</p></section>'; return; }
    if (pState.phase === 'setup') root.innerHTML = `<div class="photo-app">${renderCoupleSetup()}</div>`;
    else if (pState.phase === 'capture') root.innerHTML = `<div class="photo-app">${renderCapture()}</div>`;
    else if (pState.phase === 'manual') root.innerHTML = `<div class="photo-app">${renderManualTransfer()}</div>`;
    else if (pState.phase === 'editor') root.innerHTML = `<div class="photo-app">${renderSharedEditor()}</div>`;
    else if (pState.phase === 'finalized') root.innerHTML = `<div class="photo-app">${renderFinalized()}</div>`;
    else root.innerHTML = `<div class="photo-app"><section class="panel game-panel"><h2>Photobooth session ended</h2><button class="button button-quiet" data-pb="back">Room lobby</button></section></div>`;
    attachCameraToCurrentVideo();
  }
  async function addCouplePhoto(blob, index, name) {
    const data = await readDataUrl(blob);
    localPhotos[index] = { blob, url:data, name };
    if (pState?.retakeToken === undefined) return;
    await putLocalMedia('photobooth', localKey(session.sessionId,pState.retakeToken,role,index), blob);
  }
  async function restoreCaptureMedia() {
    if (restoringCapture || !pState) return;
    restoringCapture=true;
    try {
      const restored=[];
      for (let index=0;index<4;index++) {
        if (localPhotos[index]) { restored[index]=localPhotos[index]; continue; }
        const blob=await getLocalMedia('photobooth',localKey(session.sessionId,pState.retakeToken||0,role,index));
        if (blob) restored[index]={blob,url:await readDataUrl(blob),name:`photo-${index+1}.jpg`};
      }
      if (restored.some(Boolean)) localPhotos=restored;
    } catch (error) { console.warn('Local photo restore:',error); }
    finally { restoringCapture=false; }
  }
  async function ensureEditorData() {
    const key=`${pState?.retakeToken||0}:${pState?.p2p?.status||''}`;
    if (editorData && editorLoadKey===key) return;
    if (editorLoadKey===`loading:${key}`) return;
    editorLoadKey=`loading:${key}`;
    const host=[],guest=[];
    try {
      for (let index=0;index<4;index++) {
        const hostBlob=await getLocalMedia('photobooth',localKey(session.sessionId,pState.retakeToken||0,'host',index));
        const guestBlob=await getLocalMedia('photobooth',localKey(session.sessionId,pState.retakeToken||0,'guest',index));
        if (hostBlob) host[index]={blob:hostBlob,url:await readDataUrl(hostBlob)};
        if (guestBlob) guest[index]={blob:guestBlob,url:await readDataUrl(guestBlob)};
      }
      if(host.length===4 && guest.length===4 && host.every(Boolean) && guest.every(Boolean)) editorData={host,guest};
      else editorData=null;
      editorLoadKey=editorData?key:'';
    } catch (error) { editorData=null;editorLoadKey='';showToast(`Foto lokal tidak dapat dipulihkan: ${error.message}`,'error'); }
    if (mode==='couple' && pState?.phase==='editor') renderCouple();
  }
  async function beginCaptureReady() {
    if (!pState?.frameByUid?.host || pState.frameByUid.host !== pState.frameByUid.guest) throw new Error('Kedua pemain harus memilih frame yang sama.');
    await mutate(state => {
      state.ready=state.ready||{host:false,guest:false};
      state.ready[role]=!state.ready[role];
      if (state.frameByUid?.host !== state.frameByUid?.guest) return false;
      if (state.ready.host && state.ready.guest) { state.phase='capture';state.photosDone={host:false,guest:false};state.p2p={attempt:0,status:'idle'};state.manualHashes={};state.retakeToken=state.retakeToken||0; }
    });
  }
  async function confirmPhotosReady() {
    if (localPhotos.length!==4 || !localPhotos.every(Boolean)) throw new Error('Siapkan tepat empat foto terlebih dahulu.');
    await mutate(state => { state.photosDone=state.photosDone||{host:false,guest:false};state.photosDone[role]=true; });
    showToast('Empat foto sudah siap. Menunggu pasangan…','success');
    const latest=(await get(publicRef)).val();
    if (role==='host' && latest?.photosDone?.host && latest?.photosDone?.guest && latest.p2p?.status==='idle' && !p2pStarted) { p2pStarted=true;void beginP2P(); }
  }
  function waitForValue(path, timeoutMs) {
    return new Promise((resolve,reject) => {
      let done=false;const target=ref(db,path);
      const unsubscribe=onValue(target,snapshot=>{if(snapshot.exists()&&!done){done=true;unsubscribe();clearTimeout(timer);resolve(snapshot.val());}},error=>{if(!done){done=true;unsubscribe();clearTimeout(timer);reject(error);}});
      const timer=setTimeout(()=>{if(!done){done=true;unsubscribe();reject(new Error('P2P negotiation timeout'));}},timeoutMs);
      unsubscribers.push(unsubscribe);
    });
  }
  async function connectPeer(side, attempt) {
    disposePeer();localSent=false;remoteDone=false;sendStarted=false;incomingFile=null;
    remotePhotos=[];
    let timeoutId;
    const negotiation = (async () => {
      try {
        rtc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]});
        const path=signalPath(code,session.sessionId,attempt);
        const seenCandidates=new Set();let candidateQueue=[];
        const remoteCandidateRole=side==='host'?'guest':'host';
        candidateUnsubscribe=onValue(ref(db,`${path}/${remoteCandidateRole}Candidates`),snapshot=>{
          snapshot.forEach(child=>{if(seenCandidates.has(child.key))return;seenCandidates.add(child.key);const candidate=child.val();if(!rtc?.remoteDescription)candidateQueue.push(candidate);else void rtc.addIceCandidate(new RTCIceCandidate(candidate)).catch(error=>console.debug('ICE candidate skipped',error));});
        });
        rtc.onicecandidate=event=>{if(event.candidate)void set(ref(db,`${path}/${side}Candidates/${randomId()}`),event.candidate.toJSON()).catch(error=>console.warn('ICE signal write failed',error));};
        const flushCandidates=async()=>{for(const candidate of candidateQueue){try{await rtc.addIceCandidate(new RTCIceCandidate(candidate));}catch{}}candidateQueue=[];};
        if(side==='host') {
          channel=rtc.createDataChannel('diri-photo-transfer',{ordered:true});wireDataChannel(channel);
          const offer=await rtc.createOffer();await rtc.setLocalDescription(offer);
          await set(ref(db,`${path}/offer`),{type:offer.type,sdp:offer.sdp});
          const answer=await waitForValue(`${path}/answer`,18000);
          await rtc.setRemoteDescription(new RTCSessionDescription(answer));await flushCandidates();
        } else {
          const channelReady=new Promise(resolve=>{
            rtc.addEventListener('datachannel',event=>{channel=event.channel;wireDataChannel(channel);resolve(channel);},{once:true});
          });
          const offer=await waitForValue(`${path}/offer`,18000);
          await rtc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer=await rtc.createAnswer();await rtc.setLocalDescription(answer);
          await set(ref(db,`${path}/answer`),{type:answer.type,sdp:answer.sdp});await flushCandidates();
          await Promise.race([channelReady,wait(18000).then(()=>{throw new Error('DataChannel did not arrive.');})]);
        }
        await waitChannelOpen(18000);
        return true;
      } catch (error) {
        console.warn('WebRTC connection attempt failed:',error);
        return false;
      }
    })();
    const timedOut = new Promise(resolve => {
      timeoutId=setTimeout(()=>{disposePeer();resolve(false);},20000);
    });
    const connected=await Promise.race([negotiation,timedOut]);
    clearTimeout(timeoutId);
    if(!connected) disposePeer();
    return connected;
  }
  function waitChannelOpen(timeoutMs) {
    return new Promise((resolve,reject)=>{
      if (!channel) return reject(new Error('DataChannel is not available.'));
      if (channel.readyState==='open') { void sendLocalFiles();resolve(true);return; }
      const timer=setTimeout(()=>reject(new Error('DataChannel open timeout.')),timeoutMs);
      channel.addEventListener('open',()=>{clearTimeout(timer);void sendLocalFiles();resolve(true);},{once:true});
      channel.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('DataChannel error.'));},{once:true});
    });
  }
  function wireDataChannel(dataChannel) {
    dataChannel.binaryType='arraybuffer';
    dataChannel.onmessage=async event=>{
      if (typeof event.data==='string') {
        let message;try{message=JSON.parse(event.data);}catch{return;}
        if (message.type==='file-start') incomingFile={index:message.index,mime:message.mime,name:message.name,chunks:[]};
        else if (message.type==='file-end' && incomingFile) {
          const blob=new Blob(incomingFile.chunks,{type:incomingFile.mime});
          const key=localKey(session.sessionId,pState?.retakeToken||0,partnerRole,incomingFile.index);
          await putLocalMedia('photobooth',key,blob);
          remotePhotos[incomingFile.index]={blob,url:await readDataUrl(blob),name:incomingFile.name};
          incomingFile=null;
          await finishP2PIfReady();
        } else if (message.type==='all-done') {
          remoteDone=true;
          await finishP2PIfReady();
        }
      } else if (incomingFile) incomingFile.chunks.push(event.data);
    };
  }
  async function sendLocalFiles() {
    if (sendStarted || !channel || channel.readyState!=='open' || localPhotos.length!==4) return;
    sendStarted=true;
    try {
      for (let index=0;index<4;index++) {
        const photo=localPhotos[index];const blob=photo.blob;
        channel.send(JSON.stringify({type:'file-start',index,mime:blob.type||'image/jpeg',name:photo.name||`photo-${index+1}.jpg`}));
        const buffer=await blob.arrayBuffer();const chunkSize=16*1024;
        for (let offset=0;offset<buffer.byteLength;offset+=chunkSize) {
          while(channel.bufferedAmount>512*1024) await wait(30);
          channel.send(buffer.slice(offset,Math.min(offset+chunkSize,buffer.byteLength)));
        }
        channel.send(JSON.stringify({type:'file-end',index}));
      }
      channel.send(JSON.stringify({type:'all-done',role}));localSent=true;
      await finishP2PIfReady();
    } catch (error) { showToast(`Transfer foto gagal: ${error.message}`,'error'); }
  }
  async function finishP2PIfReady() {
    if (!localSent || !remoteDone || remotePhotos.filter(Boolean).length!==4 || !localPhotos.every(Boolean)) return;
    for (let index=0;index<4;index++) await putLocalMedia('photobooth',localKey(session.sessionId,pState?.retakeToken||0,role,index),localPhotos[index].blob);
    const host=role==='host'?localPhotos:remotePhotos;const guest=role==='guest'?localPhotos:remotePhotos;
    editorData={host,guest};editorLoadKey=`${pState?.retakeToken||0}:complete`;
    await mutate(state=>{if(state.phase!=='capture')return false;state.phase='editor';state.p2p.status='complete';state.elements=state.elements||[];state.approvals={host:false,guest:false};});
  }
  async function beginP2P() {
    if (role!=='host' || !pState?.photosDone?.host || !pState?.photosDone?.guest) return;
    for (let attempt=1;attempt<=2;attempt++) {
      remotePhotos=[];localSent=false;remoteDone=false;sendStarted=false;p2pStarted=true;
      await mutate(state=>{state.p2p={attempt,status:'connecting',startedAt:Date.now()};});
      p2pAttemptSeen=attempt;
      const connected=await connectPeer('host',attempt);
      if (connected) {
        // Allow a separate transfer window after the ~20-second connection attempt.
        await new Promise(resolve=>{p2pTimer=setTimeout(resolve,30000);const check=setInterval(()=>{if(pState?.phase==='editor'||destroyed){clearInterval(check);clearTimeout(p2pTimer);resolve();}},250);});
        if (pState?.phase==='editor') return;
      }
      disposePeer();
      if (attempt===1) { showToast('Koneksi langsung belum berhasil. Mencoba sekali lagi…','error');await wait(800); }
    }
    await mutate(state=>{if(state.phase==='capture'){state.phase='manual';state.p2p.status='manual-fallback';}});
    showToast('P2P tidak tersedia pada jaringan ini. Gunakan Manual Transfer.','error');
  }
  async function restoreManualPhotos() {
    if (manualPhotos.length===8 || !pState) return;
    const restored=[];
    const token=pState.retakeToken||0;
    const savedHashes=await getLocalValue(`photobooth-manual-hashes:${session.sessionId}:${token}`)||[];
    for (let index=0;index<8;index++) {
      const blob=await getLocalMedia('photobooth',`${session.sessionId}:manual:${token}:${index}`);
      if(blob)restored[index]={blob,url:await readDataUrl(blob),hash:savedHashes[index]||await hashBlob(blob)};
    }
    if (restored.filter(Boolean).length===8) manualPhotos=restored;
  }
  async function verifyManual() {
    if (manualPhotos.length!==8 || !manualPhotos.every(Boolean)) throw new Error('Pilih tepat delapan foto terlebih dahulu.');
    const hashes=manualPhotos.map(photo=>photo.hash);
    await mutate(state=>{state.manualHashes=state.manualHashes||{};state.manualHashes[role]=hashes;});
    const latest=(await get(publicRef)).val();
    if (latest?.manualHashes?.host && latest?.manualHashes?.guest) {
      if (JSON.stringify(latest.manualHashes.host)!==JSON.stringify(latest.manualHashes.guest)) throw new Error('Hash foto berbeda. Pastikan file dan urutan Host 1–4 lalu Guest 1–4 benar-benar sama.');
      for(let index=0;index<4;index++) {
        await putLocalMedia('photobooth',localKey(session.sessionId,latest.retakeToken||0,'host',index),manualPhotos[index].blob);
        await putLocalMedia('photobooth',localKey(session.sessionId,latest.retakeToken||0,'guest',index),manualPhotos[index+4].blob);
      }
      editorData={host:manualPhotos.slice(0,4),guest:manualPhotos.slice(4,8)};
      editorLoadKey=`${latest.retakeToken||0}:manual`;
      await mutate(state=>{if(state.phase!=='manual')return false;state.phase='editor';state.p2p.status='manual-complete';state.elements=state.elements||[];state.approvals={host:false,guest:false};});
    } else showToast('Menunggu pasangan mengimpor delapan file yang sama dan urutannya sama.');
  }
  async function addEditorElement(text) {
    const clean=String(text||'').trim().slice(0,50);if(!clean)return;
    await mutate(state=>{if(state.phase!=='editor')return false;state.elements=state.elements||[];state.elements.push({id:randomId(),text:clean,x:.5+(Math.random()-.5)*.16,y:.48+(Math.random()-.5)*.16,scale:1,color:'#a45f82',createdBy:myUid,createdAt:Date.now()});state.approvals={host:false,guest:false};});
  }
  async function updateSelectedElement(action) {
    if(!selectedElementId)return;
    await mutate(state=>{
      if(state.phase!=='editor')return false;
      const element=(state.elements||[]).find(item=>item.id===selectedElementId);if(!element)return false;
      const step=.025;
      if(action==='move-left')element.x=Math.max(.05,element.x-step);
      if(action==='move-right')element.x=Math.min(.95,element.x+step);
      if(action==='move-up')element.y=Math.max(.05,element.y-step);
      if(action==='move-down')element.y=Math.min(.95,element.y+step);
      if(action==='size-up')element.scale=Math.min(2,Number(element.scale||1)+.15);
      if(action==='size-down')element.scale=Math.max(.5,Number(element.scale||1)-.15);
      if(action==='delete-element')state.elements=state.elements.filter(item=>item.id!==selectedElementId);
      state.approvals={host:false,guest:false};
    });
  }
  async function undoOwnElement() {
    await mutate(state=>{if(state.phase!=='editor')return false;const index=(state.elements||[]).map(item=>item.createdBy).lastIndexOf(myUid);if(index<0)return false;state.elements.splice(index,1);state.approvals={host:false,guest:false};});
  }
  async function approveFinal() {
    await mutate(state=>{if(state.phase!=='editor')return false;state.approvals=state.approvals||{host:false,guest:false};state.approvals[role]=!state.approvals[role];if(state.approvals.host&&state.approvals.guest)state.phase='finalized';});
  }
  async function requestFullRetake() {
    await mutate(state=>{
      if(!['editor','finalized'].includes(state.phase))return false;
      state.retakeRequests=state.retakeRequests||{host:false,guest:false};
      state.retakeRequests[role]=!state.retakeRequests[role];
      if(state.retakeRequests.host&&state.retakeRequests.guest){
        state.retakeToken=(state.retakeToken||0)+1;state.phase='capture';state.photosDone={host:false,guest:false};state.ready={host:false,guest:false};state.p2p={attempt:0,status:'idle'};state.manualHashes={};state.retakeRequests={host:false,guest:false};state.elements=[];state.approvals={host:false,guest:false};
      }
    });
    showToast('Permintaan retake dikirim. Kedua pemain harus menyetujuinya.');
  }
  async function downloadCouple(mime) {
    if (!editorData) await ensureEditorData();
    if (!editorData || !editorData.host.every(Boolean) || !editorData.guest.every(Boolean)) throw new Error('Foto lokal belum lengkap pada perangkat ini.');
    const blob=await renderStripBlob([editorData.host,editorData.guest],pState.frameByUid.host,sharedFilter(),sharedAdjustments(),pState.elements||[],true,mime);
    await downloadBlob(blob,`diri-couple-photostrip.${mime==='image/jpeg'?'jpg':'png'}`);
  }
  async function saveCoupleGallery() {
    if (!editorData) await ensureEditorData();
    const blob=await renderStripBlob([editorData.host,editorData.guest],pState.frameByUid.host,sharedFilter(),sharedAdjustments(),pState.elements||[],true,'image/jpeg');
    const data=await readDataUrl(blob);const items=await getLocalValue('photobooth-gallery')||[];
    items.unshift({id:randomId(),data,date:Date.now()});await setLocalValue('photobooth-gallery',items.slice(0,15));
    showToast('Couple photo strip disimpan di Private Gallery perangkat ini.','success');
  }

  // ----------------------------- Event handling ------------------------------
  async function onClick(event) {
    const button=event.target.closest('[data-pb]');if(!button||button.disabled)return;
    const action=button.dataset.pb;event.preventDefault();
    try {
      if(action==='back'){stopCamera();await onBack();return;}
      if(action==='solo'){stopCamera();renderSolo();return;}
      if(action==='couple'){mode='couple';if(pState?.phase==='setup')renderCouple();else if(pState?.phase==='capture')renderCouple();else renderCouple();return;}
      if(action==='camera'){await openCamera();return;}
      if(action==='capture'){await captureFromCamera('solo',soloPhotos.findIndex(photo=>!photo));return;}
      if(action==='capture-couple'){await captureFromCamera('couple',localPhotos.findIndex(photo=>!photo));return;}
      if(action==='solo-reset'){soloPhotos=[];soloElements=[];renderSolo();return;}
      if(action==='solo-sticker'){soloElements.push({text:STICKERS[Math.floor(Math.random()*STICKERS.length)],x:50,y:48});renderSolo();return;}
      if(action==='solo-frame'){soloFrame=button.dataset.frame;renderSolo();return;}
      if(action==='solo-filter'){soloFilter=button.dataset.filter;renderSolo();return;}
      if(action==='solo-png'){const blob=await renderStripBlob(soloPhotos,soloFrame,soloFilter,soloAdjust,soloElements,false,'image/png');await downloadBlob(blob,'diri-solo-photostrip.png');return;}
      if(action==='solo-jpeg'){const blob=await renderStripBlob(soloPhotos,soloFrame,soloFilter,soloAdjust,soloElements,false,'image/jpeg');await downloadBlob(blob,'diri-solo-photostrip.jpg');return;}
      if(action==='solo-save'){await saveSoloGallery();return;}
      if(action==='gallery-delete'){const items=await getLocalValue('photobooth-gallery')||[];items.splice(Number(button.dataset.index),1);await setLocalValue('photobooth-gallery',items);void renderGallery();return;}
      if(action==='couple-frame'){await mutate(state=>{state.frameByUid=state.frameByUid||{};state.frameByUid[role]=button.dataset.frame;state.ready={host:false,guest:false};});return;}
      if(action==='couple-filter'){
        if(role!=='host')return showToast('Host mengatur filter bersama.');
        await mutate(state=>{state.filter=state.filter||{};state.filter.preset=button.dataset.filter;state.ready={host:false,guest:false};});return;
      }
      if(action==='couple-ready'){await beginCaptureReady();return;}
      if(action==='couple-photos-ready'){await confirmPhotosReady();return;}
      if(action==='verify-manual'){await verifyManual();return;}
      if(action==='solo-fallback'){await mutate(state=>{state.phase='aborted';});disposePeer();mode='solo';renderSolo();showToast('Sesi Couple dihentikan. Kamu dapat melanjutkan Solo Photobooth.');return;}
      if(action==='abort-couple'){await mutate(state=>{state.phase='aborted';});return;}
      if(action==='select-element'){selectedElementId=button.dataset.elementId;renderCouple();return;}
      if(['move-left','move-right','move-up','move-down','size-up','size-down','delete-element'].includes(action)){await updateSelectedElement(action);return;}
      if(action==='undo-own'){await undoOwnElement();return;}
      if(action==='add-sticker'){await addEditorElement(STICKERS[Math.floor(Math.random()*STICKERS.length)]);return;}
      if(action==='final-approve'){await approveFinal();return;}
      if(action==='retake-all'){await requestFullRetake();return;}
      if(action==='couple-png'){if(pState.phase!=='finalized')throw new Error('Kedua pemain harus menyetujui hasil akhir terlebih dahulu.');await downloadCouple('image/png');return;}
      if(action==='couple-jpeg'){if(pState.phase!=='finalized')throw new Error('Kedua pemain harus menyetujui hasil akhir terlebih dahulu.');await downloadCouple('image/jpeg');return;}
      if(action==='save-couple-gallery'){if(pState.phase!=='finalized')throw new Error('Hasil belum disetujui kedua pemain.');await saveCoupleGallery();return;}
    } catch(error) { showToast(error.message,'error'); }
  }
  async function onChange(event) {
    const element=event.target;
    try {
      if(element.matches('#pb-solo-files')) {
        const photos=await processImages(element.files,4);if(photos.length!==4)throw new Error('Pilih tepat empat foto.');soloPhotos=photos.map(photo=>photo.url);renderSolo();
      }
      if(element.matches('#pb-couple-files')) {
        const photos=await processImages(element.files,4);if(photos.length!==4)throw new Error('Pilih tepat empat foto.');
        localPhotos=[];for(let index=0;index<4;index++)await addCouplePhoto(photos[index].blob,index,photos[index].name);renderCouple();
      }
      if(element.matches('[data-pb-manual]')) {
        const files=[...element.files].filter(file=>file.type.startsWith('image/')).slice(0,8);if(files.length!==8)throw new Error('Manual Transfer membutuhkan tepat delapan foto.');
        manualPhotos=await processImages(files,8);if(manualPhotos.length!==8)throw new Error('Semua delapan foto harus valid.');
        // Hash original file bytes, not re-encoded canvas JPEG bytes: different browsers can encode the same image differently.
        const sourceHashes=await Promise.all(files.map(file=>hashBlob(file)));
        for(let index=0;index<8;index++){manualPhotos[index].hash=sourceHashes[index];await putLocalMedia('photobooth',`${session.sessionId}:manual:${pState.retakeToken||0}:${index}`,manualPhotos[index].blob);}
        await setLocalValue(`photobooth-manual-hashes:${session.sessionId}:${pState.retakeToken||0}`,sourceHashes);
        renderCouple();
      }
      if(element.matches('[data-adjust]')) {
        const [prefix,key]=element.dataset.adjust.split('-');
        if(prefix==='solo'){soloAdjust[key]=Number(element.value);const strip=root.querySelector('#solo-strip');if(strip)strip.innerHTML=renderSoloPreview();}
        else if(prefix==='couple'&&role==='host'){await mutate(state=>{state.filter=state.filter||{};state.filter[key]=Number(element.value);state.ready={host:false,guest:false};});}
      }
    } catch(error) { showToast(error.message,'error'); }
  }
  async function onSubmit(event) {
    const form=event.target.closest('[data-pb-form]');if(!form)return;event.preventDefault();
    try {
      const text=form.elements.text.value;
      if(form.dataset.pbForm==='solo-text'){soloElements.push({text,x:50,y:50});renderSolo();}
      if(form.dataset.pbForm==='couple-text'){await addEditorElement(text);}
    } catch(error) { showToast(error.message,'error'); }
  }
  root.addEventListener('click',onClick);
  root.addEventListener('change',onChange);
  root.addEventListener('submit',onSubmit);
  void init();
  return { destroy:cleanup };
}
