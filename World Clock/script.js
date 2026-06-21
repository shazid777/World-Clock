function getNextForexOpen() {

    const now = new Date();

    const nextOpen = new Date(now);

    /*
      Forex opens Sunday 22:00 UTC
      (approximation)
    */

    nextOpen.setUTCHours(22, 0, 0, 0);

    while (nextOpen <= now || nextOpen.getUTCDay() !== 0) {
        nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
    }

    return nextOpen;
}

function updateClock(timeZone, dayId, dateId, timeId, statusId) {

    const now = new Date();

    const day = new Intl.DateTimeFormat("en-US", {
        timeZone,
        weekday: "long"
    }).format(now);

    const date = new Intl.DateTimeFormat("en-US", {
        timeZone,
        month: "long",
        day: "numeric",
        year: "numeric"
    }).format(now);

    const time = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).format(now);

    const hour = Number(
        new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour: "numeric",
            hour12: false
        }).format(now)
    );

    document.getElementById(dayId).textContent = day;
    document.getElementById(dateId).textContent = date;
    document.getElementById(timeId).textContent = time;

    if(hour >= 6 && hour < 18){
        document.getElementById(statusId).textContent = "☀️ Day";
    }else{
        document.getElementById(statusId).textContent = "🌙 Night";
    }
}

function getUTCMinutes(){
    const now = new Date();
    return now.getUTCHours() * 60 + now.getUTCMinutes();
}

function isSessionOpen(start,end,current){

    if(start > end){
        return current >= start || current < end;
    }

    return current >= start && current < end;
}

function minutesUntil(target,current){

    let diff = target - current;

    if(diff < 0){
        diff += 1440;
    }

    return diff;
}

function formatCountdown(minutes){

    const h = Math.floor(minutes/60);
    const m = minutes%60;

    return `${h}h ${m}m`;
}

function updateSessions(){
    const now = new Date();

const utcDay = now.getUTCDay();

/*
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
*/

if (utcDay === 6 || utcDay === 0) {

    document.getElementById("sydney-status").innerHTML =
        '<span class="closed">🔴 CLOSED</span>';

    document.getElementById("tokyo-status").innerHTML =
        '<span class="closed">🔴 CLOSED</span>';

    document.getElementById("london-status").innerHTML =
        '<span class="closed">🔴 CLOSED</span>';

    document.getElementById("newyork-status").innerHTML =
        '<span class="closed">🔴 CLOSED</span>';

    document.getElementById("active-session").innerHTML =
        `
        🛑 Forex Market Closed<br>
        Weekend Shutdown
        `;

    document.getElementById("overlap-status").innerHTML =
        `
        🛑 No Overlap<br>
        Weekend
        `;

    const sundayOpenUTC = getNextForexOpen();

    const diff = sundayOpenUTC - now;

    const totalSeconds = Math.floor(diff / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    document.getElementById("next-session").innerHTML =
        `
        Market Reopens In<br>
        ${days}d ${hours}h ${mins}m ${secs}s
        `;

    return;
}

    const current = getUTCMinutes();

    const sessions = {
        Sydney:{start:1320,end:420},
        Tokyo:{start:0,end:540},
        London:{start:480,end:1020},
        NewYork:{start:780,end:1320}
    };

    const statusMap = {
        Sydney:"sydney-status",
        Tokyo:"tokyo-status",
        London:"london-status",
        NewYork:"newyork-status"
    };

    let active = [];

    for(const session in sessions){

        const open = isSessionOpen(
            sessions[session].start,
            sessions[session].end,
            current
        );

        const el = document.getElementById(statusMap[session]);

        if(open){
            el.innerHTML='<span class="open">🟢 OPEN</span>';
            active.push(session);
        }else{
            el.innerHTML='<span class="closed">🔴 CLOSED</span>';
        }
    }

    // ACTIVE SESSION

    if(active.length){

        let closestClose = Infinity;
        let activeName = active.join(" + ");

        active.forEach(name=>{

            const end = sessions[name].end;

            const remaining =
                end > current
                ? end-current
                : (1440-current)+end;

            if(remaining < closestClose){
                closestClose = remaining;
            }
        });

        document.getElementById("active-session").innerHTML=
        `
        ${activeName}<br>
        Closes In: ${formatCountdown(closestClose)}
        `;
    }

    // NEXT SESSION

    let nextName="";
    let nextTime=Infinity;

    for(const session in sessions){

        if(
            !isSessionOpen(
                sessions[session].start,
                sessions[session].end,
                current
            )
        ){

            const until = minutesUntil(
                sessions[session].start,
                current
            );

            if(until < nextTime){
                nextTime = until;
                nextName = session;
            }
        }
    }

    document.getElementById("next-session").innerHTML=
    `
    ${nextName}<br>
    Starts In: ${formatCountdown(nextTime)}
    `;

    // OVERLAP

    const overlapStart = 780; //13:00 UTC
    const overlapEnd = 1020;  //17:00 UTC

    if(current >= overlapStart && current < overlapEnd){

        document.getElementById("overlap-status").innerHTML=
        `
        🟢 OPEN NOW<br>
        Ends In: ${formatCountdown(overlapEnd-current)}
        `;
    }
    else{

        let startIn;

        if(current < overlapStart){
            startIn = overlapStart-current;
        }else{
            startIn = (1440-current)+overlapStart;
        }

        document.getElementById("overlap-status").innerHTML=
        `
        🔴 CLOSED<br>
        Starts In: ${formatCountdown(startIn)}
        `;
    }
}

function refresh(){

    updateClock(
        "Asia/Dhaka",
        "bd-day",
        "bd-date",
        "bd-time",
        "bd-status"
    );

    updateClock(
        "Europe/London",
        "ldn-day",
        "ldn-date",
        "ldn-time",
        "ldn-status"
    );

    updateClock(
        "America/New_York",
        "ny-day",
        "ny-date",
        "ny-time",
        "ny-status"
    );

    updateSessions();
}

refresh();
setInterval(refresh,1000);