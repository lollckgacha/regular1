// =========================================================
// REGULAR1 SEASON2 - FINAL FRONTEND LOGIC (Unified Main Event)
// =========================================================

const firebaseConfig = {
    databaseURL: "https://dongpa2026-2fda5-default-rtdb.asia-southeast1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let appData = {
    teamColors: {}, players: [],
    preQuali: [], mainQuali: {}, mainRace: {}, standings: []
};

// [추가] 팀 정렬 순서 (Teams 시트 순서)
const TEAM_ORDER_LIST = [
    "맥라렌", "메르세데스", "레드불", "페라리", "윌리엄스", 
    "레이싱불스", "애스턴마틴", "하스", "킥자우버", "알핀"  
];

// 트랙 순서
const TRACK_ORDER = ["레드불링", "상파울루", "라스베가스", "아부다비"];

// 팀 컬러 기본값
const DEFAULT_COLORS = { "FER": "#E8002D", "MCL": "#FF8700", "RBR": "#3671C6", "MER": "#27F4D2", "AMR": "#229971", "ALP": "#0093CC", "WIL": "#64C4FF", "VCARB": "#6692FF", "KICK": "#52E252", "HAS": "#B6BABD", "FA": "#555555" };
const DEFAULT_TEAM_COLOR = "#555555";

// [수정] 일정 업데이트 (2026년 기준 요일 자동 반영)
const TRACK_INFO = {
    "레드불링": { img: "images/tracks/redbull.webp", flag: "🇦🇹", name: "레드불링", date: "2026.02.14 (토) 19:00" },
    "상파울루": { img: "images/tracks/brazil.webp", flag: "🇧🇷", name: "상파울루", date: "2026.02.14 (토) 19:00" },
    "라스베가스": { img: "images/tracks/vegas.webp", flag: "🇺🇸", name: "라스베가스", date: "2026.02.15 (일) 19:00" },
    "아부다비": { img: "images/tracks/abudhabi.webp", flag: "🇦🇪", name: "아부다비", date: "2026.02.15 (일) 19:00" }
};
const DEFAULT_TRACK = { img: "images/logo.png", flag: "🏁", name: "UNKNOWN TRACK", date: "TBA" };

// [수정] 예선(프랙티스) 일정 업데이트
const PRE_QUALI_DATE = "2026.02.11 (수) 18:00";


// [상태 관리]
let currentStandingsView = { type: 'driver', roundIndex: 0 };
let currentPodiumType = 'driver';
let currentMainView = { track: null, session: 'race' }; // 기본값: 레이스

window.onload = () => {
    initFirebaseListeners();
    const hash = window.location.hash.replace('#', '');
    const initialTab = hash || 'home';
    history.replaceState({ tab: initialTab }, '', `#${initialTab}`);
    switchTab(initialTab, true);
};

window.onpopstate = (event) => {
    if (event.state && event.state.tab) {
        switchTab(event.state.tab, true);
    } else {
        switchTab('home', true);  
    }
};

function initFirebaseListeners() {
    db.ref('TeamColors').on('value', snap => { appData.teamColors = snap.val() || DEFAULT_COLORS; refreshViews(); });
    db.ref('AllPlayers').on('value', snap => { appData.players = snap.val() || []; refreshViews(); });
    db.ref('PreQuali').on('value', snap => { appData.preQuali = snap.val() || []; renderPreQuali(); });
    db.ref('MainQuali').on('value', snap => { appData.mainQuali = snap.val() || {}; setupMainTabs(); });
    db.ref('MainRace').on('value', snap => { 
        appData.mainRace = snap.val() || {}; 
        setupMainTabs(); 
        renderStandings(); 
        renderPodium(); 
    });
}

function refreshViews() {
    const activeTab = document.querySelector('.view-section.active');
    if (activeTab && activeTab.id === 'view-players') renderPlayersGrid();
    if (activeTab && activeTab.id === 'view-main') setupMainTabs();
    if (activeTab && activeTab.id === 'view-standings') renderStandings();
    if (activeTab && activeTab.id === 'view-podium') renderPodium();
}

function getTeamColor(teamName) {
    return appData.teamColors[teamName] || DEFAULT_COLORS[teamName] || DEFAULT_TEAM_COLOR;
}
function getPlayerImg(name) {
    const p = appData.players.find(x => x.name === name);
    return p ? p.img : 'images/logo.png';
}

// =========================================================
// [통합] 본선(Main Event) 로직
// =========================================================

function setupMainTabs() {
    const qTracks = Object.keys(appData.mainQuali || {});
    const rTracks = Object.keys(appData.mainRace || {});
    const allTracks = [...new Set([...qTracks, ...rTracks])];

    const tracks = TRACK_ORDER.filter(t => allTracks.includes(t));
    const container = document.getElementById('main-track-tabs');
    const sessionSelector = document.getElementById('session-selector');

    if (!container) return;

    if (tracks.length === 0) {
        container.innerHTML = `<div style="color:#555; padding:20px;">아직 진행된 경기가 없습니다.</div>`;
        if (sessionSelector) sessionSelector.style.display = 'none';
        document.getElementById('main-content-area').innerHTML = '';
        return;
    }

    if (sessionSelector) sessionSelector.style.display = 'flex'; 

    if (!currentMainView.track || !tracks.includes(currentMainView.track)) {
        currentMainView.track = tracks[0];
        currentMainView.session = 'quali';
    }

    container.innerHTML = tracks.map(track => {
        const isActive = (currentMainView.track === track);
        return `<button class="tab-btn ${isActive ? 'active' : ''}" onclick="selectMainTrack('${track}')"><span>${track}</span></button>`;
    }).join('');

    updateSessionButtons();
    renderMainContent();
}

window.selectMainTrack = (track) => {
    currentMainView.track = track;
    currentMainView.session = 'quali'; 
    setupMainTabs(); 
};

window.setMainSession = (sessionType) => {
    currentMainView.session = sessionType;
    updateSessionButtons();
    renderMainContent();
};

function updateSessionButtons() {
    const btns = document.querySelectorAll('.session-btn');
    btns.forEach(b => {
        b.classList.remove('active'); 
        if (b.getAttribute('onclick').includes(`'${currentMainView.session}'`)) {
            b.classList.add('active');
        }
    });
}

function renderMainContent() {
    const track = currentMainView.track;
    const session = currentMainView.session;
    const container = document.getElementById('main-content-area');
    
    if (!track || !container) return;

    container.innerHTML = ''; 

    if (session === 'quali') {
        renderMainQuali(track, container);
    } else {
        renderMainRace(track, container);
    }
}

function renderMainQuali(track, container) {
    const listData = appData.mainQuali[track] || [];
    const info = TRACK_INFO[track] || { ...DEFAULT_TRACK, name: track, date: "TBA" };

    const html = `
        <div class="track-header-card">
            <div class="track-info-box">
                <span class="track-date-label">${info.date}</span>
                <span class="track-flag">${info.flag}</span>
                <h2 class="track-name-title">${info.name}</h2>
                <span class="track-session-badge">퀄리파잉</span>
            </div>
            <div class="track-map-wrapper">
                <img src="${info.img}" class="track-map-img" onerror="this.style.display='none'">
            </div>
        </div>
        <table class="f1-table">
            <thead>
                <tr>
                    <th width="5%">순위</th><th width="30%">드라이버</th><th width="5%">성별</th>
                    <th width="10%">팀</th><th width="15%">기록</th><th width="15%">차이</th>
                </tr>
            </thead>
            <tbody>
                ${listData.length === 0 ? '<tr><td colspan="6" style="padding:30px;">데이터 없음</td></tr>' : 
                  listData.map(p => { 
                      const tColor = getTeamColor(p.team); 
                      return `<tr>
                          <td><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
                          <td><div class="cell-left">
                              <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                              <span style="font-weight:bold;">${p.name}</span>
                          </div></td>
                          <td>${p.gender}</td>
                          <td class="team-text-stroke" style="color:${tColor}; font-weight:900;">${p.team}</td>
                          <td class="record-time">${p.record}</td>
                          <td class="gap-time">${p.gap}</td>
                      </tr>`;
                  }).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = html;
}

function renderMainRace(track, container) {
    const listData = appData.mainRace[track] || [];
    const qualiData = appData.mainQuali[track] || []; 
    const info = TRACK_INFO[track] || { ...DEFAULT_TRACK, name: track, date: "TBA" };

    const html = `
        <div class="track-header-card">
            <div class="track-info-box">
                <span class="track-date-label">${info.date}</span>
                <span class="track-flag">${info.flag}</span>
                <h2 class="track-name-title">${info.name}</h2>
                <span class="track-session-badge">레이스</span>
            </div>
            <div class="track-map-wrapper">
                <img src="${info.img}" class="track-map-img" onerror="this.style.display='none'">
            </div>
        </div>
        <div style="overflow-x: auto;">
            <table class="f1-table" style="min-width: 900px;">
                <thead>
                    <tr>
                        <th width="5%">순위</th><th width="20%">드라이버</th><th width="5%">성별</th>
                        <th width="8%">상태</th><th width="8%">팀</th><th width="10%">전체시간</th>
                        <th width="6%">페널티</th><th width="8%">차이</th><th width="6%">포인트</th>
                        <th width="6%">누적</th><th width="5%">그리드</th>
                    </tr>
                </thead>
                <tbody>
                    ${listData.length === 0 ? '<tr><td colspan="11" style="padding:30px;">데이터 없음</td></tr>' :
                      listData.map(p => {
                        let badgeClass = 'st-fin'; if (String(p.state).includes('DNF') || String(p.state).includes('리타')) badgeClass = 'st-dnf'; else if (p.state === 'Podium') badgeClass = 'st-podium'; 
                        const tColor = getTeamColor(p.team);
                        const qualiRecord = qualiData.find(q => q.name === p.name);
                        const gridPos = qualiRecord ? qualiRecord.rank : '-';
                        
                        return `<tr>
                            <td><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
                            <td><div class="cell-left">
                                <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                                <span style="font-weight:bold;">${p.name}</span>
                            </div></td>
                            <td>${p.gender}</td>
                            <td><span class="badge ${badgeClass}">${p.state}</span></td>
                            <td class="team-text-stroke" style="font-weight:900; color:${tColor};">${p.team}</td>
                            <td class="record-time">${p.totalTime}</td>
                            <td class="penalty-time">${p.penalty}</td>
                            <td class="gap-time">${p.gap}</td>
                            <td style="color:var(--primary-mint); font-weight:900;">+${p.points}</td>
                            <td style="font-weight:bold; color:white;">${p.cumulativePoints}</td>
                            <td style="color:#aaa; font-weight:bold; font-size:1.1rem;">${gridPos}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    container.innerHTML = html;
}

// =========================================================
// 종합 순위 & 포디움 등 기타 로직
// =========================================================

window.setStandingsType = (type) => { 
    currentStandingsView.type = type; 
    document.querySelectorAll('.standings-type-nav .type-btn').forEach(b => b.classList.remove('active')); 
    document.querySelector(`.standings-type-nav .type-btn[onclick*="${type}"]`).classList.add('active'); 
    renderStandings(); 
};

window.setStandingsRound = (idx) => { 
    currentStandingsView.roundIndex = parseInt(idx); 
    renderStandings(); 
};

function renderStandings() { 
    const container = document.getElementById('standings-list'); 
    const headerRow = document.getElementById('standings-header-row'); 
    const roundNav = document.getElementById('standings-round-btns'); 
    if (!container) return; 
    
    const availableTracks = TRACK_ORDER.filter(t => appData.mainRace[t] && appData.mainRace[t].length > 0); 
    const roundCount = availableTracks.length; 
    
    let navHTML = availableTracks.map((t, i) => `<button class="round-btn ${currentStandingsView.roundIndex === i ? 'active' : ''}" onclick="setStandingsRound(${i})">${t}</button>`).join(''); 
    navHTML += `<button class="round-btn ${currentStandingsView.roundIndex === -1 ? 'active' : ''}" onclick="setStandingsRound(-1)">최종순위</button>`; 
    roundNav.innerHTML = navHTML; 
    
    let targetIdx = currentStandingsView.roundIndex === -1 ? roundCount - 1 : currentStandingsView.roundIndex; 
    if (targetIdx < 0) targetIdx = -1; 
    
    let currentData = calculatePointsUntil(targetIdx, currentStandingsView.type); 
    let prevData = null; 
    
    if (currentStandingsView.roundIndex !== -1 && targetIdx > 0) { 
        prevData = calculatePointsUntil(targetIdx - 1, currentStandingsView.type); 
    } 
    
    if (currentStandingsView.type === 'driver') { 
        headerRow.innerHTML = `<th width="10%">순위</th><th width="40%">드라이버</th><th width="20%">팀</th><th width="20%">포인트</th>`; 
    } else { 
        headerRow.innerHTML = `<th width="10%">순위</th><th width="40%">컨스트럭터</th><th width="30%">소속 선수</th><th width="20%">포인트</th>`; 
    } 
    
    if (currentData.length === 0) { 
        container.innerHTML = `<tr><td colspan="4" style="padding:30px; color:#666;">데이터가 없습니다.</td></tr>`; 
        return; 
    } 
    
    container.innerHTML = currentData.map((item, idx) => { 
        const rank = idx + 1; 
        const tColor = getTeamColor(item.team); 
        let changeHTML = ''; 
        
        if (currentStandingsView.roundIndex !== -1 && prevData) { 
            const prevItem = prevData.find(p => p.name === item.name); 
            if (prevItem) { 
                const prevRank = prevData.indexOf(prevItem) + 1; 
                const diff = prevRank - rank; 
                if (diff > 0) changeHTML = `<span class="rank-change rc-up">▲${diff}</span>`; 
                else if (diff < 0) changeHTML = `<span class="rank-change rc-down">▼${Math.abs(diff)}</span>`; 
                else changeHTML = `<span class="rank-change rc-same">-</span>`; 
            } else { 
                changeHTML = `<span class="rank-change rc-up">NEW</span>`; 
            } 
        } 
        
        if (currentStandingsView.type === 'driver') { 
            return `<tr>
                <td><span class="rank-num rank-${rank}">${rank}</span>${changeHTML}</td>
                <td><div class="cell-left">
                    <img src="${getPlayerImg(item.name)}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                    <span style="font-weight:bold;">${item.name}</span>
                </div></td>
                <td class="team-text-stroke" style="color:${tColor}; font-weight:900;">${item.team}</td>
                <td style="font-size:1.1rem; font-weight:900; color:var(--primary-mint); font-family:var(--font-main);">${item.points} PT</td>
            </tr>`; 
        } else { 
            const avatarHTML = item.driverList.map(dName => `<img src="${getPlayerImg(dName)}" class="mini-avatar" title="${dName}" onerror="this.src='images/logo.png'">`).join(''); 
            return `<tr>
                <td><span class="rank-num rank-${rank}">${rank}</span>${changeHTML}</td>
                <td class="team-text-stroke" style="font-weight:900; font-size:1.3rem; color:${tColor}; text-align:left; padding-left:30px;">${item.name}</td>
                <td><div class="duo-avatar-box">${avatarHTML}</div></td>
                <td style="font-size:1.1rem; font-weight:900; color:var(--primary-mint); font-family:var(--font-main);">${item.points} PT</td>
            </tr>`; 
        } 
    }).join(''); 
}

function calculatePointsUntil(roundIdx, type) { 
    let pointsMap = {}; 
    for (let i = 0; i <= roundIdx; i++) { 
        const trackName = TRACK_ORDER[i]; 
        if (!appData.mainRace[trackName]) continue; 
        appData.mainRace[trackName].forEach(r => { 
            if (!pointsMap[r.name]) { 
                pointsMap[r.name] = { points: 0, team: r.team || 'FA', name: r.name }; 
            } 
            pointsMap[r.name].points += (r.points || 0); 
        }); 
    } 
    
    if (type === 'driver') { 
        return Object.values(pointsMap).sort((a, b) => b.points - a.points); 
    } else { 
        let teamMap = {}; 
        Object.values(pointsMap).forEach(p => { 
            if (!teamMap[p.team]) { 
                teamMap[p.team] = { name: p.team, points: 0, driverList: [] }; 
            } 
            teamMap[p.team].points += p.points; 
            if (!teamMap[p.team].driverList.includes(p.name)) { 
                teamMap[p.team].driverList.push(p.name); 
            } 
        }); 
        return Object.values(teamMap).map(t => ({ name: t.name, points: t.points, team: t.name, driverList: t.driverList })).sort((a, b) => b.points - a.points); 
    } 
}

window.setPodiumType = (type) => { 
    currentPodiumType = type; 
    document.getElementById('podium-btn-driver').classList.remove('active'); 
    document.getElementById('podium-btn-constructor').classList.remove('active'); 
    document.getElementById(`podium-btn-${type}`).classList.add('active'); 
    renderPodium(); 
};

function renderPodium() { 
    const container = document.getElementById('podium-display-area'); 
    if (!container) return; 
    
    const lastRoundIdx = TRACK_ORDER.length - 1; 
    let validIdx = -1; 
    for(let i=0; i<=lastRoundIdx; i++) { 
        if(appData.mainRace[TRACK_ORDER[i]]) validIdx = i; 
    } 
    
    if (validIdx === -1) { 
        container.innerHTML = '<p style="text-align:center; color:#888;">아직 진행된 경기가 없습니다.</p>'; 
        return; 
    } 
    
    const topData = calculatePointsUntil(validIdx, currentPodiumType).slice(0, 3); 
    if (topData.length === 0) return; 
    
    const createCard = (d, rankClass, rankNum) => { 
        if (!d) return ''; 
        const tColor = getTeamColor(d.team); 
        let imgHTML = ''; 
        if (currentPodiumType === 'driver') { 
            imgHTML = `<img src="${getPlayerImg(d.name)}" class="podium-img" onerror="this.src='images/logo.png'" style="border-color:${tColor}">`; 
        } else { 
            const duoHTML = d.driverList.map(dName => `<img src="${getPlayerImg(dName)}" class="podium-duo-img" onerror="this.src='images/logo.png'" style="border-color:${tColor}">`).join(''); 
            imgHTML = `<div class="podium-duo-box">${duoHTML}</div>`; 
        } 
        
        let textHTML = ''; 
        if (currentPodiumType === 'constructor') { 
            textHTML = `<div class="podium-name team-text-stroke" style="color:${tColor}; margin-bottom:10px;">${d.name}</div><div class="podium-points">${d.points} PT</div>`; 
        } else { 
            textHTML = `<div class="podium-name">${d.name}</div><div class="podium-team team-text-stroke" style="color:${tColor}; font-weight:900;">${d.team}</div><div class="podium-points">${d.points} PT</div>`; 
        } 
        return `<div class="podium-card ${rankClass}" style="border-bottom-color:${tColor};"><div class="podium-rank">${rankNum}</div>${imgHTML}<div class="podium-info-wrap" style="text-align:center;">${textHTML}</div></div>`; 
    }; 
    
    container.innerHTML = `<div class="podium-container">${createCard(topData[0], 'p-1st', 1)}${createCard(topData[1], 'p-2nd', 2)}${createCard(topData[2], 'p-3rd', 3)}</div>`; 
}

window.switchTab = (tabId, isFromHistory = false) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    const targetSection = document.getElementById(`view-${tabId}`);
    if (targetSection) targetSection.classList.add('active');
    
    const targetBtn = document.querySelector(`.nav-link[onclick*="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    if (!isFromHistory) {
        history.pushState({ tab: tabId }, '', `#${tabId}`);
    }

    if (tabId === 'players') renderPlayersGrid();
    if (tabId === 'main') setupMainTabs();
    if (tabId === 'standings') renderStandings(); 
    if (tabId === 'podium') renderPodium();
    if (tabId === 'pre-quali') renderPreQuali();       
    
    window.scrollTo(0,0);
};

// [수정] 참가자 탭 (시트 순서 정렬 + 디자인 유지 + 링크 기능)
function renderPlayersGrid() { 
    const gridContainer = document.getElementById('players-grid'); 
    if (!gridContainer) return; 
    
    const playersList = appData.players; 
    if (playersList.length === 0) { 
        gridContainer.innerHTML = '<p style="text-align:center; color:#888;">등록된 선수가 없습니다.</p>'; 
        return; 
    } 
    
    const teamsMap = {}; 
    playersList.forEach(p => { 
        if (!p.team) p.team = "FA"; 
        if (!teamsMap[p.team]) teamsMap[p.team] = []; 
        teamsMap[p.team].push(p); 
    }); 
    
    const sortedTeamNames = Object.keys(teamsMap).sort((a, b) => { 
        const idxA = TEAM_ORDER_LIST.indexOf(a);
        const idxB = TEAM_ORDER_LIST.indexOf(b);
        if (a === 'FA') return 1;
        if (b === 'FA') return -1;
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    }); 
    
    let htmlOutput = ''; 
    sortedTeamNames.forEach(teamName => { 
        const teamMembers = teamsMap[teamName]; 
        const teamColor = getTeamColor(teamName); 
        
        const cardStyle = `background: linear-gradient(135deg, ${teamColor}dd 0%, #111 80%); border-color: ${teamColor};`; 
        const headerStyle = `color: ${teamColor}; filter: brightness(1.5);`; 
        
        const membersHTML = teamMembers.map(member => {
            const imgHTML = `<img src="${member.img || 'images/logo.png'}" class="player-photo-large" style="border-color: ${teamColor};" onerror="this.src='images/logo.png'">`;
            const contentHTML = member.url 
                ? `<a href="${member.url}" target="_blank" class="player-img-wrapper">${imgHTML}</a>`
                : `<div class="player-img-wrapper">${imgHTML}</div>`;

            return `<div class="player-card-box">
                ${contentHTML}
                <div class="player-info-box">
                    <span class="player-name-large">${member.name}</span>
                </div>
            </div>`;
        }).join(''); 
        
        htmlOutput += `<div class="team-card" style="${cardStyle}"><div class="team-name-header team-text-stroke" style="${headerStyle}">${teamName}</div><div class="team-players-row">${membersHTML}</div></div>`; 
    }); 
    
    gridContainer.innerHTML = htmlOutput; 
}

// [수정] 예선 렌더링 (헤더 카드 + 날짜 포함)
function renderPreQuali() { 
    const container = document.getElementById('view-pre-quali'); 
    if (!container) return; 
    
    if (appData.preQuali.length === 0) {
        container.innerHTML = '<div style="padding:50px; text-align:center;">데이터 로딩중...</div>';
        return;
    }

    const listHTML = appData.preQuali.map(p => { 
        const tColor = getTeamColor(p.team); 
        return `<tr>
            <td><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
            <td><div class="cell-left">
                <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                <span style="font-weight:bold;">${p.name}</span>
            </div></td>
            <td>${p.gender}</td>
            <td class="record-time" style="color:var(--primary-mint);">${p.record}</td>
            <td class="gap-time">${p.gap}</td>
            <td style="color:#aaa;">${p.partner || '-'}</td>
            <td class="team-text-stroke" style="color:${tColor}; font-weight:900;">${p.team}</td>
        </tr>`;
    }).join('');

    // [변경점] 헤더 디자인을 레드불링 정보로 교체하고 타이틀 수정
    const redbullInfo = TRACK_INFO["레드불링"];
    
    container.innerHTML = `
        <div class="track-header-card">
            <div class="track-info-box">
                <span class="track-date-label">${PRE_QUALI_DATE}</span>
                <span class="track-flag">${redbullInfo.flag}</span>
                <h2 class="track-name-title" style="font-size: 1.8rem;">레드불링</h2>
                <span class="track-session-badge">프렉티스 예선</span>  
            </div>
             <div class="track-map-wrapper">
                <img src="${redbullInfo.img}" class="track-map-img" onerror="this.style.display='none'">
            </div> 
        </div>

        <div class="unified-glass-box" style="margin-top:0;">
            <table class="f1-table">
                <thead>
                    <tr>
                        <th width="5%">순위</th><th width="20%">드라이버</th><th width="5%">성별</th>
                        <th width="15%">기록</th><th width="10%">차이</th><th width="15%">팀메이트</th><th width="10%">팀</th>
                    </tr>
                </thead>
                <tbody>${listHTML}</tbody>
            </table>
        </div>
    `;
}





