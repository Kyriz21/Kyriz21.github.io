let activeStream = null;
let chosenPhotos = [];
let selectedFrame = 'rose';
const frameThemes = {
  rose: { bg:'#f7e4ea', accent:'#b75e7b', title:'OUR LITTLE MOMENTS' },
  lilac: { bg:'#eee8f5', accent:'#897aa2', title:'TWO HEARTS, ONE STORY' },
  cream: { bg:'#f4eadb', accent:'#9b785b', title:'A DAY TO REMEMBER' }
};

function stopStream() {
  if (activeStream) activeStream.getTracks().forEach(track => track.stop());
  activeStream = null;
}
function addPhoto(url) {
  if (chosenPhotos.length >= 4) chosenPhotos.shift();
  chosenPhotos.push(url);
}
function updateSlots(root) {
  const slots = root.querySelector('#photo-slots');
  const strip = root.querySelector('#photo-strip-preview');
  if (!slots || !strip) return;
  slots.innerHTML = Array.from({length:4},(_,i)=>chosenPhotos[i]
    ? `<div class="photo-slot"><img src="${chosenPhotos[i]}" alt="Foto ${i+1}"></div>`
    : `<div class="photo-slot">${i+1}</div>`).join('');
  const theme=frameThemes[selectedFrame];
  strip.style.background=theme.bg;
  strip.innerHTML=`<h3 style="color:${theme.accent}">DiRi Photo Club ♡</h3>${chosenPhotos.length
    ? chosenPhotos.map(src=>`<div class="strip-photo"><img src="${src}" alt="Photo strip"></div>`).join('')
    : '<div class="strip-empty">Your little moments will appear here ♡</div>'}<p style="margin:9px 0 0;text-align:center;color:${theme.accent};font:italic 12px Georgia">${theme.title}</p><p style="margin:5px 0 0;text-align:center;color:${theme.accent};font:9px Arial;letter-spacing:2px">MADE WITH LOVE · DiRi</p>`;
  root.querySelectorAll('[data-frame]').forEach(btn=>btn.classList.toggle('active',btn.dataset.frame===selectedFrame));
  const count=root.querySelector('#photo-count');
  if(count) count.textContent=`${chosenPhotos.length}/4 photos`;
  const download=root.querySelector('[data-photo-action="download"]');
  if(download) download.disabled=chosenPhotos.length!==4;
}

export function mountPhotobooth(root, { onBack } = {}) {
  stopStream();
  chosenPhotos=[];
  selectedFrame='rose';
  root.innerHTML=`<main class="photo-shell">
    <div class="game-topbar"><button class="btn btn-outline btn-small" data-photo-action="back">← Back</button><div class="game-title-wrap"><div class="eyebrow">A DIRI ORIGINAL FEATURE</div><h1>DiRi Photobooth ♡</h1></div><span class="muted" style="font-size:11px">A little keepsake</span></div>
    <p class="photo-help" style="margin-top:14px">Ambil empat foto dari kamera atau pilih foto dari galeri. Foto diproses di perangkat ini dan tidak otomatis diunggah ke Firebase.</p>
    <div class="photo-layout">
      <section class="photo-camera-card">
        <div class="camera-stage" id="camera-stage"><div class="camera-placeholder" id="camera-placeholder"><div style="font-size:38px">♡</div><strong>Ready for a little photo?</strong><span>Izinkan akses kamera atau pilih foto dari galeri.</span></div><video id="camera-video" autoplay playsinline muted class="hidden"></video></div>
        <div class="game-controls" style="justify-content:flex-start"><button class="btn btn-primary btn-small" data-photo-action="camera">Open camera</button><button class="btn btn-outline btn-small" data-photo-action="capture" disabled>Take photo</button><label class="btn btn-outline btn-small" for="gallery-input">Choose photos</label><input id="gallery-input" type="file" accept="image/*" multiple hidden></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:15px"><strong style="font-size:12px">Your four shots</strong><span id="photo-count" class="muted" style="font-size:10px">0/4 photos</span></div><div class="photo-slots" id="photo-slots"></div>
      </section>
      <section class="photo-preview-card"><div><div class="eyebrow">CHOOSE YOUR FRAME</div><div class="frame-options"><button class="frame-option active" data-frame="rose">Rose</button><button class="frame-option" data-frame="lilac">Lilac</button><button class="frame-option" data-frame="cream">Vintage cream</button></div><p class="photo-help">Pilih frame untuk mengubah warna photo strip.</p><button class="btn btn-primary btn-full" data-photo-action="download" disabled>Download photo strip ♡</button></div><div class="photo-strip-preview" id="photo-strip-preview"><h3>DiRi Photo Club ♡</h3><div class="strip-empty">Your little moments will appear here ♡</div></div></section>
    </div>
  </main>`;
  const video=root.querySelector('#camera-video');
  const placeholder=root.querySelector('#camera-placeholder');
  const captureBtn=root.querySelector('[data-photo-action="capture"]');

  root.querySelector('[data-photo-action="back"]').addEventListener('click',()=>{stopStream();onBack?.();});
  root.querySelector('[data-photo-action="camera"]').addEventListener('click',async()=>{
    try {
      if(!navigator.mediaDevices?.getUserMedia) throw new Error('Browser tidak mendukung akses kamera. Coba gunakan browser versi terbaru melalui HTTPS.');
      stopStream();
      activeStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
      video.srcObject=activeStream; video.classList.remove('hidden'); placeholder.classList.add('hidden'); captureBtn.disabled=false;
    } catch(error) { alert(error.message || 'Kamera tidak dapat dibuka. Periksa izin kamera browser.'); }
  });
  captureBtn.addEventListener('click',()=>{
    if(!video.videoWidth) return;
    const canvas=document.createElement('canvas');canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d');ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(video,0,0);
    addPhoto(canvas.toDataURL('image/jpeg',.9));updateSlots(root);
  });
  root.querySelector('#gallery-input').addEventListener('change',async event=>{
    const files=[...event.target.files].filter(file=>file.type.startsWith('image/')).slice(0,4);
    for(const file of files){const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});addPhoto(url);}
    updateSlots(root);event.target.value='';
  });
  root.querySelectorAll('[data-frame]').forEach(btn=>btn.addEventListener('click',()=>{selectedFrame=btn.dataset.frame;updateSlots(root);}));
  root.querySelector('[data-photo-action="download"]').addEventListener('click',()=>downloadStrip());
  updateSlots(root);
  return stopStream;
}

async function downloadStrip() {
  if(chosenPhotos.length!==4) return;
  const theme=frameThemes[selectedFrame];
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=2720;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=theme.bg;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=theme.accent;ctx.textAlign='center';ctx.font='bold 48px Georgia';ctx.fillText('DiRi Photo Club ♡',450,86);
  ctx.font='22px Arial';ctx.fillText('OUR LITTLE MOMENTS',450,126);
  const loadImage=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;});
  try {
    for(let i=0;i<4;i++){
      const image=await loadImage(chosenPhotos[i]);const x=95,y=175+i*590,w=710,h=520;
      ctx.fillStyle='#ffffff';ctx.fillRect(x-10,y-10,w+20,h+20);
      const sourceRatio=image.width/image.height,targetRatio=w/h;let sx=0,sy=0,sw=image.width,sh=image.height;
      if(sourceRatio>targetRatio){sw=image.height*targetRatio;sx=(image.width-sw)/2;}else{sh=image.width/targetRatio;sy=(image.height-sh)/2;}
      ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);
      ctx.fillStyle=theme.accent;ctx.font='18px Arial';ctx.textAlign='left';ctx.fillText(`MOMENT ${String(i+1).padStart(2,'0')}`,100,y+h+34);
    }
    ctx.fillStyle=theme.accent;ctx.textAlign='center';ctx.font='italic 28px Georgia';ctx.fillText('same time, different places.',450,2638);
    ctx.font='18px Arial';ctx.fillText('MADE WITH LOVE · DiRi · 2026',450,2676);
    const link=document.createElement('a');link.download='diri-photo-strip.png';link.href=canvas.toDataURL('image/png');link.click();
  } catch { alert('Ada foto yang tidak bisa diproses. Coba pilih gambar lain.'); }
}

export function unmountPhotobooth(){stopStream();}
