// =========================================================
// REGULAR1 SEASON2 - FINAL FRONTEND LOGIC (Unified Main Event)
// =========================================================

// 1. Firebase 설정
const firebaseConfig = {
    databaseURL: "https://dongpa2026-2fda5-default-rtdb.asia-southeast1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. 전역 변수 및 데이터 저장소
let appData = {
    teamColors: {}, players: [],
    preQuali: [], mainQuali: {}, mainRace: {}, standings: []
};

// [설정] 팀 정렬 순서 (1~10위)
const TEAM_ORDER_LIST = [
    "맥라렌", "메르세데스", "레드불", "페라리", "윌리엄스", 
    "레이싱불스", "애스턴마틴", "하스", "킥자우버", "알핀"
];

// [설정] 트랙 순서
const TRACK_ORDER = ["레드불링", "상파울루", "라스베가스", "아부다비"];

// [설정] 기본 색상
const DEFAULT_COLORS = { "FER": "#E8002D", "MCL": "#FF8700", "RBR": "#3671C6", "MER": "#27F4D2", "AMR": "#229971", "ALP": "#0093CC", "WIL": "#64C4FF", "VCARB": "#6692FF", "KICK": "#52E252", "HAS": "#B6BABD", "FA": "#555555" };
const DEFAULT_TEAM_COLOR = "#555555";

// [설정] 트랙별 정보 및 일정 (국기 제거됨)
const TRACK_INFO = {
    "레드불링": { img: "images/tracks/redbull.webp", name: "레드불링", date: "2026.02.14 (토) 19:00" },
    "상파울루": { img: "images/tracks/brazil.webp", name: "상파울루", date: "2026.02.14 (토) 19:00" },
    "라스베가스": { img: "images/tracks/vegas.webp", name: "라스베가스", date: "2026.02.15 (일) 19:00" },
    "아부다비": { img: "images/tracks/abudhabi.webp", name: "아부다비", date: "2026.02.15 (일) 19:00" }
};
const DEFAULT_TRACK = { img: "images/logo.png", name: "UNKNOWN TRACK", date: "TBA" };

// [설정] 예선 일정
const PRE_QUALI_DATE = "2026.02.11 (수) 18:00";


// [상태 관리]
let currentStandingsView = { type: 'driver', roundIndex: 0 };
let currentPodiumType = 'driver';
let currentMainView = { track: null, session: 'race' };


// =========================================================
// 초기화 및 네비게이션
// =========================================================
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
    if (activeTab && activeTab.id === 'view-pre-quali') renderPreQuali();
}

function getTeamColor(teamName) {
    return appData.teamColors[teamName] || DEFAULT_COLORS[teamName] || DEFAULT_TEAM_COLOR;
}
function getPlayerImg(name) {
    const p = appData.players.find(x => x.name === name);
    return p ? p.img : 'images/logo.png';
}

// =========================================================
// [탭] 참가자 (PLAYERS) - 디자인 최적화
// =========================================================
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


// =========================================================
// [탭] 예선 (PRE-QUALI) - 2단 분할
// =========================================================
function renderPreQuali() { 
    const container = document.getElementById('view-pre-quali'); 
    if (!container) return; 
    
    if (appData.preQuali.length === 0) {
        container.innerHTML = '<div style="padding:50px; text-align:center;">데이터 로딩중...</div>';
        return;
    }

    const redbullInfo = TRACK_INFO["레드불링"];
    const leftData = appData.preQuali.slice(0, 10);
    const rightData = appData.preQuali.slice(10);

    const createRows = (dataList) => {
        return dataList.map(p => { 
            const tColor = getTeamColor(p.team); 
            return `<tr>
                <td width="8%" class="text-center"><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
                <td><div class="cell-left">
                    <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                    <span style="font-weight:bold;">${p.name}</span>
                </div></td>
                <td class="text-center" style="color:#aaa;">${p.gender}</td>
                <td class="record-time text-center" style="color:var(--primary-mint);">${p.record}</td>
                <td class="gap-time text-center">${p.gap}</td>
                <td class="text-center" style="color:#ddd;">${p.partner || '-'}</td>
                <td class="team-text-stroke text-center" style="color:${tColor};">${p.team}</td>
            </tr>`;
        }).join('');
    };

    const tableHeader = `<thead><tr><th>순위</th><th>드라이버</th><th>성별</th><th>기록</th><th>차이</th><th>팀메이트</th><th>팀</th></tr></thead>`;

    container.innerHTML = `
        <div class="track-header-card" style="padding:15px; margin-bottom:15px; min-height:auto;">
            <div class="track-info-box">
                <span class="track-date-label">${PRE_QUALI_DATE}</span>
                <h2 class="track-name-title" style="font-size: 1.4rem; margin:5px 0;">레드불링</h2>
                <span class="track-session-badge" style="font-size:0.8rem;">프랙티스 예선</span>
            </div>
             <div class="track-map-wrapper">
                <img src="${redbullInfo.img}" class="track-map-img" style="max-height:80px;" onerror="this.style.display='none'">
            </div> 
        </div>

        <div class="split-layout-container">
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${createRows(leftData)}</tbody>
                </table>
            </div>
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${createRows(rightData)}</tbody>
                </table>
            </div>
        </div>
    `;
}


// =========================================================
// [탭] 본선 (MAIN EVENT) - 2단 분할
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

// 본선 퀄리파잉
function renderMainQuali(track, container) {
    const listData = appData.mainQuali[track] || [];
    const info = TRACK_INFO[track] || { ...DEFAULT_TRACK, name: track, date: "TBA" };
    const leftData = listData.slice(0, 10);
    const rightData = listData.slice(10);

    const createRows = (dataList) => {
        return dataList.map(p => { 
            const tColor = getTeamColor(p.team); 
            return `<tr>
                <td width="8%" class="text-center"><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
                <td><div class="cell-left">
                    <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                    <span style="font-weight:bold;">${p.name}</span>
                </div></td>
                <td class="text-center" style="color:#aaa;">${p.gender}</td>
                <td class="team-text-stroke text-center" style="color:${tColor};">${p.team}</td>
                <td class="record-time text-center">${p.record}</td>
                <td class="gap-time text-center">${p.gap}</td>
            </tr>`;
        }).join('');
    };
    
    const tableHeader = `<thead><tr><th>순위</th><th>드라이버</th><th>성별</th><th>팀</th><th>기록</th><th>차이</th></tr></thead>`;

    const html = `
        <div class="track-header-card" style="padding:15px; margin-bottom:15px; min-height:auto;">
            <div class="track-info-box">
                <span class="track-date-label">${info.date}</span>
                <h2 class="track-name-title" style="font-size:1.4rem; margin:5px 0;">${info.name}</h2>
                <span class="track-session-badge" style="font-size:0.8rem;">QUALIFYING</span>
            </div>
            <div class="track-map-wrapper">
                <img src="${info.img}" class="track-map-img" style="max-height:80px;" onerror="this.style.display='none'">
            </div>
        </div>
        
        <div class="split-layout-container">
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${listData.length === 0 ? '<tr><td colspan="6">데이터 없음</td></tr>' : createRows(leftData)}</tbody>
                </table>
            </div>
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${createRows(rightData)}</tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;
}

// 본선 레이스
function renderMainRace(track, container) {
    const listData = appData.mainRace[track] || [];
    const info = TRACK_INFO[track] || { ...DEFAULT_TRACK, name: track, date: "TBA" };
    const leftData = listData.slice(0, 10);
    const rightData = listData.slice(10);

    const createRows = (dataList) => {
        return dataList.map(p => {
            let badgeClass = 'st-fin'; 
            if (String(p.state).includes('DNF')) badgeClass = 'st-dnf'; 
            else if (p.state === 'Podium') badgeClass = 'st-podium'; 
            
            const tColor = getTeamColor(p.team);
            
            return `<tr>
                <td width="8%" class="text-center"><span class="rank-num rank-${p.rank}">${p.rank}</span></td>
                <td><div class="cell-left">
                    <img src="${p.img || 'images/logo.png'}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                    <span style="font-weight:bold;">${p.name}</span>
                </div></td>
                <td class="text-center" style="color:#aaa;">${p.gender}</td>
                <td class="text-center"><span class="badge ${badgeClass}" style="font-size:0.7rem; padding:2px 4px;">${p.state}</span></td>
                <td class="team-text-stroke text-center" style="color:${tColor};">${p.team}</td>
                <td class="record-time text-center">${p.totalTime}</td>
                <td class="text-center" style="color:#ff6b6b; font-size:0.8rem;">${p.penalty}</td>
                <td class="gap-time text-center">${p.gap}</td>
                <td class="text-center" style="color:var(--primary-mint); font-weight:bold;">+${p.points}</td>
                <td class="text-center" style="color:#fff;">${p.cumulativePoints}</td>
                <td class="text-center" style="color:#aaa;">${p.grid}</td>
            </tr>`;
        }).join('');
    };

    const tableHeader = `<thead><tr><th>순위</th><th>드라이버</th><th>성별</th><th>상태</th><th>팀</th><th>기록</th><th>페널티</th><th>차이</th><th>PT</th><th>누적</th><th>그리드</th></tr></thead>`;

    const html = `
        <div class="track-header-card" style="padding:15px; margin-bottom:15px; min-height:auto;">
            <div class="track-info-box">
                <span class="track-date-label">${info.date}</span>
                <h2 class="track-name-title" style="font-size:1.4rem; margin:5px 0;">${info.name}</h2>
                <span class="track-session-badge" style="font-size:0.8rem;">RACE RESULT</span>
            </div>
            <div class="track-map-wrapper">
                <img src="${info.img}" class="track-map-img" style="max-height:80px;" onerror="this.style.display='none'">
            </div>
        </div>
        
        <div class="split-layout-container">
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${listData.length === 0 ? '<tr><td colspan="11">데이터 없음</td></tr>' : createRows(leftData)}</tbody>
                </table>
            </div>
            <div class="split-table-box">
                <table class="compact-table">
                    ${tableHeader}
                    <tbody>${createRows(rightData)}</tbody>
                </table>
            </div>
        </div>
    `;
    container.innerHTML = html;
}


// =========================================================
// [탭] 종합 순위 (STANDINGS) - 2단 분할 적용 (오류 수정됨)
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
    const wrapper = document.getElementById('standings-wrapper');
    const roundNav = document.getElementById('standings-round-btns'); 
    
    if (!wrapper) return;
    
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

    // [핵심 변경] 타입에 따라 분할 개수와 스타일 클래스 결정
    const isConstructor = (currentStandingsView.type === 'constructor');
    const splitCount = isConstructor ? 5 : 10; // 컨스트럭터는 5개씩, 드라이버는 10개씩
    const tableClass = isConstructor ? "compact-table large-mode" : "compact-table"; // 컨스트럭터는 큰 테이블 사용

    const leftData = currentData.slice(0, splitCount);
    const rightData = currentData.slice(splitCount);

    const createRows = (dataList) => {
        return dataList.map((item, idx) => { 
            const realRank = currentData.indexOf(item) + 1;
            const tColor = getTeamColor(item.team); 
            let changeHTML = ''; 
            
            if (currentStandingsView.roundIndex !== -1 && prevData) { 
                const prevItem = prevData.find(p => p.name === item.name); 
                if (prevItem) { 
                    const prevRank = prevData.indexOf(prevItem) + 1; 
                    const diff = prevRank - realRank; 
                    if (diff > 0) changeHTML = `<span class="rank-change rc-up">▲${diff}</span>`; 
                    else if (diff < 0) changeHTML = `<span class="rank-change rc-down">▼${Math.abs(diff)}</span>`; 
                    else changeHTML = `<span class="rank-change rc-same">-</span>`; 
                } else { 
                    changeHTML = `<span class="rank-change rc-up">NEW</span>`; 
                } 
            } 
            
            if (currentStandingsView.type === 'driver') { 
                return `<tr>
                    <td><span class="rank-num rank-${realRank}">${realRank}</span>${changeHTML}</td>
                    <td><div class="cell-left">
                        <img src="${getPlayerImg(item.name)}" class="p-avatar" style="border-color: ${tColor};" onerror="this.src='images/logo.png'">
                        <span style="font-weight:bold;">${item.name}</span>
                    </div></td>
                    <td class="team-text-stroke" style="color:${tColor};">${item.team}</td>
                    <td style="color:var(--primary-mint); font-weight:900;">${item.points} PT</td>
                </tr>`; 
            } else { 
                const avatarHTML = item.driverList.map(dName => `<img src="${getPlayerImg(dName)}" class="mini-avatar" title="${dName}" onerror="this.src='images/logo.png'">`).join(''); 
                return `<tr>
                    <td><span class="rank-num rank-${realRank}">${realRank}</span>${changeHTML}</td>
                    <td class="team-text-stroke" style="color:${tColor}; text-align:left; padding-left:10px;">${item.name}</td>
                    <td><div class="duo-avatar-box">${avatarHTML}</div></td>
                    <td style="color:var(--primary-mint); font-weight:900;">${item.points} PT</td>
                </tr>`; 
            } 
        }).join('');
    };

    let headerHTML = '';
    if (currentStandingsView.type === 'driver') {
        headerHTML = `<thead><tr><th>순위</th><th>드라이버</th><th>팀</th><th>포인트</th></tr></thead>`;
    } else {
        headerHTML = `<thead><tr><th>순위</th><th>컨스트럭터</th><th>소속 선수</th><th>포인트</th></tr></thead>`;
    }

    wrapper.style.background = 'transparent';
    wrapper.style.boxShadow = 'none';
    wrapper.style.padding = '0';

    wrapper.innerHTML = `
        <div class="split-layout-container">
            <div class="split-table-box">
                <table class="${tableClass}">
                    ${headerHTML}
                    <tbody>${currentData.length === 0 ? '<tr><td colspan="4">데이터 없음</td></tr>' : createRows(leftData)}</tbody>
                </table>
            </div>
            <div class="split-table-box">
                <table class="${tableClass}">
                    ${headerHTML}
                    <tbody>${createRows(rightData)}</tbody>
                </table>
            </div>
        </div>
    `;
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
    const driverContainer = document.getElementById('podium-driver-area');
    const constContainer = document.getElementById('podium-constructor-area');
    
    if (!driverContainer || !constContainer) return; 
    
    // 현재까지 진행된 라운드 인덱스 계산
    const lastRoundIdx = TRACK_ORDER.length - 1; 
    let validIdx = -1; 
    for(let i=0; i<=lastRoundIdx; i++) { 
        if(appData.mainRace[TRACK_ORDER[i]]) validIdx = i; 
    } 
    
    if (validIdx === -1) { 
        driverContainer.innerHTML = '<p style="color:#888; font-size:0.8rem;">진행된 경기 없음</p>';
        constContainer.innerHTML = '<p style="color:#888; font-size:0.8rem;">진행된 경기 없음</p>';
        return; 
    } 
    
    // 1. 드라이버 데이터 계산 및 렌더링
    const driverData = calculatePointsUntil(validIdx, 'driver').slice(0, 3); 
    driverContainer.innerHTML = generatePodiumHTML(driverData, 'driver');

    // 2. 컨스트럭터 데이터 계산 및 렌더링
    const constData = calculatePointsUntil(validIdx, 'constructor').slice(0, 3); 
    constContainer.innerHTML = generatePodiumHTML(constData, 'constructor');
}

// [보조 함수] 포디움 HTML 생성기
function generatePodiumHTML(dataList, type) {
    if (dataList.length === 0) return '<p style="color:#888;">데이터 없음</p>';

    const createCard = (d, rankClass, rankNum) => { 
        if (!d) return ''; 
        const tColor = getTeamColor(d.team); 
        let imgHTML = ''; 
        
        if (type === 'driver') { 
            // 드라이버: 기존 원형/사각형 유지
            imgHTML = `<img src="${getPlayerImg(d.name)}" class="podium-img" onerror="this.src='images/logo.png'" style="border-color:${tColor}">`; 
        } else { 
            // [수정] 컨스트럭터: 박스에 테두리 색상을 주고, 이미지는 꽉 채움
            const duoHTML = d.driverList.map(dName => `<img src="${getPlayerImg(dName)}" class="podium-duo-img" onerror="this.src='images/logo.png'">`).join(''); 
            
            // 박스 자체에 테두리 색상 적용
            imgHTML = `<div class="podium-duo-box" style="border-color:${tColor};">${duoHTML}</div>`; 
        } 
        
        return `<div class="podium-card ${rankClass}" style="border-bottom-color:${tColor};">
            <div class="podium-rank">${rankNum}</div>
            ${imgHTML}
            <div class="podium-info-wrap" style="text-align:center; width:100%;">
                <div class="podium-name">${d.name}</div>
                <div class="podium-team team-text-stroke" style="color:${tColor};">${d.team}</div>
                <div class="podium-points">${d.points} PT</div>
            </div>
        </div>`; 
    }; 

    return `<div class="podium-container compact-podium" style="min-height:auto; margin-top:0;">
        ${createCard(dataList[1], 'p-2nd', 2)}
        ${createCard(dataList[0], 'p-1st', 1)}
        ${createCard(dataList[2], 'p-3rd', 3)}
    </div>`;
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
