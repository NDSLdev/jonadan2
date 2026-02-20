let currentDate = new Date();
let events = {};

// ✅ 8가지 분류 색상 정의
const categoryColors = {
  클라우드리뷰: "#4a90e2",
  디너의여왕: "#f25c54",
  리뷰노트: "#2ecc71",
  강남맛집: "#ffb347",
  미블: "#9b59b6",
  리뷰플레이스: "#34495e",
  레뷰: "#e67e22",
  놀러와체험단: "#1abc9c"
};

async function checkPasswordAndStartApp() {
  const docRef = window.firestoreFns.doc(window.db, "settings", "password");
  const pwSnap = await window.firestoreFns.getDoc(docRef);
  const savedPw = pwSnap.exists ? pwSnap.data().value : null;

  // 비밀번호 통과 → 정상 실행
  await loadSchedulesFromFirebase();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay.getDay();

  document.getElementById("month-year").textContent = `${year}년 ${month + 1}월`;
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";

  for (let i = 0; i < startDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDate; day++) {
    const cell = document.createElement("div");
    cell.className = "day";
    const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    cell.dataset.date = dateStr;
    cell.textContent = day;

    const today = new Date();
    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    if (isToday) cell.classList.add("today");

    if (events[dateStr]) {
      events[dateStr].forEach((event) => {
        const div = document.createElement("div");
        div.textContent = `${event.text}${event.done ? " [마감]" : ""}`;
        div.className = "event";
        div.style.fontSize = "0.75em";
        div.style.color = event.done ? "#999" : "#333";
        div.style.backgroundColor = event.color || "#edf3ff";
        if (event.done === true || event.done === "true") {
          div.classList.add("done");
        }
        cell.appendChild(div);
      });
    }

    cell.addEventListener("click", async () => {
      const currentEvents = events[dateStr] || [];
      let message = `${dateStr} 일정\n`;
      if (currentEvents.length > 0) {
        message += currentEvents
          .map((e, i) => `${i + 1}. ${e.text} ${e.done ? "[마감]" : ""}`)
          .join("\n");
        message += `\n\n새 일정 입력 또는 삭제(D번호)/마감(M번호)\n(예: D2, M1)`;
      } else {
        message += "(등록된 일정 없음)\n\n새로운 일정 입력:";
      }

      const input = prompt(message);
      if (input === null) return;

      const trimmed = input.trim();

      if (/^D\d+$/.test(trimmed)) {
        const idx = parseInt(trimmed.slice(1), 10) - 1;
        if (idx >= 0 && idx < currentEvents.length) {
          const id = currentEvents[idx].id;
          await deleteScheduleFromFirebase(id);
        }
      } else if (/^M\d+$/.test(trimmed)) {
        const idx = parseInt(trimmed.slice(1), 10) - 1;
        if (idx >= 0 && idx < currentEvents.length) {
          const id = currentEvents[idx].id;
          await toggleDoneInFirebase(id, true);
        }
      } else if (trimmed !== "") {
        const category = prompt("분류를 입력하세요 (예: 클라우드리뷰, 디너의여왕, 리뷰노트, 강남맛집, 미블, 리뷰플레이스, 레뷰, 놀러와체험단)");
        const color = categoryColors[category] || "#edf3ff";
        const id = await saveScheduleToFirebase(dateStr, trimmed, color);
      }

      await loadSchedulesFromFirebase(); // 최신 반영
    });

    grid.appendChild(cell);
  }
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

async function saveScheduleToFirebase(date, text, color) {
  const { collection, addDoc } = window.firestoreFns;
  try {
    const docRef = await addDoc(collection(window.db, "posts"), {
      date: date,
      text: text,
      done: false,
      color: color
    });
    return docRef.id;
  } catch (err) {
    console.error("❌ 저장 실패:", err);
    return null;
  }
}

async function deleteScheduleFromFirebase(docId) {
  const { deleteDoc, doc: docFn } = window.firestoreFns;
  try {
    await deleteDoc(docFn(window.db, "posts", docId));
  } catch (err) {
    console.error("❌ 삭제 실패:", err);
  }
}

async function toggleDoneInFirebase(docId, doneValue) {
  const { updateDoc, doc: docFn } = window.firestoreFns;
  try {
    await updateDoc(docFn(window.db, "posts", docId), {
      done: doneValue
    });
  } catch (err) {
    console.error("❌ 마감 처리 실패:", err);
  }
}

async function loadSchedulesFromFirebase() {
  const { collection, getDocs } = window.firestoreFns;
  try {
    const snapshot = await getDocs(collection(window.db, "posts"));
    const map = {};
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      if (!map[d.date]) map[d.date] = [];
      map[d.date].push({
        id: docSnap.id,
        text: d.text,
        done: d.done,
        color: d.color
      });
    });
    events = map;
    renderCalendar();
  } catch (err) {
    console.error("❌ 불러오기 실패:", err);
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  await checkPasswordAndStartApp(); // ✅ 비밀번호 확인 후 달력 로딩
});
