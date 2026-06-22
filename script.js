const HAKODATE_STATION = [41.77372, 140.72644];

const statusConfig = {
  "未対応": {
    markerClass: "status-open",
    tagClass: "status-tag-open"
  },
  "対応中": {
    markerClass: "status-progress",
    tagClass: "status-tag-progress"
  },
  "解決済み": {
    markerClass: "status-resolved",
    tagClass: "status-tag-resolved"
  }
};

const issues = [
  {
    id: 1,
    title: "横断歩道の待ち時間が長い",
    description: "函館駅前の横断歩道で歩行者の待ち時間が長く、冬場や観光客の移動時に負担が大きいです。",
    category: "交通",
    status: "未対応",
    empathy: 18,
    comments: [
      "冬場は待っている間も寒く、もう少し短くなると助かります。",
      "観光客が多い時間帯は歩道に人がたまりやすいです。",
      "子ども連れだと渡るタイミングが分かりにくいです。"
    ],
    lat: 41.77372,
    lng: 140.72644
  },
  {
    id: 2,
    title: "夜間の街灯が少ない",
    description: "五稜郭公園付近の一部歩道で夜間の見通しが悪く、帰宅時に不安を感じます。",
    category: "防犯",
    status: "対応中",
    empathy: 12,
    comments: [
      "夜に通ると足元が見えにくい場所があります。",
      "公園から駐車場までの道がもう少し明るいと安心です。"
    ],
    lat: 41.79689,
    lng: 140.75676
  },
  {
    id: 3,
    title: "観光客向け案内表示が少ない",
    description: "ベイエリアで主要スポットへの案内が分かりにくく、初めて訪れる人が迷いやすいです。",
    category: "観光",
    status: "未対応",
    empathy: 9,
    comments: [
      "初めて来た友人が赤レンガ方面で少し迷っていました。",
      "英語表記の案内も増えると便利だと思います。"
    ],
    lat: 41.76825,
    lng: 140.71664
  },
  {
    id: 4,
    title: "歩道が狭い",
    description: "湯の川温泉付近で歩道が狭い場所があり、ベビーカーや高齢者の通行に余裕がありません。",
    category: "道路",
    status: "解決済み",
    empathy: 24,
    comments: [
      "以前より歩きやすくなりました。",
      "段差が減ってベビーカーでも通りやすいです。"
    ],
    lat: 41.78078,
    lng: 140.78845
  },
  {
    id: 5,
    title: "坂道の安全対策が必要",
    description: "元町エリアの坂道で冬季に滑りやすい箇所があり、手すりや注意表示の追加があると安心です。",
    category: "高齢者",
    status: "対応中",
    empathy: 15,
    comments: [
      "坂の途中に休める場所があるとさらに助かります。",
      "冬は特に滑りやすいので注意表示があると安心です。"
    ],
    lat: 41.76355,
    lng: 140.71174
  }
];

let nextIssueId = issues.length + 1;
let selectedLatLng = null;
const markersById = new Map();
const commentIndexesById = new Map();

const map = L.map("map", {
  zoomControl: true
}).setView(HAKODATE_STATION, 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const issueForm = document.querySelector("#issue-form");
const closeFormButton = document.querySelector("#close-form");
const selectedPoint = document.querySelector("#selected-point");
const issueList = document.querySelector("#issue-list");
const issueCount = document.querySelector("#issue-count");

function refreshMapSize() {
  requestAnimationFrame(() => {
    map.invalidateSize();
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };
    return entities[character];
  });
}

function getStatusClasses(status) {
  return statusConfig[status] || statusConfig["未対応"];
}

function createIssueIcon(status) {
  const classes = getStatusClasses(status);

  return L.divIcon({
    className: "custom-marker",
    html: `<span class="marker-pin ${classes.markerClass}" aria-hidden="true"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

function createPopup(issue) {
  const classes = getStatusClasses(issue.status);
  const empathy = Number(issue.empathy) || 0;
  const comments = getComments(issue);
  const latestComment = comments[comments.length - 1];

  return `
    <article>
      <h3 class="popup-title">${escapeHtml(issue.title)}</h3>
      <p class="popup-description">${escapeHtml(issue.description)}</p>
      <div class="popup-meta">
        <span class="tag">${escapeHtml(issue.category)}</span>
        <span class="tag ${classes.tagClass}">${escapeHtml(issue.status)}</span>
        <span class="tag empathy-tag">共感 ${empathy}</span>
      </div>
      ${latestComment ? `
        <div class="popup-comment">
          <span>最新の声</span>
          <p>${escapeHtml(latestComment)}</p>
        </div>
      ` : ""}
    </article>
  `;
}

function addMarker(issue) {
  const marker = L.marker([issue.lat, issue.lng], {
    icon: createIssueIcon(issue.status),
    title: issue.title
  }).addTo(map);

  marker.bindPopup(createPopup(issue));
  markersById.set(issue.id, marker);
}

function renderMarkers() {
  markersById.forEach((marker) => marker.remove());
  markersById.clear();
  issues.forEach(addMarker);
}

function renderIssueList() {
  issueCount.textContent = `${issues.length}件`;

  issueList.innerHTML = issues.map((issue) => {
    const classes = getStatusClasses(issue.status);
    const empathy = Number(issue.empathy) || 0;
    const comments = getComments(issue);
    const commentIndex = getCommentIndex(issue.id, comments.length);
    const currentComment = comments[commentIndex];
    const sliderDisabled = comments.length < 2 ? "disabled" : "";

    return `
      <article class="issue-card" role="button" tabindex="0" data-issue-id="${issue.id}">
        <span class="issue-card-title">
          <span>${escapeHtml(issue.title)}</span>
        </span>
        <p>${escapeHtml(issue.description)}</p>
        <span class="tag-row">
          <span class="tag">${escapeHtml(issue.category)}</span>
          <span class="tag ${classes.tagClass}">${escapeHtml(issue.status)}</span>
        </span>
        <span class="comment-slider" aria-label="${escapeHtml(issue.title)}のみんなの声">
          <span class="comment-slider-head">
            <span>みんなの声 ${comments.length}件</span>
            <span class="comment-slider-controls">
              <button class="comment-nav-button" type="button" data-comment-action="prev" data-comment-id="${issue.id}" aria-label="前の声を表示" ${sliderDisabled}>‹</button>
              <span>${comments.length ? `${commentIndex + 1}/${comments.length}` : "0/0"}</span>
              <button class="comment-nav-button" type="button" data-comment-action="next" data-comment-id="${issue.id}" aria-label="次の声を表示" ${sliderDisabled}>›</button>
            </span>
          </span>
          <span class="comment-slide-text">${currentComment ? escapeHtml(currentComment) : "まだ声はありません。最初の声を追加できます。"}</span>
        </span>
        <form class="comment-form" data-comment-form-id="${issue.id}">
          <input type="text" name="comment" maxlength="120" placeholder="同じ意見に声を追加" aria-label="${escapeHtml(issue.title)}に声を追加">
          <button type="submit">追加</button>
        </form>
        <span class="issue-card-actions">
          <span class="empathy-count">共感 ${empathy}</span>
          <button class="empathy-button" type="button" data-empathy-id="${issue.id}" aria-label="${escapeHtml(issue.title)}に共感する">共感する</button>
        </span>
      </article>
    `;
  }).join("");
}

function openIssueForm(latlng) {
  selectedLatLng = latlng;
  selectedPoint.textContent = `選択地点: 緯度 ${latlng.lat.toFixed(5)} / 経度 ${latlng.lng.toFixed(5)}`;
  issueForm.classList.add("is-visible");
  document.querySelector("#title").focus();
  refreshMapSize();
}

function closeIssueForm() {
  issueForm.classList.remove("is-visible");
  selectedLatLng = null;
  issueForm.reset();
  selectedPoint.textContent = "地図をクリックすると位置が入ります。";
  refreshMapSize();
}

function focusIssue(issueId) {
  const issue = issues.find((item) => item.id === issueId);
  const marker = markersById.get(issueId);

  if (!issue || !marker) {
    return;
  }

  map.flyTo([issue.lat, issue.lng], 16, {
    duration: 0.8
  });
  marker.openPopup();
}

function addIssueFromForm(event) {
  event.preventDefault();

  if (!selectedLatLng) {
    return;
  }

  const formData = new FormData(issueForm);
  const newIssue = {
    id: nextIssueId,
    title: formData.get("title").trim(),
    description: formData.get("description").trim(),
    category: formData.get("category"),
    status: formData.get("status"),
    empathy: 0,
    comments: [],
    lat: selectedLatLng.lat,
    lng: selectedLatLng.lng
  };

  nextIssueId += 1;
  issues.unshift(newIssue);
  addMarker(newIssue);
  renderIssueList();
  closeIssueForm();
  focusIssue(newIssue.id);
}

function getComments(issue) {
  return Array.isArray(issue.comments) ? issue.comments : [];
}

function getCommentIndex(issueId, commentCount) {
  if (commentCount === 0) {
    return 0;
  }

  const savedIndex = commentIndexesById.get(issueId) || 0;
  return Math.min(Math.max(savedIndex, 0), commentCount - 1);
}

function updateIssuePopup(issueId) {
  const issue = issues.find((item) => item.id === issueId);
  const marker = markersById.get(issueId);

  if (issue && marker) {
    marker.setPopupContent(createPopup(issue));
  }
}

function addEmpathy(issueId) {
  const issue = issues.find((item) => item.id === issueId);

  if (!issue) {
    return;
  }

  issue.empathy = (Number(issue.empathy) || 0) + 1;
  updateIssuePopup(issueId);
  renderIssueList();
}

function moveComment(issueId, direction) {
  const issue = issues.find((item) => item.id === issueId);
  const comments = issue ? getComments(issue) : [];

  if (comments.length < 2) {
    return;
  }

  const currentIndex = getCommentIndex(issueId, comments.length);
  const nextIndex = (currentIndex + direction + comments.length) % comments.length;
  commentIndexesById.set(issueId, nextIndex);
  renderIssueList();
}

function addComment(issueId, commentText) {
  const issue = issues.find((item) => item.id === issueId);
  const normalizedComment = String(commentText || "").trim();

  if (!issue || !normalizedComment) {
    return;
  }

  issue.comments = getComments(issue);
  issue.comments.push(normalizedComment);
  commentIndexesById.set(issueId, issue.comments.length - 1);
  updateIssuePopup(issueId);
  renderIssueList();
}

map.whenReady(() => {
  refreshMapSize();
  setTimeout(refreshMapSize, 250);
});

window.addEventListener("load", refreshMapSize);
window.addEventListener("resize", refreshMapSize);

map.on("click", (event) => {
  openIssueForm(event.latlng);
});

closeFormButton.addEventListener("click", closeIssueForm);
issueForm.addEventListener("submit", addIssueFromForm);

issueList.addEventListener("click", (event) => {
  const empathyButton = event.target.closest("[data-empathy-id]");

  if (empathyButton) {
    event.preventDefault();
    event.stopPropagation();
    addEmpathy(Number(empathyButton.dataset.empathyId));
    return;
  }

  const commentButton = event.target.closest("[data-comment-action]");

  if (commentButton) {
    event.preventDefault();
    event.stopPropagation();
    moveComment(
      Number(commentButton.dataset.commentId),
      commentButton.dataset.commentAction === "next" ? 1 : -1
    );
    return;
  }

  if (event.target.closest(".comment-form")) {
    return;
  }

  if (event.target.closest(".comment-slider")) {
    return;
  }

  const card = event.target.closest(".issue-card");

  if (!card) {
    return;
  }

  focusIssue(Number(card.dataset.issueId));
});

issueList.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-comment-form-id]");

  if (!form) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const formData = new FormData(form);
  addComment(Number(form.dataset.commentFormId), formData.get("comment"));
});

issueList.addEventListener("keydown", (event) => {
  const empathyButton = event.target.closest("[data-empathy-id]");

  if (empathyButton && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    event.stopPropagation();
    addEmpathy(Number(empathyButton.dataset.empathyId));
    return;
  }

  if (event.target.closest(".comment-form")) {
    return;
  }

  if (event.target.closest(".comment-slider")) {
    return;
  }

  const card = event.target.closest(".issue-card");

  if (!card || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  focusIssue(Number(card.dataset.issueId));
});

renderMarkers();
renderIssueList();
