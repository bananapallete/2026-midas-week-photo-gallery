(function () {
  "use strict";

  var FOLDER_SVG =
    '<svg viewBox="0 0 171.977 137.6" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
    '<path d="M0 7.99999C0 3.58172 3.58172 0 8 0H50.8078C52.9861 0 55.0702 0.888247 56.5787 2.45959L66.4544 12.7462C67.963 14.3176 70.0471 15.2058 72.2253 15.2058H163.665C168.074 15.2058 171.652 18.7733 171.665 23.1824L171.977 129.577C171.989 134.004 168.404 137.6 163.977 137.6H8C3.58173 137.6 0 134.018 0 129.6V7.99999Z" fill="#121F47"/>' +
    '<path d="M8 0.757812H50.8076C52.7797 0.757812 54.6665 1.56179 56.0322 2.98438L65.9082 13.2705C67.5596 14.9906 69.8411 15.9629 72.2256 15.9629H163.665C167.657 15.9629 170.897 19.1929 170.908 23.1846L171.219 129.579C171.23 133.587 167.985 136.843 163.977 136.843H8C4 136.843 0.757812 133.6 0.757812 129.6V8C0.757812 4 4 0.757812 8 0.757812Z" stroke="#4D8CF2" stroke-opacity="0.3" stroke-width="1.51473"/></svg>';

  var DL_ICON =
    '<svg viewBox="0 0 17.25 19.1667" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M0.958333 12.6542L0.958334 16.1887C0.958334 16.7243 1.16027 17.238 1.51971 17.6168C1.87916 17.9955 2.36667 18.2083 2.875 18.2083H14.375C14.8833 18.2083 15.3708 17.9955 15.7303 17.6168C16.0897 17.238 16.2917 16.7243 16.2917 16.1887V12.6542M8.62607 0.958333V12.4032M4.24512 8.03016L8.62607 12.4032L13.007 8.03016" stroke="#EDF0F8" stroke-width="1.91667" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var app = document.getElementById("app");
  var DATA = null;
  var divIndex = {};        // slug -> division (RPM 사업부)
  var affById = {};         // id -> affiliation
  var state = { aff: null };
  var AFF_KEY = "midas_aff";
  // 회전각: 음↔양 번갈아, 불규칙한 크기 (다이나믹하게 확대)
  var ROT = [-8.5, 5.5, -6, 8, -3.5, 9.5, -5, 7, -9, 4.5, -6.5, 6.8];
  // Y 오프셋: 위↔아래 지그재그, 불규칙한 크기 (px)
  var DY = [46, -38, 68, -22, 32, -60, 50, -16, 72, -44, 36, -66, 42];

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- 방문/다운로드 집계 (Google 시트, 비공개) ---------------- */
  // 아래 URL에 Apps Script 웹앱 주소(/exec)를 넣으면 집계가 켜집니다. 비어있으면 아무 동작 안 함.
  var TRACK_URL = "https://script.google.com/macros/s/AKfycbxSdcDzacxBjWm8CMbhBZtbvXxvd9Dxo1p25KFZj8xprfG9_LAps6HKWd_zgyixzQFvWA/exec";
  var visitorId = (function () {
    try {
      var k = "midas_vid", v = localStorage.getItem(k);
      if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); localStorage.setItem(k, v); }
      return v;
    } catch (e) { return "anon"; }
  })();
  function track(type, meta) {
    if (!TRACK_URL) return;
    var payload = { type: type, vid: visitorId };
    if (meta) { payload.division = meta.division || ""; payload.item = meta.item || ""; }
    var body = JSON.stringify(payload);
    try {
      var blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon && navigator.sendBeacon(TRACK_URL, blob)) return;
    } catch (e) {}
    try {
      fetch(TRACK_URL, { method: "POST", mode: "no-cors", keepalive: true,
        headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: body });
    } catch (e) {}
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- 소속 전환 & 팝업 ---------------- */
  function affAsDivision(aff) {
    return { slug: aff.id, kr: aff.label, en: "", photos: aff.photos };
  }
  function selectAff(id) {
    state.aff = id;
    try { localStorage.setItem(AFF_KEY, id); } catch (e) {}
    hideAffPopup();
    var cur = location.hash.replace(/^#\/?/, "");
    if (cur && divIndex[cur]) location.hash = "#/"; // 사업부 상세에서 나가면 route가 홈 렌더
    else renderHome();
  }
  function showAffPopup() {
    if (document.getElementById("affPopup")) return;
    var ov = el("div", "aff-popup");
    ov.id = "affPopup";
    var box = el("div", "aff-popup__box");
    box.appendChild(el("p", "aff-popup__title", "어떤 사진을 보시겠어요?"));
    box.appendChild(el("p", "aff-popup__sub", "소속을 선택하면 해당 사진만 모아 보여드립니다"));
    var grid = el("div", "aff-popup__grid");
    DATA.affiliations.forEach(function (a) {
      var b = el("button", "aff-popup__btn", esc(a.label));
      b.addEventListener("click", function () { selectAff(a.id); });
      grid.appendChild(b);
    });
    box.appendChild(grid);
    ov.appendChild(box);
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
  }
  function hideAffPopup() {
    var p = document.getElementById("affPopup");
    if (p) p.remove();
    if (lb.hidden) document.body.style.overflow = "";
  }

  /* ---------------- Home ---------------- */
  function renderHome() {
    app.innerHTML = "";

    // Hero + marquee
    var hero = el("section", "hero");
    var marquee = el("div", "marquee");
    var track = el("div", "marquee__track");
    var pol = shuffle(DATA.polaroids);
    var seq = pol.concat(pol);
    seq.forEach(function (src, i) {
      var idx = i % pol.length; // 두 복사본이 동일해야 무한 루프가 이어짐
      var p = el("div", "polaroid");
      p.style.setProperty("--rot", ROT[idx % ROT.length] + "deg");
      p.style.setProperty("--dy", DY[idx % DY.length] + "px");
      var img = new Image();
      img.loading = "lazy";
      img.src = src;
      img.alt = "2026 MIDAS WEEK";
      p.appendChild(img);
      track.appendChild(p);
    });
    marquee.appendChild(track);
    hero.appendChild(marquee);
    app.appendChild(hero);

    var wrap = el("div", "home-sections");
    var container = el("div", "container");

    // 소속 탭 (전환)
    var tabs = el("div", "aff-tabs");
    DATA.affiliations.forEach(function (a) {
      var b = el("button", "aff-tab" + (a.id === state.aff ? " is-active" : ""), esc(a.label));
      b.addEventListener("click", function () { selectAff(a.id); });
      tabs.appendChild(b);
    });
    container.appendChild(tabs);

    var aff = affById[state.aff] || DATA.affiliations[0];
    if (aff.type === "folders") renderFolderGroups(container, aff.groups);
    else renderPhotoSection(container, affAsDivision(aff));

    wrap.appendChild(container);
    app.appendChild(wrap);
    window.scrollTo(0, 0);
  }

  function renderFolderGroups(container, groups) {
    groups.forEach(function (g) {
      if (!g.divisions.length) return;
      var sec = el("section", "section");
      var head = el("div", "section__head");
      head.appendChild(el("h2", "section__kr", esc(g.kr)));
      head.appendChild(el("p", "section__en", esc(g.en)));
      sec.appendChild(head);
      var grid = el("div", "folder-grid");
      g.divisions.forEach(function (d) {
        if (!d.photos.length) return;
        var btn = el("button", "folder");
        btn.setAttribute("aria-label", d.kr);
        btn.innerHTML = FOLDER_SVG +
          '<span class="folder__label"><span class="folder__kr">' + esc(d.kr) +
          '</span><span class="folder__en">' + esc(d.en) + "</span></span>";
        btn.addEventListener("click", function () { location.hash = "#/" + d.slug; });
        grid.appendChild(btn);
      });
      sec.appendChild(grid);
      container.appendChild(sec);
    });
  }

  /* ---------------- Division (RPM 사업부 상세) ---------------- */
  function renderDivision(slug) {
    var d = divIndex[slug];
    if (!d) { location.hash = "#/"; return; }
    app.innerHTML = "";
    var section = el("section", "division");
    var container = el("div", "container");
    var back = el("button", "back", "&#8249;&nbsp; 목록으로");
    back.addEventListener("click", function () { location.hash = "#/"; });
    container.appendChild(back);
    renderPhotoSection(container, d);
    section.appendChild(container);
    app.appendChild(section);
    window.scrollTo(0, 0);
  }

  /* 사진 그리드 + 다운로드(선택/전체) + 선택모드 — 사업부 상세와 flat 소속 공용 */
  function renderPhotoSection(container, d) {
    var head = el("div", "division__head");
    head.appendChild(el("h1", "division__kr", esc(d.kr)));
    if (d.en) head.appendChild(el("p", "division__en", esc(d.en)));

    var dlWrap = el("div", "dl-control");
    var dlBtn = el("button", "dl-btn", "다운로드 " + DL_ICON);
    var menu = el("div", "dl-menu");
    var optSelect = el("button", "dl-menu__item", "선택 다운로드");
    var optAll = el("button", "dl-menu__item", "전체 다운로드");
    menu.appendChild(optSelect); menu.appendChild(optAll);
    dlWrap.appendChild(dlBtn); dlWrap.appendChild(menu);
    head.appendChild(dlWrap);
    container.appendChild(head);

    var selBar = el("div", "select-bar");
    selBar.appendChild(el("span", "select-bar__info", "다운로드할 사진을 선택하세요"));
    var selDl = el("button", "dl-btn", "선택 다운로드 (0)");
    var selCancel = el("button", "select-bar__cancel", "취소");
    selBar.appendChild(selDl); selBar.appendChild(selCancel);
    container.appendChild(selBar);

    var grid = el("div", "card-grid");
    var cards = [];
    var selected = {};
    var selectMode = false;

    d.photos.forEach(function (ph, i) {
      var card = el("div", "card");
      var frame = el("div", "card__frame");
      var img = new Image();
      img.loading = "lazy";
      img.src = ph.thumb;
      img.alt = d.kr + " " + (i + 1);
      frame.appendChild(img);
      frame.appendChild(el("span", "card__check"));
      frame.addEventListener("click", function () {
        if (selectMode) toggle(i); else openLightbox(d, i);
      });
      card.appendChild(frame);
      grid.appendChild(card);
      cards.push(card);
    });
    container.appendChild(grid);

    function updateCount() {
      var n = Object.keys(selected).length;
      selDl.textContent = "선택 다운로드 (" + n + ")";
      selDl.disabled = n === 0;
    }
    function toggle(i) {
      if (selected[i]) { delete selected[i]; cards[i].classList.remove("is-selected"); }
      else { selected[i] = true; cards[i].classList.add("is-selected"); }
      updateCount();
    }
    function enterSelect() {
      selectMode = true;
      menu.classList.remove("open");
      dlWrap.style.display = "none";
      selBar.classList.add("show");
      grid.classList.add("card-grid--select");
      updateCount();
    }
    function exitSelect() {
      selectMode = false;
      selected = {};
      cards.forEach(function (c) { c.classList.remove("is-selected"); });
      selBar.classList.remove("show");
      dlWrap.style.display = "";
      grid.classList.remove("card-grid--select");
    }

    dlBtn.addEventListener("click", function (e) { e.stopPropagation(); menu.classList.toggle("open"); });
    menu.addEventListener("click", function (e) { e.stopPropagation(); });
    optAll.addEventListener("click", function () { menu.classList.remove("open"); downloadAll(d, dlBtn); });
    optSelect.addEventListener("click", enterSelect);
    selCancel.addEventListener("click", exitSelect);
    selDl.addEventListener("click", function () {
      var idxs = Object.keys(selected).map(Number).sort(function (a, b) { return a - b; });
      downloadList(d, idxs, selDl);
    });
  }

  /* ---------------- Download ---------------- */
  function download(url, name, meta) {
    track("download", meta);
    fetch(url)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var a = document.createElement("a");
        var obj = URL.createObjectURL(blob);
        a.href = obj;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(obj); }, 4000);
      })
      .catch(function () {
        // fallback: open in new tab
        window.open(url, "_blank");
      });
  }

  function downloadAll(d, btn) {
    var idxs = d.photos.map(function (_, i) { return i; });
    downloadList(d, idxs, btn);
  }
  function downloadList(d, idxs, btn) {
    if (!idxs.length) return;
    var label = btn.innerHTML;
    var total = idxs.length;
    btn.disabled = true;
    idxs.forEach(function (i, k) {
      setTimeout(function () {
        download(d.photos[i].full, d.slug + "-" + (i + 1) + ".jpg", { division: d.slug, item: i + 1 });
        btn.textContent = "다운로드 중… " + (k + 1) + "/" + total;
        if (k === total - 1) {
          setTimeout(function () { btn.innerHTML = label; btn.disabled = false; }, 1200);
        }
      }, k * 700);
    });
  }

  /* ---------------- Lightbox ---------------- */
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector(".lightbox__img");
  var lbDl = lb.querySelector(".lightbox__download");
  var lbStrip = lb.querySelector(".lightbox__strip");
  var lbState = { d: null, i: 0 };
  var lbDir = "open";

  function openLightbox(d, i) {
    lbState.d = d; lbState.i = i;
    lbDir = "open";
    buildStrip();
    showLb();
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function buildStrip() {
    var d = lbState.d;
    lbStrip.innerHTML = "";
    d.photos.forEach(function (ph, k) {
      var t = new Image();
      t.className = "lightbox__thumb";
      t.loading = "lazy";
      t.src = ph.thumb;
      t.alt = d.kr + " " + (k + 1);
      t.addEventListener("click", function () { lbDir = "open"; lbState.i = k; showLb(); });
      lbStrip.appendChild(t);
    });
  }
  function animateImg() {
    lbImg.classList.remove("lb-open", "lb-next", "lb-prev");
    void lbImg.offsetWidth; // reflow to restart animation
    lbImg.classList.add(lbDir === "next" ? "lb-next" : lbDir === "prev" ? "lb-prev" : "lb-open");
  }
  function syncStripWidth() {
    var w = lbImg.getBoundingClientRect().width;
    if (w) lbStrip.style.width = Math.round(w) + "px";
  }
  lbImg.addEventListener("load", syncStripWidth);
  window.addEventListener("resize", function () { if (!lb.hidden) syncStripWidth(); });

  function showLb() {
    var d = lbState.d, ph = d.photos[lbState.i];
    lbImg.src = ph.full;
    lbImg.alt = d.kr + " " + (lbState.i + 1);
    animateImg();
    syncStripWidth();
    lbDl.onclick = function (e) {
      e.preventDefault();
      download(ph.full, d.slug + "-" + (lbState.i + 1) + ".jpg", { division: d.slug, item: lbState.i + 1 });
    };
    var thumbs = lbStrip.children;
    for (var k = 0; k < thumbs.length; k++) {
      var active = k === lbState.i;
      thumbs[k].classList.toggle("is-active", active);
      if (active) thumbs[k].scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }
  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = "";
  }
  function step(n) {
    var len = lbState.d.photos.length;
    lbDir = n > 0 ? "next" : "prev";
    lbState.i = (lbState.i + n + len) % len;
    showLb();
  }
  lb.querySelector(".lightbox__close").addEventListener("click", closeLb);
  lb.querySelector(".lightbox__prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".lightbox__next").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  /* ---------------- Smooth momentum scroll (부드러운 감속) ---------------- */
  (function smoothScroll() {
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return; // 모바일/접근성 환경은 네이티브 스크롤 유지

    var target = window.scrollY;
    var active = false;
    var EASE = 0.14;

    function maxScroll() {
      return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    }
    function loop() {
      var cur = window.scrollY;
      var next = cur + (target - cur) * EASE;
      if (Math.abs(target - cur) < 0.5) {
        window.scrollTo(0, target);
        active = false;
        return;
      }
      window.scrollTo(0, next);
      requestAnimationFrame(loop);
    }
    window.addEventListener("wheel", function (e) {
      if (!lb.hidden) return;          // 라이트박스 열려있으면 네이티브(필름스트립 등)
      if (e.ctrlKey) return;           // 확대/축소 제스처 제외
      e.preventDefault();
      var delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      target = Math.min(Math.max(0, target + delta), maxScroll());
      if (!active) { active = true; target = Math.min(Math.max(window.scrollY + delta, 0), maxScroll()); requestAnimationFrame(loop); }
    }, { passive: false });
    // 다른 방식(키보드/앵커/스크롤바)으로 이동 시 target 동기화
    window.addEventListener("scroll", function () { if (!active) target = window.scrollY; });
  })();

  /* ---------------- Router ---------------- */
  function route() {
    if (lb && !lb.hidden) closeLb();
    var h = location.hash.replace(/^#\/?/, "");
    if (h && divIndex[h]) renderDivision(h);
    else renderHome();
  }

  // 열린 다운로드 메뉴는 바깥 클릭 시 닫기 (한 번만 등록)
  document.addEventListener("click", function () {
    var m = document.querySelector(".dl-menu.open");
    if (m) m.classList.remove("open");
  });

  /* ---------------- Init ---------------- */
  track("visit");
  fetch("manifest.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      DATA = data;
      data.affiliations.forEach(function (a) {
        affById[a.id] = a;
        if (a.type === "folders") {
          a.groups.forEach(function (g) {
            g.divisions.forEach(function (d) {
              divIndex[d.slug] = { slug: d.slug, kr: d.kr, en: d.en, photos: d.photos, groupKr: g.kr };
            });
          });
        }
      });
      var saved = null;
      try { saved = localStorage.getItem(AFF_KEY); } catch (e) {}
      state.aff = (saved && affById[saved]) ? saved : data.affiliations[0].id;
      window.addEventListener("hashchange", route);
      route();
      showAffPopup(); // 접속할 때마다 소속 선택 팝업
    })
    .catch(function (err) {
      app.innerHTML = '<div class="container" style="padding:60px 20px;color:#9eb8eb">데이터를 불러오지 못했습니다. (' + esc(err.message) + ")</div>";
    });
})();
