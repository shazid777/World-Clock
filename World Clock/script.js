// World Time Dashboard - Final Stable Version
const WORLD_TIME_API = "https://worldtimeapi.org/api/timezone/Etc/UTC";

let serverOffset = 0;
let lastSync = null;

const SESSIONS = [
  { name: "Sydney", start: 22, end: 7 },
  { name: "Tokyo", start: 0, end: 9 },
  { name: "London", start: 8, end: 17 },
  { name: "New York", start: 13, end: 22 }
];

window.addEventListener("load", () => {
  const loading = document.getElementById("loading-screen");
  if (loading) loading.style.display = "none";

  syncServerTime();
  updateDashboard();

  setInterval(updateDashboard, 1000);
  setInterval(syncServerTime, 600000);
});

async function syncServerTime() {
  try {
    const res = await fetch(WORLD_TIME_API);
    if (!res.ok) throw new Error("API failed");

    const data = await res.json();
    const serverTime = new Date(data.datetime);

    serverOffset = serverTime.getTime() - Date.now();
    lastSync = new Date();

    setText("sync-text", "Connected");
  } catch {
    serverOffset = 0;
    setText("sync-text", "Browser Time");
  }
}

function getUtcNow() {
  return new Date(Date.now() + serverOffset);
}

function updateDashboard() {
  const utcNow = getUtcNow();

  setText("bd-timezone", "UTC +06:00");
  setText("ldn-timezone", "UTC +01:00");
  setText("ny-timezone", "UTC -04:00");

  updateClockCard(utcNow, "Asia/Dhaka", "bd");
  updateClockCard(utcNow, "Europe/London", "ldn");
  updateClockCard(utcNow, "America/New_York", "ny");

  updateUtcCard(utcNow);
  updateForex(utcNow);
  updateLastSync();
}

function updateClockCard(utcDate, zone, prefix) {
  const local = new Date(
    utcDate.toLocaleString("en-US", { timeZone: zone })
  );

  setText(`${prefix}-time`, local.toLocaleTimeString("en-US", { hour12: true }));
  setText(`${prefix}-day`, local.toLocaleDateString("en-US", { weekday: "long" }));
  setText(`${prefix}-date`, local.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }));

  setText(`${prefix}-daynight`,
    local.getHours() >= 6 && local.getHours() < 18 ? "☀️ Day" : "🌙 Night"
  );
}

function updateUtcCard(date) {
  setText("utc-time", date.toLocaleTimeString("en-US",{hour12:true,timeZone:"UTC"}));
  setText("utc-day", date.toLocaleDateString("en-US",{weekday:"long",timeZone:"UTC"}));
  setText("utc-date", date.toLocaleDateString("en-US",{
    year:"numeric",month:"long",day:"numeric",timeZone:"UTC"
  }));
}

function updateForex(utcNow) {
  const day = utcNow.getUTCDay();
  const hour = utcNow.getUTCHours();

  if (day === 6 || (day === 0 && hour < 22)) {
    updateBanner(false, "Weekend Shutdown");

    setText("active-session-name","FOREX CLOSED");
    setText("active-session-countdown","--");

    setText("next-session-name","Market Reopens");
    setText("next-session-countdown","--");

    setText("london-session-status","CLOSED");
    setText("london-session-label","Starts In");
    setText("london-session-countdown","--");

    return;
  }

  const active = [];

  SESSIONS.forEach(session => {
    const open = isSessionOpen(hour, session);

    const map = {
      "Sydney":"sydney-status",
      "Tokyo":"tokyo-status",
      "London":"london-status",
      "New York":"newyork-status"
    };

    const el = document.getElementById(map[session.name]);

    if (el) {
      el.textContent = open ? "OPEN" : "CLOSED";
      el.className = "session-status " + (open ? "open" : "closed");
    }

    if (open) active.push(session);
  });

  updateBanner(true, active.map(x => x.name).join(" + "));
  updateActiveSessionCard(hour, active);
  updateNextSessionCard(hour);
  updateOverlapCard(hour);
  updateLondonSessionCard(hour);
}

function updateActiveSessionCard(hour, active) {
  if (!active.length) return;

  setText("active-session-name", active.map(x => x.name).join(" + "));

  let nearestClose = 24;

  active.forEach(s => {
    let closeHour = s.end;
    if (closeHour <= hour) closeHour += 24;
    nearestClose = Math.min(nearestClose, closeHour - hour);
  });

  setText("active-session-countdown", `${nearestClose}h 00m`);
}

function updateNextSessionCard(hour) {
  let next = null;
  let wait = 24;

  SESSIONS.forEach(s => {
    let diff = s.start - hour;
    if (diff <= 0) diff += 24;

    if (diff < wait) {
      wait = diff;
      next = s;
    }
  });

  if (next) {
    setText("next-session-name", next.name);
    setText("next-session-countdown", `${wait}h 00m`);
  }
}

function updateLondonSessionCard(hour) {
  const isOpen = hour >= 8 && hour < 17;

  setText("london-session-status", isOpen ? "OPEN" : "CLOSED");
  setText("london-session-label", isOpen ? "Closes In" : "Starts In");

  if (isOpen) {
    setText("london-session-countdown", `${17 - hour}h 00m`);
  } else {
    let hoursUntil = 8 - hour;
    if (hoursUntil <= 0) hoursUntil += 24;
    setText("london-session-countdown", `${hoursUntil}h 00m`);
  }
}

function updateOverlapCard(hour) {
  const open = hour >= 13 && hour < 17;

  setText("overlap-status", open ? "OPEN NOW" : "CLOSED");
  setText("overlap-label", open ? "Ends In" : "Starts In");

  if (open) {
    setText("overlap-countdown", `${17-hour}h 00m`);
  } else {
    let start = 13 - hour;
    if (start <= 0) start += 24;
    setText("overlap-countdown", `${start}h 00m`);
  }
}

function updateBanner(open,msg){
  const banner = document.getElementById("market-banner");
  if (!banner) return;

  banner.innerHTML = open
    ? `<div class="banner-status">🟢 FOREX MARKET OPEN</div><div class="banner-message">${msg}</div>`
    : `<div class="banner-status">🛑 FOREX MARKET CLOSED</div><div class="banner-message">${msg}</div>`;
}

function isSessionOpen(hour,s){
  if (s.start < s.end) return hour >= s.start && hour < s.end;
  return hour >= s.start || hour < s.end;
}

function updateLastSync(){
  if (!lastSync) return;
  setText("last-sync","Last Sync: " + lastSync.toLocaleTimeString());
}

function setText(id,value){
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
