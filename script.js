/* =====================================================
       KONFIGURASI PROFIL (SILAKAN SESUAIKAN SEBELUM PUBLISH)
       ===================================================== */
    const PORTFOLIO = {
      name: "Rahmad Rizky Fauzi",
      email: "rahmadrizky22@gmail.com",
      linkedin: "", // Tambahkan URL profil LinkedIn jika ingin ditampilkan.
      github: "https://github.com/Kyri21",
      instagram: "" // Opsional.
    };

    /* Studi kasus ditulis berdasarkan dokumen konten portofolio. */
    const PROJECT_ORDER = ["proj-sdi", "proj-bekantan", "proj-powerbi", "proj-excel"];
    const PROJECT_DETAILS = {
      "proj-sdi": {
        category: "01 / PROYEK PEKERJAAN NYATA · DIGITAL OPERATIONS",
        type: "Pengalaman kerja — Biro SDI UMKT",
        title: "Pengembangan Website dan Direktori Pegawai SDI UMKT",
        challenge: "Informasi dan data kepegawaian perlu disajikan secara lebih terstruktur dan mudah diakses melalui website unit.",
        solution: "Mengelola dan mengoptimalkan halaman website SDI, mengintegrasikan Google Sheets sebagai sumber data menggunakan JavaScript, mengolah serta menampilkan data pegawai, dan mengembangkan fitur pencarian serta filter untuk direktori tenaga kependidikan.",
        output: "Penyajian informasi dan direktori pegawai yang lebih terstruktur melalui website. Kontribusi juga mencakup penyusunan infografis statistik dosen dan tenaga kependidikan.",
        deliverables: ["Pengelolaan dan pembaruan halaman website SDI", "Integrasi Google Sheets → JavaScript → website", "Direktori tenaga kependidikan dengan pencarian dan filter", "Infografis statistik dosen dan tenaga kependidikan"],
        tags: ["Google Sheets", "JavaScript", "Website Administration", "Search & Filter", "Infografis"],
        media: [
          { src: "assets/images/projects/sdi-website-cover.jpg", alt: "Tampilan halaman website SDI UMKT", label: "Halaman Website SDI", caption: "Tangkapan layar halaman website SDI." },
          { src: "assets/images/projects/sdi-direktori-pegawai.jpg", alt: "Tampilan direktori tenaga kependidikan SDI UMKT", label: "Direktori Pegawai", caption: "Tampilan direktori dan fitur pencarian/filter. Samarkan data personal sebelum diunggah." },
          { src: "assets/images/projects/sdi-infografis-statistik.jpg", alt: "Infografis statistik dosen dan tenaga kependidikan", label: "Infografis Statistik", caption: "Contoh infografis statistik kepegawaian." },
          { src: "assets/images/projects/sdi-alur-integrasi.jpg", alt: "Diagram alur integrasi Google Sheets, JavaScript, dan website", label: "Alur Integrasi", caption: "Diagram alur sumber data hingga tampil pada website." }
        ]
      },
      "proj-bekantan": {
        category: "02 / PENGALAMAN KERJA NYATA · DATA & REPORTING",
        type: "Pengalaman kerja paruh waktu — Bekantan Outdoor",
        title: "Dashboard dan Laporan Operasional Bekantan Outdoor",
        challenge: "Data transaksi penyewaan perlu direkap agar aktivitas operasional, pendapatan, dan kategori barang dapat dipantau.",
        solution: "Mengelola data transaksi, pendapatan, pelanggan, dan kategori barang menggunakan Google Sheets, kemudian menyusun laporan operasional serta ringkasan data penyewaan.",
        output: "Data operasional menjadi lebih terstruktur dan dapat digunakan untuk melihat tren transaksi serta penyewaan.",
        deliverables: ["Rekap data transaksi penyewaan", "Ringkasan pendapatan dan pelanggan", "Pengelompokan kategori barang", "Laporan operasional dan tren penyewaan"],
        tags: ["Google Sheets", "Operational Reporting", "Transaction Data", "Data Summary"],
        media: [
          { src: "assets/images/projects/bekantan-dashboard-operasional.jpg", alt: "Dashboard operasional Bekantan Outdoor", label: "Dashboard Operasional", caption: "Tampilan dashboard/laporan. Samarkan data pelanggan dan informasi internal." },
          { src: "assets/images/projects/bekantan-rekap-transaksi.jpg", alt: "Rekap transaksi penyewaan Bekantan Outdoor", label: "Rekap Transaksi", caption: "Contoh ringkasan transaksi yang telah dianonimkan." }
        ]
      },
      "proj-powerbi": {
        category: "03 / PROYEK MANDIRI · DATA SIMULASI",
        type: "Proyek mandiri — dataset simulasi",
        title: "Dashboard Analisis Penjualan dengan Power BI",
        challenge: "Dataset penjualan simulasi digunakan sebagai bahan latihan untuk menyajikan indikator dan tren dalam bentuk visual.",
        solution: "Menyiapkan dan mengolah dataset simulasi, membuat indikator serta visualisasi penjualan, dan menyusun dashboard untuk melihat tren serta kontribusi produk atau kategori.",
        output: "Dashboard analisis penjualan berbasis data simulasi. Hasil visualisasi merupakan latihan/eksplorasi mandiri, bukan laporan data perusahaan.",
        deliverables: ["Dataset penjualan simulasi yang telah disiapkan", "Indikator dan visualisasi penjualan", "Dashboard tren penjualan", "Visual kontribusi produk/kategori"],
        tags: ["Power BI", "Data Preparation", "Sales Analytics", "Data Visualization"],
        media: [
          { src: "assets/images/projects/powerbi-dashboard-penjualan.jpg", alt: "Dashboard penjualan Power BI dari data simulasi", label: "Dashboard Utama", caption: "Dashboard Power BI dengan dataset simulasi." },
          { src: "assets/images/projects/powerbi-visualisasi-tren.jpg", alt: "Visualisasi tren dan kategori penjualan di Power BI", label: "Visualisasi Pendukung", caption: "Contoh visual tren atau kontribusi produk/kategori." }
        ]
      },
      "proj-excel": {
        category: "04 / PROYEK MANDIRI · DATA SIMULASI",
        type: "Proyek mandiri — dataset simulasi",
        title: "Analisis Data Penjualan dengan Microsoft Excel",
        challenge: "Dataset penjualan simulasi perlu diolah menjadi ringkasan dan visualisasi yang mudah dibaca.",
        solution: "Menyusun dan mengolah data penjualan, membuat ringkasan serta visualisasi, lalu menyajikan informasi berdasarkan periode dan kategori.",
        output: "Laporan analisis penjualan menggunakan Microsoft Excel berbasis data simulasi.",
        deliverables: ["Pengolahan dataset penjualan simulasi", "Ringkasan data berdasarkan periode", "Ringkasan berdasarkan kategori", "Visualisasi dan laporan penjualan"],
        tags: ["Microsoft Excel", "Data Processing", "Sales Reporting", "Data Visualization"],
        media: [
          { src: "assets/images/projects/excel-analisis-penjualan.jpg", alt: "Laporan analisis penjualan di Microsoft Excel", label: "Laporan Analisis", caption: "Laporan analisis penjualan menggunakan dataset simulasi." },
          { src: "assets/images/projects/excel-ringkasan-kategori.jpg", alt: "Ringkasan penjualan berdasarkan kategori di Excel", label: "Ringkasan Kategori", caption: "Contoh ringkasan dan visualisasi berdasarkan kategori/periode." }
        ]
      }
    };

    const $ = (selector, root = document) => root.querySelector(selector);
    const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

    // 1. Live Samarinda Clock (WITA / UTC+8)
    const localTimeEl = $("#localTime");
    function updateSamarindaClock() {
      if (!localTimeEl) return;
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat("id-ID", {
          timeZone: "Asia/Makassar",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        });
        localTimeEl.textContent = `${formatter.format(now)} WITA`;
      } catch (e) {
        localTimeEl.textContent = "WITA (UTC+8)";
      }
    }
    updateSamarindaClock();
    setInterval(updateSamarindaClock, 30000);

    // 2. Mobile Navigation
    const menuToggle = $("#menuToggle");
    const mainNav = $("#mainNav");
    menuToggle?.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Buka menu" : "Tutup menu");
      mainNav.classList.toggle("open", !isOpen);
    });
    $$("#mainNav a, #mainNav button").forEach(link =>
      link.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle?.setAttribute("aria-expanded", "false");
        menuToggle?.setAttribute("aria-label", "Buka menu");
      })
    );
    window.addEventListener("resize", () => {
      if (window.innerWidth > 880 && mainNav?.classList.contains("open")) {
        mainNav.classList.remove("open");
        menuToggle?.setAttribute("aria-expanded", "false");
      }
    });

    // 3. Theme Switch (Dark / Light)
    const themeToggle = $("#themeToggle");
    const savedTheme = localStorage.getItem("rahmad-portfolio-theme");
    if (savedTheme === "light") document.body.classList.add("light-theme");
    themeToggle?.addEventListener("click", () => {
      document.body.classList.toggle("light-theme");
      const isLight = document.body.classList.contains("light-theme");
      localStorage.setItem("rahmad-portfolio-theme", isLight ? "light" : "dark");
      showToast(isLight ? "Tema Terang diaktifkan." : "Tema Gelap diaktifkan.");
    });

    // 4. Scroll Progress, Sticky Header Shadow & ScrollSpy Navigation
    const progressBar = $("#scrollProgress");
    const headerWrap = $("#headerWrap");
    const floatingTopBtn = $("#floatingTopBtn");
    const sections = $$("main section[id]");
    const navLinks = $$(".main-nav a[data-nav]");

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
      if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

      if (headerWrap) {
        headerWrap.classList.toggle("scrolled", scrollY > 20);
      }
      if (floatingTopBtn) {
        floatingTopBtn.classList.toggle("visible", scrollY > 450);
      }

      // ScrollSpy
      let currentSection = "";
      sections.forEach(sec => {
        const top = sec.offsetTop - 160;
        const height = sec.offsetHeight;
        if (scrollY >= top && scrollY < top + height) {
          currentSection = sec.getAttribute("id");
        }
      });
      navLinks.forEach(link => {
        link.classList.toggle("active-link", link.dataset.nav === currentSection);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    floatingTopBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 5. Interactive Hero Mouse Parallax (Preserves CSS Rotation) & Card Spotlight
    const heroArt = $("#heroArt");
    const parallaxLayers = $$("[data-depth]", heroArt);
    window.addEventListener("mousemove", e => {
      if (window.innerWidth < 960 || !heroArt) return;
      const x = (window.innerWidth / 2 - e.clientX);
      const y = (window.innerHeight / 2 - e.clientY);
      parallaxLayers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth || "0.04");
        layer.style.setProperty("--px", `${(x * depth).toFixed(1)}px`);
        layer.style.setProperty("--py", `${(y * depth).toFixed(1)}px`);
      });
    });

    $$(".project-card").forEach(card => {
      card.addEventListener("mousemove", e => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    });

    $("#artCoreTrigger")?.addEventListener("click", () => {
      $("#work")?.scrollIntoView({ behavior: "smooth" });
    });

    // 6. Foto opsional: placeholder tetap tampil sampai file foto tersedia.
    // 7. Scroll Reveal Animations & Project Filters
    const revealItems = $$(".reveal");
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });
      revealItems.forEach(item => observer.observe(item));
    } else {
      revealItems.forEach(item => item.classList.add("is-visible"));
    }

    // Project Filters
    const filterButtons = $$(".filter-btn");
    const projectCards = $$(".project-card");
    filterButtons.forEach(button => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        filterButtons.forEach(item => {
          const active = item === button;
          item.classList.toggle("active", active);
          item.setAttribute("aria-pressed", String(active));
        });
        projectCards.forEach(card => {
          const visible = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-hidden", !visible);
        });
      });
    });

    // 8. Modal Management (Case Study, Quick Message, Command Palette)
    const projectModal = $("#projectModal");
    const messageModal = $("#messageModal");
    const cmdModal = $("#cmdModal");
    let currentProjectId = "proj-data";

    function openModal(modalEl) {
      if (!modalEl) return;
      closeAllModals();
      modalEl.classList.add("is-open");
      modalEl.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function closeAllModals() {
      $$(".modal-backdrop.is-open").forEach(m => {
        m.classList.remove("is-open");
        m.setAttribute("aria-hidden", "true");
      });
      document.body.style.overflow = "";
    }

    $$("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeAllModals));
    $$(".modal-backdrop").forEach(backdrop => {
      backdrop.addEventListener("click", e => {
        if (e.target === backdrop) closeAllModals();
      });
    });
    window.addEventListener("keydown", e => {
      if (e.key === "Escape") closeAllModals();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openModal(cmdModal);
      }
    });

    function initOptionalImages(root = document) {
      $$('img[data-optional-image]', root).forEach(img => {
        const slot = img.closest('.image-slot, .profile-photo-card');
        const markLoaded = () => slot?.classList.add('has-image');
        const markMissing = () => slot?.classList.remove('has-image');
        img.addEventListener('load', markLoaded, { once: true });
        img.addEventListener('error', markMissing, { once: true });
        if (img.complete && img.naturalWidth > 0) markLoaded();
        else if (img.complete && img.naturalWidth === 0) markMissing();
      });
    }
    initOptionalImages();

    function populateProjectModal(id) {
      const data = PROJECT_DETAILS[id];
      if (!data) return;
      currentProjectId = id;

      $('#modalCategory').textContent = data.category;
      $('#modalType').textContent = data.type || '';
      $('#modalTitle').textContent = data.title;
      $('#modalChallenge').textContent = data.challenge;
      $('#modalSolution').textContent = data.solution;
      $('#modalOutput').textContent = data.output;

      const metricsEl = $('#modalMetrics');
      if (metricsEl) {
        metricsEl.innerHTML = '';
        metricsEl.hidden = !data.metrics || data.metrics.length === 0;
      }

      $('#modalDeliverables').innerHTML = (data.deliverables || [])
        .map(d => `<div><b>✓</b> <span>${d}</span></div>`)
        .join('');
      $('#modalTags').innerHTML = (data.tags || []).map(t => `<span>${t}</span>`).join('');

      const mediaEl = $('#modalMedia');
      if (mediaEl) {
        mediaEl.innerHTML = (data.media || []).map((item, index) => `
          <figure class="modal-media-item">
            <div class="image-slot modal-image-slot">
              <img class="optional-image" data-optional-image src="${item.src}" alt="${item.alt}" loading="lazy">
              <div class="image-placeholder"><span class="placeholder-mark">＋</span><strong>${item.label}</strong><small>${item.src}</small></div>
            </div>
            <figcaption>${item.caption}</figcaption>
          </figure>
        `).join('');
        initOptionalImages(mediaEl);
      }
    }

    projectCards.forEach(card => {
      const triggerOpen = () => {
        populateProjectModal(card.dataset.projectId);
        openModal(projectModal);
      };

      card.addEventListener("click", triggerOpen);
      card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerOpen();
        }
      });
    });

    $("#prevProjBtn")?.addEventListener("click", () => {
      const idx = PROJECT_ORDER.indexOf(currentProjectId);
      const prevIdx = (idx - 1 + PROJECT_ORDER.length) % PROJECT_ORDER.length;
      populateProjectModal(PROJECT_ORDER[prevIdx]);
    });
    $("#nextProjBtn")?.addEventListener("click", () => {
      const idx = PROJECT_ORDER.indexOf(currentProjectId);
      const nextIdx = (idx + 1) % PROJECT_ORDER.length;
      populateProjectModal(PROJECT_ORDER[nextIdx]);
    });

    // Command Palette & Quick Message Triggers
    $("#openCmdBtn")?.addEventListener("click", () => openModal(cmdModal));
    $("#openQuickMsgBtn")?.addEventListener("click", () => openModal(messageModal));
    $("#heroQuickContact")?.addEventListener("click", () => openModal(messageModal));

    $$(".cmd-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.cmd;
        closeAllModals();
        if (action === "msg") openModal(messageModal);
        if (action === "copy-email") copyTextToClipboard(targetEmail, `Alamat email (${targetEmail}) berhasil disalin!`);
        if (action === "projects") $("#work")?.scrollIntoView({ behavior: "smooth" });
        if (action === "experience") $("#experience")?.scrollIntoView({ behavior: "smooth" });
        if (action === "education") $("#education")?.scrollIntoView({ behavior: "smooth" });
        if (action === "theme") themeToggle?.click();
      });
    });

    // 9. Toast Helper & Clipboard Copy Fallback
    const toast = $("#toast");
    let toastTimer;
    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2800);
    }

    function copyTextToClipboard(text, successMessage) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => showToast(successMessage))
          .catch(() => fallbackCopy(text, successMessage));
      } else {
        fallbackCopy(text, successMessage);
      }
    }

    function fallbackCopy(text, successMessage) {
      const tempInput = document.createElement("textarea");
      tempInput.value = text;
      tempInput.style.position = "fixed";
      tempInput.style.opacity = "0";
      document.body.appendChild(tempInput);
      tempInput.select();
      try {
        document.execCommand("copy");
        showToast(successMessage);
      } catch (err) {
        showToast("Berhasil disalin ke clipboard!");
      }
      document.body.removeChild(tempInput);
    }

    // 10. Contact & Quick Message Form Logic
    const copyEmailBtn = $("#copyEmail");
    const contactHint = $("#contactHint");
    const targetEmail = PORTFOLIO.email.trim() || "rahmadrizky22@gmail.com";

    if (contactHint) {
      contactHint.innerHTML = `Email aktif: <code>${targetEmail}</code> · Siap berdiskusi untuk kolaborasi maupun peluang karier.`;
    }

    copyEmailBtn?.addEventListener("click", () => {
      copyTextToClipboard(targetEmail, `Alamat email (${targetEmail}) berhasil disalin!`);
    });

    const quickMessageForm = $("#quickMessageForm");
    quickMessageForm?.addEventListener("submit", e => {
      e.preventDefault();
      const name = $("#senderName").value.trim();
      const subject = $("#senderSubject").value;
      const msg = $("#senderMessage").value.trim();
      const fullSubject = encodeURIComponent(`[Portofolio Web] ${subject} — ${name}`);
      const fullBody = encodeURIComponent(`Halo Rahmad,\n\nSaya ${name}.\n\n${msg}\n\nSalam,\n${name}`);
      window.location.href = `mailto:${targetEmail}?subject=${fullSubject}&body=${fullBody}`;
      closeAllModals();
      showToast("Membuka aplikasi email kamu...");
    });

    $("#copyFormattedMsg")?.addEventListener("click", () => {
      const name = $("#senderName").value.trim() || "[Nama Anda]";
      const subject = $("#senderSubject").value;
      const msg = $("#senderMessage").value.trim() || "[Pesan Anda]";
      const formatted = `Kepada: ${targetEmail}\nSubjek: ${subject} — ${name}\n\nHalo Rahmad,\n${msg}`;
      copyTextToClipboard(formatted, "Format pesan berhasil disalin ke clipboard!");
    });

    // 11. Render Social Links
    const contactSocials = $("#contactSocials");
    if (contactSocials) {
      contactSocials.innerHTML = "";
      [
        ["LinkedIn", PORTFOLIO.linkedin],
        ["GitHub", PORTFOLIO.github],
        ["Instagram", PORTFOLIO.instagram],
        ["Email Langsung", `mailto:${targetEmail}`]
      ].forEach(([label, url]) => {
        if (!url || !url.trim()) return;
        const link = document.createElement("a");
        link.href = url.trim();
        link.textContent = `${label} ↗`;
        if (!url.startsWith("mailto:")) {
          link.target = "_blank";
          link.rel = "noopener noreferrer";
        }
        contactSocials.appendChild(link);
      });
    }

    // 12. Current Year in Footer
    const yearNow = $("#yearNow");
    if (yearNow) yearNow.textContent = new Date().getFullYear();
