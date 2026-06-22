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
    lat: 41.77372,
    lng: 140.72644
  },
  {
    id: 2,
    title: "夜間の街灯が少ない",
    description: "五稜郭公園付近の一部歩道で夜間の見通しが悪く、帰宅時に不安を感じます。",
    category: "防犯",
    status: "対応中",
    lat: 41.79689,
    lng: 140.75676
  },
  {
    id: 3,
    title: "観光客向け案内表示が少ない",
    description: "ベイエリアで主要スポットへの案内が分かりにくく、初めて訪れる人が迷いやすいです。",
    category: "観光",
    status: "未対応",
    lat: 41.76825,
    lng: 140.71664
  },
  {
    id: 4,
    title: "歩道が狭い",
    description: "湯の川温泉付近で歩道が狭い場所があり、ベビーカーや高齢者の通行に余裕がありません。",
    category: "道路",
    status: "解決済み",
    lat: 41.78078,
    lng: 140.78845
  },
  {
    id: 5,
    title: "坂道の安全対策が必要",
    description: "元町エリアの坂道で冬季に滑りやすい箇所があり、手すりや注意表示の追加があると安心です。",
    category: "高齢者",
    status: "対応中",
    lat: 41.76355,
    lng: 140.71174
  }
];

let nextIssueId = issues.length + 1;
let selectedLatLng = null;
const markersById = new Map();

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

  return `
    <article>
      <h3 class="popup-title">${escapeHtml(issue.title)}</h3>
      <p class="popup-description">${escapeHtml(issue.description)}</p>
      <div class="popup-meta">
        <span class="tag">${escapeHtml(issue.category)}</span>
        <span class="tag ${classes.tagClass}">${escapeHtml(issue.status)}</span>
      </div>
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

    return `
      <button class="issue-card" type="button" data-issue-id="${issue.id}">
        <span class="issue-card-title">
          <span>${escapeHtml(issue.title)}</span>
        </span>
        <p>${escapeHtml(issue.description)}</p>
        <span class="tag-row">
          <span class="tag">${escapeHtml(issue.category)}</span>
          <span class="tag ${classes.tagClass}">${escapeHtml(issue.status)}</span>
        </span>
      </button>
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
  const card = event.target.closest(".issue-card");

  if (!card) {
    return;
  }

  focusIssue(Number(card.dataset.issueId));
});

renderMarkers();
renderIssueList();
