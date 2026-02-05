/**
 * Task Manager — локальный портал с Trello-механикой и сферами
 * Данные: localStorage + экспорт/импорт JSON
 */

const STORAGE_KEY = 'taskmanager-data';
const STATUSES = ['backlog', 'todo', 'in-progress', 'done'];
const PRIORITIES = [
  { value: 'low', label: 'Низкий' },
  { value: 'medium', label: 'Средний' },
  { value: 'high', label: 'Высокий' },
  { value: 'critical', label: 'Критикал' },
];
const MENTAL_WEIGHTS = [
  { value: 'light', label: 'Лёгкая' },
  { value: 'medium', label: 'Средняя' },
  { value: 'heavy', label: 'Тяжёлая' },
];

const DEFAULT_SPHERE_IDS = { work: 'sphere-work', life: 'sphere-life' };
const VALID_PRIORITIES = PRIORITIES.map((p) => p.value);
const VALID_MENTAL_WEIGHTS = MENTAL_WEIGHTS.map((w) => w.value);
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const POPOVER_PADDING = 16;
const POPOVER_WIDTH = 260;
const POPOVER_HEIGHT = 220;
const POPOVER_OFFSET_H = 12;
const POPOVER_OFFSET_V = 8;
const INBOX_TIMER_MINUTES = 15;
const INBOX_TIP_THRESHOLD = 5;
const STALE_DAYS = 7;

/** Спусковые крючки «Что мне надо сделать?» — 6 разделов по майнд-карте */
const TRIGGER_GRAPH = [
  {
    id: 'zdorovie',
    label: 'Здоровье',
    children: [
      {
        id: 'zdorovie-med',
        label: 'Медицина',
        children: [
          { id: 'zdorovie-med-stomat', label: 'Стоматолог' },
          { id: 'zdorovie-med-osmotr', label: 'Медосмотр' },
          { id: 'zdorovie-med-lek', label: 'Лекарства' },
          { id: 'zdorovie-med-vit', label: 'Витамины' },
        ],
      },
      { id: 'zdorovie-dieta', label: 'Диета / питание' },
      { id: 'zdorovie-sport', label: 'Спорт' },
    ],
  },
  {
    id: 'semya',
    label: 'Семья',
    children: [
      { id: 'semya-muzh-zhena', label: 'Муж / жена' },
      {
        id: 'semya-deti',
        label: 'Дети',
        children: [
          { id: 'semya-deti-shkola', label: 'Школа' },
          { id: 'semya-deti-sad', label: 'Детский сад' },
        ],
      },
      { id: 'semya-obesh', label: 'Обещания' },
    ],
  },
  {
    id: 'dom-dacha',
    label: 'Дом / дача',
    children: [
      { id: 'dom-remont', label: 'Ремонт' },
      {
        id: 'dom-uborka',
        label: 'Уборка',
        children: [
          { id: 'dom-uborka-garazh', label: 'Гараж' },
          { id: 'dom-uborka-balkon', label: 'Балкон' },
          { id: 'dom-uborka-antresol', label: 'Антресоль' },
        ],
      },
      { id: 'dom-interer', label: 'Интерьер' },
      { id: 'dom-pokupki', label: 'Крупные покупки' },
    ],
  },
  {
    id: 'lichnaya-zhizn',
    label: 'Личная жизнь',
    children: [
      {
        id: 'lich-pokupki', label: 'Покупки / затраты',
        children: [
          { id: 'lich-pokupki-nalogi', label: 'Налоги' },
          { id: 'lich-pokupki-kommunalka', label: 'Комуналка' },
          { id: 'lich-pokupki-arenda', label: 'Аренда' },
        ],
      },
      {
        id: 'lich-dengi', label: 'Деньги',
        children: [
          { id: 'lich-dengi-veschi', label: 'Вещи' },
          { id: 'lich-dengi-dolgi', label: 'Долги' },
        ],
      },
      { id: 'lich-info', label: 'Информация' },
      {
        id: 'lich-prazdniki', label: 'Праздники',
        children: [
          { id: 'lich-prazdniki-dr', label: 'Дни рождения' },
          { id: 'lich-prazdniki-daty', label: 'Памятные даты' },
        ],
      },
      {
        id: 'lich-avto', label: 'Автомобиль',
        children: [
          { id: 'lich-avto-remont', label: 'Ремонт' },
          { id: 'lich-avto-obsluzh', label: 'Обслуживание' },
          { id: 'lich-avto-pokupka', label: 'Покупка / продажа' },
        ],
      },
      { id: 'lich-aksessuary', label: 'Аксессуары / экипировка' },
      {
        id: 'lich-hobbi', label: 'Хобби',
        children: [
          { id: 'lich-hobbi-vstrechi', label: 'Встречи' },
          { id: 'lich-hobbi-idei', label: 'Идеи' },
        ],
      },
      {
        id: 'lich-pets', label: 'Домашние животные',
        children: [
          { id: 'lich-pets-korm', label: 'Корм' },
          { id: 'lich-pets-privivki', label: 'Прививки' },
        ],
      },
    ],
  },
  {
    id: 'ucheba',
    label: 'Учёба',
    children: [
      {
        id: 'ucheba-lek', label: 'Лекции',
        children: [
          { id: 'ucheba-lek-zapis', label: 'Запись' },
          { id: 'ucheba-lek-konspekt', label: 'Конспект' },
        ],
      },
      {
        id: 'ucheba-dz', label: 'Домашние задания',
        children: [
          { id: 'ucheba-dz-sdelat', label: 'Сделать' },
          { id: 'ucheba-dz-proverit', label: 'Проверить' },
          { id: 'ucheba-dz-spisat', label: 'Списать' },
        ],
      },
      {
        id: 'ucheba-exam', label: 'Экзамены / зачёты',
        children: [
          { id: 'ucheba-exam-voprosy', label: 'Список вопросов' },
          { id: 'ucheba-exam-litera', label: 'Список литературы' },
          { id: 'ucheba-exam-otvety', label: 'Ответы предыдущих курсов' },
          { id: 'ucheba-exam-otguly', label: 'Отгулы и больничные' },
        ],
      },
      { id: 'ucheba-stati', label: 'Статьи / конференции' },
      { id: 'ucheba-praktika', label: 'Практика' },
    ],
  },
  {
    id: 'rabota',
    label: 'Работа',
    children: [
      {
        id: 'rabota-ludi', label: 'Люди',
        children: [
          { id: 'rabota-ludi-kolleghi', label: 'Коллеги' },
          { id: 'rabota-ludi-rukovoditel', label: 'Руководитель' },
          { id: 'rabota-ludi-klienty', label: 'Клиенты' },
        ],
      },
      {
        id: 'rabota-proekty', label: 'Проекты',
        children: [
          { id: 'rabota-proekty-zapustit', label: 'Запустить' },
          { id: 'rabota-proekty-zavershit', label: 'Завершить' },
          { id: 'rabota-proekty-podumat', label: 'Подумать' },
          { id: 'rabota-proekty-problemy', label: 'Нерешённые проблемы' },
        ],
      },
      {
        id: 'rabota-obsh', label: 'Общение',
        children: [
          { id: 'rabota-obsh-pochta', label: 'Почта' },
          { id: 'rabota-obsh-socseti', label: 'Соцсети' },
          {
            id: 'rabota-obsh-vstrechi',
            label: 'Встречи',
            children: [
              { id: 'rabota-vstrechi-naznachit', label: 'Назначить' },
              { id: 'rabota-vstrechi-otmenit', label: 'Отменить' },
              { id: 'rabota-vstrechi-podgotovit', label: 'Подготовиться' },
            ],
          },
        ],
      },
      { id: 'rabota-napominaniya', label: 'Напоминания' },
      {
        id: 'rabota-zadachi', label: 'Задачи',
        children: [
          { id: 'rabota-zadachi-vypolnit', label: 'Выполнить' },
          { id: 'rabota-zadachi-proverit', label: 'Проверить' },
          { id: 'rabota-zadachi-napomnit', label: 'Напомнить' },
        ],
      },
      {
        id: 'rabota-docs', label: 'Документы',
        children: [
          { id: 'rabota-docs-taimshity', label: 'Тайм-шиты' },
          { id: 'rabota-docs-otchety', label: 'Отчёты' },
          { id: 'rabota-docs-obzor', label: 'Оценка / обзор / ревью' },
        ],
      },
      {
        id: 'rabota-profrost', label: 'Профессиональный рост',
        children: [
          { id: 'rabota-profrost-treningi', label: 'Тренинги' },
          { id: 'rabota-profrost-seminary', label: 'Семинары' },
          { id: 'rabota-profrost-stati', label: 'Статьи / книги' },
        ],
      },
    ],
  },
];

function uid() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateOnly(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** @typedef {{ id: string, name: string, order: number, notes: { id: string, text: string, createdAt: string }[] }} Sphere */
/** @typedef {{ id: string, text: string, done: boolean }} Subtask */
/** @typedef {{ id: string, title: string, description: string, status: string, priority: string, mentalWeight: string, sphereId: string, dueDate: string|null, createdAt: string, updatedAt: string, notes: { id: string, text: string, createdAt: string }[], subtasks: Subtask[] }} Task */

/** @type {Sphere[]} */
let spheres = [];
/** @type {Task[]} */
let tasks = [];
/** @type {string|null} */
let currentSphereId = null;
/** @type {{ id: string, text: string, createdAt: string }[]} */
let inbox = [];
/** @type {string|null} ISO date (YYYY-MM-DD) когда инбокс последний раз опустел */
let inboxEmptySince = null;

function getDefaultSpheres() {
  return [
    { id: DEFAULT_SPHERE_IDS.work, name: 'Работа', order: 0, notes: [] },
    { id: DEFAULT_SPHERE_IDS.life, name: 'Жизнь', order: 1, notes: [] },
  ];
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      spheres = Array.isArray(data.spheres) && data.spheres.length > 0
        ? data.spheres.map(normalizeSphere)
        : getDefaultSpheres();
      tasks = Array.isArray(data.tasks) ? data.tasks.map((t) => normalizeTask(t, spheres[0]?.id)) : [];
      if (!currentSphereId || !spheres.some((s) => s.id === currentSphereId)) {
        currentSphereId = spheres[0]?.id ?? null;
      }
      inbox = Array.isArray(data.inbox) ? data.inbox.map(normalizeInboxItem) : [];
      inboxEmptySince = data.inboxEmptySince && DATE_ONLY_REGEX.test(data.inboxEmptySince) ? data.inboxEmptySince : null;
      return;
    }
  } catch (_) {}
  spheres = getDefaultSpheres();
  tasks = [];
  currentSphereId = spheres[0]?.id ?? null;
  inbox = [];
  inboxEmptySince = null;
}

function normalizeInboxItem(i) {
  return {
    id: i.id ?? uid(),
    text: String(i.text ?? '').trim() || 'Без текста',
    createdAt: i.createdAt ?? nowISO(),
  };
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    spheres,
    tasks,
    inbox,
    inboxEmptySince,
    exportedAt: nowISO(),
  }));
}

function normalizeSphere(s) {
  return {
    id: s.id ?? uid(),
    name: String(s.name ?? 'Сфера').trim() || 'Сфера',
    order: typeof s.order === 'number' ? s.order : 0,
    notes: Array.isArray(s.notes)
      ? s.notes.map((n) => ({
          id: n.id ?? uid(),
          text: String(n.text ?? ''),
          createdAt: n.createdAt ?? nowISO(),
        }))
      : [],
  };
}

function normalizeTask(t, defaultSphereId) {
  const sphereId = t.sphereId && spheres.some((s) => s.id === t.sphereId) ? t.sphereId : (defaultSphereId || spheres[0]?.id);
  return {
    id: t.id ?? uid(),
    title: String(t.title ?? 'Без названия'),
    description: String(t.description ?? ''),
    status: STATUSES.includes(t.status) ? t.status : 'backlog',
    priority: VALID_PRIORITIES.includes(t.priority) ? t.priority : 'medium',
    mentalWeight: VALID_MENTAL_WEIGHTS.includes(t.mentalWeight) ? t.mentalWeight : 'medium',
    sphereId,
    dueDate: t.dueDate && DATE_ONLY_REGEX.test(t.dueDate) ? t.dueDate : null,
    createdAt: t.createdAt ?? nowISO(),
    updatedAt: t.updatedAt ?? nowISO(),
    notes: Array.isArray(t.notes)
      ? t.notes.map((n) => ({
          id: n.id ?? uid(),
          text: String(n.text ?? ''),
          createdAt: n.createdAt ?? nowISO(),
        }))
      : [],
    subtasks: Array.isArray(t.subtasks)
      ? t.subtasks.map((s) => ({
          id: s.id ?? uid(),
          text: String(s.text ?? '').trim() || 'Шажок',
          done: Boolean(s.done),
        }))
      : [],
  };
}

function exportJSON() {
  const data = {
    spheres,
    tasks,
    inbox,
    inboxEmptySince,
    exportedAt: nowISO(),
    version: 2,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taskmanager-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        spheres = Array.isArray(data.spheres) && data.spheres.length > 0
          ? data.spheres.map(normalizeSphere)
          : getDefaultSpheres();
        const defaultSphereId = spheres[0]?.id;
        tasks = Array.isArray(data.tasks) ? data.tasks.map((t) => normalizeTask(t, defaultSphereId)) : [];
        if (!currentSphereId || !spheres.some((s) => s.id === currentSphereId)) {
          currentSphereId = spheres[0]?.id ?? null;
        }
        inbox = Array.isArray(data.inbox) ? data.inbox.map(normalizeInboxItem) : [];
        inboxEmptySince = data.inboxEmptySince && DATE_ONLY_REGEX.test(data.inboxEmptySince) ? data.inboxEmptySince : null;
        saveToStorage();
        renderTabs();
        renderSphereNotes();
        renderBoard();
        updateInboxBadge();
        updateBoardTip();
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

function getCurrentSphere() {
  return spheres.find((s) => s.id === currentSphereId) ?? null;
}

/** Задачи текущей сферы в Todo/In Progress, не обновлявшиеся STALE_DAYS дней (идея Дорофеева: «зависание»). */
function getStaleTasksCount() {
  if (!currentSphereId) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);
  const cutoffISO = cutoff.toISOString();
  return tasks.filter(
    (t) =>
      t.sphereId === currentSphereId &&
      (t.status === 'todo' || t.status === 'in-progress') &&
      t.updatedAt < cutoffISO
  ).length;
}

/** Подсказки-микросаммари в контексте: переполненный инбокс, зависшие задачи, тяжёлые без шажков. */
function updateBoardTip() {
  const el = document.getElementById('board-tip-text');
  if (!el) return;
  if (inbox.length >= INBOX_TIP_THRESHOLD) {
    el.textContent = 'Переполненный инбокс — разбирайте блоками по 10–15 мин, по одной записи (идея Дорофеева).';
    return;
  }
  const staleCount = getStaleTasksCount();
  if (staleCount > 0) {
    el.textContent = 'Задачи давно в списке? Разбейте на шажки или пересмотрите приоритет — иначе они «зависают».';
    return;
  }
  el.textContent = 'Тяжёлые по мысленной нагрузке задачи лучше делать блоками в наиболее ресурсное время дня.';
}

// ——— Инбокс ———

function addToInbox(text) {
  const trimmed = String(text).trim();
  if (!trimmed) return;
  inbox.push({ id: uid(), text: trimmed, createdAt: nowISO() });
  inboxEmptySince = null;
  saveToStorage();
  updateInboxBadge();
}

function removeFromInbox(id) {
  inbox = inbox.filter((item) => item.id !== id);
  if (inbox.length === 0) {
    inboxEmptySince = new Date().toISOString().slice(0, 10);
    saveToStorage();
  } else {
    saveToStorage();
  }
  updateInboxBadge();
}

function getInboxStreak() {
  if (inbox.length > 0) return 0;
  if (!inboxEmptySince) return 0;
  const from = new Date(inboxEmptySince);
  const to = new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(0, 0, 0, 0);
  const diff = Math.floor((to - from) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function updateInboxBadge() {
  const badge = document.getElementById('inbox-badge');
  const btnEmpty = document.getElementById('btn-empty-inbox');
  if (!badge || !btnEmpty) return;
  if (inbox.length === 0) {
    badge.hidden = true;
    btnEmpty.disabled = true;
  } else {
    badge.hidden = false;
    badge.textContent = String(inbox.length);
    btnEmpty.disabled = false;
  }
  updateBoardTip();
}

function openInboxQuickPopover() {
  const popover = document.getElementById('inbox-quick-popover');
  const input = document.getElementById('inbox-quick-input');
  if (!popover || !input) return;
  popover.hidden = false;
  input.value = '';
  input.focus();
}

function closeInboxQuickPopover() {
  const popover = document.getElementById('inbox-quick-popover');
  if (popover) popover.hidden = true;
}

function submitInboxQuick() {
  const input = document.getElementById('inbox-quick-input');
  if (!input) return;
  addToInbox(input.value);
  input.value = '';
  closeInboxQuickPopover();
}

// Режим «Опустошить инбокс»: таймер в минутах, текущий индекс
let inboxEmptyTimerId = null;
let inboxEmptyTimerEnd = 0;
let inboxEmptyIndex = 0;

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function startInboxEmptyTimer() {
  stopInboxEmptyTimer();
  const el = document.getElementById('inbox-empty-timer');
  if (!el) return;
  inboxEmptyTimerEnd = Date.now() + INBOX_TIMER_MINUTES * 60 * 1000;
  function tick() {
    const left = Math.max(0, Math.ceil((inboxEmptyTimerEnd - Date.now()) / 1000));
    if (left <= 0) {
      el.textContent = 'Время вышло. Можно закрыть и продолжить позже.';
      stopInboxEmptyTimer();
      return;
    }
    const m = Math.floor(left / 60);
    const s = left % 60;
    el.textContent = `Осталось ${m}:${String(s).padStart(2, '0')}`;
    inboxEmptyTimerId = setTimeout(tick, 1000);
  }
  tick();
}

function stopInboxEmptyTimer() {
  if (inboxEmptyTimerId) {
    clearTimeout(inboxEmptyTimerId);
    inboxEmptyTimerId = null;
  }
}

function openEmptyInboxOverlay() {
  if (inbox.length === 0) return;
  const overlay = document.getElementById('inbox-empty-overlay');
  const card = document.getElementById('inbox-empty-card');
  const done = document.getElementById('inbox-empty-done');
  const microtip = document.getElementById('inbox-empty-microtip');
  if (!overlay || !card || !done) return;
  overlay.hidden = false;
  card.hidden = false;
  done.hidden = true;
  if (microtip) {
    if (inbox.length >= INBOX_TIP_THRESHOLD) {
      microtip.textContent = 'Разбирайте по одной записи, не откладывая — так инбокс не переполняется (Дорофеев).';
      microtip.hidden = false;
    } else {
      microtip.hidden = true;
    }
  }
  inboxEmptyIndex = 0;
  startInboxEmptyTimer();
  updateInboxEmptyStreakLabel();
  showCurrentInboxItem();
}

function closeEmptyInboxOverlay() {
  const overlay = document.getElementById('inbox-empty-overlay');
  if (overlay) overlay.hidden = true;
  stopInboxEmptyTimer();
}

function updateInboxEmptyStreakLabel() {
  const streakEl = document.getElementById('inbox-empty-streak');
  if (!streakEl) return;
  const streak = getInboxStreak();
  if (inbox.length === 0 && streak > 0) {
    streakEl.textContent = `Инбокс пуст ${streak} ${pluralDays(streak)} подряд`;
    streakEl.hidden = false;
  } else {
    streakEl.hidden = true;
  }
}

function pluralDays(n) {
  if (n === 1) return 'день';
  if (n >= 2 && n <= 4) return 'дня';
  return 'дней';
}

function showCurrentInboxItem() {
  const textEl = document.getElementById('inbox-empty-text');
  const counterEl = document.getElementById('inbox-empty-counter');
  const card = document.getElementById('inbox-empty-card');
  const done = document.getElementById('inbox-empty-done');
  const doneStreak = document.getElementById('inbox-empty-done-streak');
  if (!textEl || !counterEl || !card || !done) return;
  if (inbox.length === 0) {
    card.hidden = true;
    done.hidden = false;
    const streak = getInboxStreak();
    if (doneStreak) {
      doneStreak.textContent = streak > 0 ? `Инбокс пуст ${streak} ${pluralDays(streak)} подряд` : 'Отличная работа!';
    }
    stopInboxEmptyTimer();
    document.getElementById('inbox-empty-timer').textContent = '';
    return;
  }
  const item = inbox[0];
  textEl.textContent = item.text;
  counterEl.textContent = `Осталось записей: ${inbox.length}`;
}

function processInboxToTask(item) {
  const sphereId = currentSphereId ?? spheres[0]?.id;
  if (!sphereId) return;
  const task = {
    id: uid(),
    title: item.text,
    description: '',
    status: 'backlog',
    priority: 'medium',
    mentalWeight: 'medium',
    sphereId,
    dueDate: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    notes: [],
    subtasks: [],
  };
  tasks.push(task);
  removeFromInbox(item.id);
  saveToStorage();
  renderBoard();
}

function processInboxToNote(item) {
  const sphere = getCurrentSphere();
  if (!sphere) return;
  sphere.notes = sphere.notes ?? [];
  sphere.notes.push({ id: uid(), text: item.text, createdAt: nowISO() });
  removeFromInbox(item.id);
  saveToStorage();
  renderSphereNotes();
}

function processInboxToCalendar(item) {
  const sphereId = currentSphereId ?? spheres[0]?.id;
  if (!sphereId) return;
  const task = {
    id: uid(),
    title: item.text,
    description: '',
    status: 'backlog',
    priority: 'medium',
    mentalWeight: 'medium',
    sphereId,
    dueDate: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    notes: [],
    subtasks: [],
  };
  tasks.push(task);
  removeFromInbox(item.id);
  saveToStorage();
  renderBoard();
  openTaskModal(task.id);
  showCurrentInboxItem();
}

function processInboxToTrash(item) {
  removeFromInbox(item.id);
}

function onInboxEmptyAction(action) {
  if (inbox.length === 0) return;
  const item = inbox[0];
  if (action === 'task') {
    processInboxToTask(item);
    showCurrentInboxItem();
  } else if (action === 'note') {
    processInboxToNote(item);
    showCurrentInboxItem();
  } else if (action === 'calendar') {
    processInboxToCalendar(item);
  } else if (action === 'trash') {
    processInboxToTrash(item);
    showCurrentInboxItem();
  }
}

function renderTabs() {
  const list = document.getElementById('tabs-list');
  if (!list) return;
  list.innerHTML = '';
  const sorted = [...spheres].sort((a, b) => a.order - b.order);
  sorted.forEach((sphere) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tabs__tab';
    if (sphere.id === currentSphereId) btn.classList.add('tabs__tab--active');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', sphere.id === currentSphereId ? 'true' : 'false');
    btn.dataset.sphereId = sphere.id;
    btn.textContent = sphere.name;
    btn.addEventListener('click', () => switchSphere(sphere.id));
    list.appendChild(btn);
  });
}

function switchSphere(sphereId) {
  if (!spheres.some((s) => s.id === sphereId)) return;
  currentSphereId = sphereId;
  document.querySelectorAll('.tabs__tab').forEach((tab) => {
    const isActive = tab.dataset.sphereId === sphereId;
    tab.classList.toggle('tabs__tab--active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.body.dataset.sphere = sphereId === DEFAULT_SPHERE_IDS.life ? 'life' : 'work';
  renderSphereNotes();
  renderBoard();
  updateBoardTip();
}

/** Создаёт DOM-элемент одной заметки (DRY для сферы и задачи). */
function createNoteItem(note, deleteAriaLabel, onDelete) {
  const item = document.createElement('div');
  item.className = 'note-item';
  const content = document.createElement('div');
  content.className = 'note-item__content';
  const text = document.createElement('div');
  text.className = 'note-item__text';
  text.textContent = note.text;
  const date = document.createElement('div');
  date.className = 'note-item__date';
  date.textContent = formatDate(note.createdAt);
  content.appendChild(text);
  content.appendChild(date);
  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'note-item__delete btn btn--ghost';
  delBtn.setAttribute('aria-label', deleteAriaLabel);
  delBtn.textContent = '×';
  delBtn.dataset.noteId = note.id;
  delBtn.addEventListener('click', () => onDelete(note.id));
  item.appendChild(content);
  item.appendChild(delBtn);
  return item;
}

function renderSphereNotes() {
  const list = document.getElementById('sphere-notes-list');
  const sphere = getCurrentSphere();
  if (!list) return;
  list.innerHTML = '';
  if (!sphere) return;
  if (!sphere.notes?.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-notes';
    empty.textContent = 'Пока нет заметок сферы.';
    list.appendChild(empty);
    return;
  }
  const sorted = [...sphere.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach((note) => list.appendChild(createNoteItem(note, 'Удалить заметку', deleteSphereNote)));
  document.getElementById('sphere-note-text').value = '';
}

function deleteSphereNote(noteId) {
  const sphere = getCurrentSphere();
  if (!sphere?.notes) return;
  sphere.notes = sphere.notes.filter((n) => n.id !== noteId);
  saveToStorage();
  renderSphereNotes();
}

function addSphereNote() {
  const sphere = getCurrentSphere();
  if (!sphere) return;
  const textarea = document.getElementById('sphere-note-text');
  const text = textarea.value.trim();
  if (!text) return;
  sphere.notes = sphere.notes ?? [];
  sphere.notes.push({ id: uid(), text, createdAt: nowISO() });
  textarea.value = '';
  saveToStorage();
  renderSphereNotes();
}

function openAddSphereModal() {
  document.getElementById('add-sphere-name').value = '';
  document.getElementById('modal-add-sphere').hidden = false;
  document.getElementById('add-sphere-name').focus();
}

function closeAddSphereModal() {
  document.getElementById('modal-add-sphere').hidden = true;
}

function createSphereFromModal() {
  const name = document.getElementById('add-sphere-name').value.trim() || 'Новая сфера';
  const maxOrder = spheres.length ? Math.max(...spheres.map((s) => s.order)) : -1;
  const sphere = {
    id: uid(),
    name,
    order: maxOrder + 1,
    notes: [],
  };
  spheres.push(sphere);
  saveToStorage();
  renderTabs();
  switchSphere(sphere.id);
  if (currentTriggersSectionId) renderTriggerList(currentTriggersSectionId);
  closeAddSphereModal();
}

function renderBoard() {
  const sphereId = currentSphereId;
  const list = sphereId ? tasks.filter((t) => t.sphereId === sphereId) : [];
  for (const status of STATUSES) {
    const container = document.querySelector(`[data-column="${status}"]`);
    if (!container) continue;
    container.innerHTML = '';
    const byStatus = list.filter((t) => t.status === status);
    byStatus.forEach((task) => container.appendChild(createCard(task)));
  }
  updateBoardTip();
}

function setupColumnDrop(container, status) {
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.classList.add('column__cards--drag-over');
  });
  container.addEventListener('dragleave', (e) => {
    if (!container.contains(e.relatedTarget)) container.classList.remove('column__cards--drag-over');
  });
  container.addEventListener('drop', (e) => {
    e.preventDefault();
    container.classList.remove('column__cards--drag-over');
    const id = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.id === id);
    if (task && task.sphereId === currentSphereId && task.status !== status) {
      task.status = status;
      task.updatedAt = nowISO();
      saveToStorage();
      renderBoard();
    }
  });
}

function createCard(task) {
  const wrap = document.createElement('article');
  wrap.className = 'card glass';
  wrap.dataset.taskId = task.id;
  wrap.setAttribute('role', 'button');
  wrap.tabIndex = 0;
  wrap.setAttribute('aria-label', `Задача: ${task.title}`);

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = task.title || 'Без названия';

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  const priorityLabel = document.createElement('span');
  priorityLabel.className = 'card__meta-label';
  priorityLabel.textContent = 'Приор.:';
  meta.appendChild(priorityLabel);
  const prioritySpan = document.createElement('span');
  prioritySpan.className = `priority priority--${task.priority}`;
  prioritySpan.textContent = PRIORITIES.find((p) => p.value === task.priority)?.label ?? task.priority;
  meta.appendChild(prioritySpan);
  const weightLabel = document.createElement('span');
  weightLabel.className = 'card__meta-label';
  weightLabel.textContent = 'Сложн.:';
  meta.appendChild(weightLabel);
  const weight = task.mentalWeight ?? 'medium';
  const weightSpan = document.createElement('span');
  weightSpan.className = `mental-weight mental-weight--${weight}`;
  weightSpan.textContent = MENTAL_WEIGHTS.find((w) => w.value === weight)?.label ?? weight;
  meta.appendChild(weightSpan);
  if (task.dueDate) {
    const due = document.createElement('span');
    due.className = 'card__due';
    due.textContent = `До ${formatDateOnly(task.dueDate)}`;
    meta.appendChild(due);
  }
  if (task.notes?.length) {
    const notesCount = document.createElement('span');
    notesCount.className = 'card__notes-count';
    notesCount.textContent = `Заметок: ${task.notes.length}`;
    meta.appendChild(notesCount);
  }
  const subtasks = task.subtasks ?? [];
  if (subtasks.length > 0) {
    const doneCount = subtasks.filter((s) => s.done).length;
    const stepSpan = document.createElement('span');
    stepSpan.className = 'card__steps-count';
    stepSpan.textContent = `Шажков: ${doneCount}/${subtasks.length}`;
    meta.appendChild(stepSpan);
  }

  wrap.appendChild(title);
  wrap.appendChild(meta);

  let justDragged = false;
  wrap.addEventListener('click', () => {
    if (!justDragged) openTaskModal(task.id);
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openTaskModal(task.id);
    }
  });

  wrap.draggable = true;
  wrap.dataset.taskId = task.id;
  wrap.addEventListener('dragstart', (e) => {
    justDragged = true;
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    wrap.classList.add('card--dragging');
  });
  wrap.addEventListener('dragend', () => {
    wrap.classList.remove('card--dragging');
    setTimeout(() => { justDragged = false; }, 0);
  });

  return wrap;
}

let currentTaskId = null;

function openTaskModal(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;
  currentTaskId = taskId;

  document.getElementById('detail-title').value = task.title;
  document.getElementById('detail-description').value = task.description;
  document.getElementById('detail-due-date').value = task.dueDate || '';
  document.getElementById('detail-priority').value = task.priority;
  document.getElementById('detail-mental-weight').value = task.mentalWeight ?? 'medium';
  document.getElementById('detail-status').value = task.status;

  const subtasksBlock = document.getElementById('task-detail-subtasks');
  const summaryEl = document.getElementById('task-detail-subtasks-summary');
  const weight = task.mentalWeight ?? 'medium';
  const subtasks = task.subtasks ?? [];
  const isBigWithoutSteps = (weight === 'medium' || weight === 'heavy') && subtasks.length === 0;
  if (subtasksBlock) {
    subtasksBlock.hidden = weight !== 'medium' && weight !== 'heavy';
  }
  if (summaryEl) {
    if (isBigWithoutSteps) {
      summaryEl.textContent = 'Слишком крупно? Один маленький первый шаг снижает сопротивление и запускает движение (Дорофеев).';
      summaryEl.hidden = false;
    } else {
      summaryEl.textContent = '';
      summaryEl.hidden = true;
    }
  }
  renderSubtasks(subtasks);
  document.getElementById('subtask-input').value = '';

  renderNotesList(task.notes);
  document.getElementById('note-text').value = '';

  const modal = document.getElementById('modal-task');
  modal.hidden = false;
  document.getElementById('detail-title').focus();
}

function renderSubtasks(subtasks) {
  const list = document.getElementById('subtasks-list');
  if (!list) return;
  list.innerHTML = '';
  subtasks.forEach((st) => {
    const li = document.createElement('li');
    li.className = 'subtasks-list__item';
    const label = document.createElement('label');
    label.className = 'subtasks-list__label';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = st.done;
    input.className = 'subtasks-list__checkbox';
    input.addEventListener('change', () => toggleSubtaskDone(st.id));
    const text = document.createElement('span');
    text.className = 'subtasks-list__text';
    text.textContent = st.text;
    if (st.done) text.classList.add('subtasks-list__text--done');
    label.appendChild(input);
    label.appendChild(text);
    li.appendChild(label);
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--ghost subtasks-list__delete';
    delBtn.setAttribute('aria-label', 'Удалить шажок');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => removeSubtask(st.id));
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function addSubtaskFromModal() {
  if (!currentTaskId) return;
  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task) return;
  const input = document.getElementById('subtask-input');
  const text = input?.value?.trim();
  if (!text) return;
  task.subtasks = task.subtasks ?? [];
  task.subtasks.push({ id: uid(), text, done: false });
  task.updatedAt = nowISO();
  input.value = '';
  saveToStorage();
  renderSubtasks(task.subtasks);
  renderBoard();
}

function removeSubtask(subtaskId) {
  if (!currentTaskId) return;
  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task?.subtasks) return;
  task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId);
  task.updatedAt = nowISO();
  saveToStorage();
  renderSubtasks(task.subtasks);
  renderBoard();
}

function toggleSubtaskDone(subtaskId) {
  if (!currentTaskId) return;
  const task = tasks.find((t) => t.id === currentTaskId);
  const st = task?.subtasks?.find((s) => s.id === subtaskId);
  if (!st) return;
  st.done = !st.done;
  task.updatedAt = nowISO();
  saveToStorage();
  renderSubtasks(task.subtasks);
  renderBoard();
}

function renderNotesList(notes) {
  const list = document.getElementById('notes-list');
  list.innerHTML = '';
  if (!notes?.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-notes';
    empty.textContent = 'Пока нет заметок.';
    list.appendChild(empty);
    return;
  }
  const sorted = [...notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  sorted.forEach((note) => list.appendChild(createNoteItem(note, 'Удалить заметку', deleteTaskNote)));
}

function deleteTaskNote(noteId) {
  if (!currentTaskId) return;
  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task?.notes) return;
  task.notes = task.notes.filter((n) => n.id !== noteId);
  task.updatedAt = nowISO();
  saveToStorage();
  renderNotesList(task.notes);
  renderBoard();
}

function closeTaskModal() {
  document.getElementById('modal-task').hidden = true;
  currentTaskId = null;
  const emptyOverlay = document.getElementById('inbox-empty-overlay');
  if (emptyOverlay && !emptyOverlay.hidden) showCurrentInboxItem();
}

function saveTaskFromModal() {
  if (!currentTaskId) return;
  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task) return;

  task.title = document.getElementById('detail-title').value.trim() || 'Без названия';
  task.description = document.getElementById('detail-description').value.trim();
  const dueVal = document.getElementById('detail-due-date').value;
  task.dueDate = dueVal && DATE_ONLY_REGEX.test(dueVal) ? dueVal : null;
  task.priority = document.getElementById('detail-priority').value;
  task.mentalWeight = document.getElementById('detail-mental-weight').value;
  task.status = document.getElementById('detail-status').value;
  task.updatedAt = nowISO();

  saveToStorage();
  renderBoard();
  closeTaskModal();
}

function deleteTaskFromModal() {
  if (!currentTaskId) return;
  if (!confirm('Удалить эту задачу?')) return;
  tasks = tasks.filter((t) => t.id !== currentTaskId);
  saveToStorage();
  renderBoard();
  closeTaskModal();
}

function addNoteFromModal() {
  if (!currentTaskId) return;
  const textarea = document.getElementById('note-text');
  const text = textarea.value.trim();
  if (!text) return;

  const task = tasks.find((t) => t.id === currentTaskId);
  if (!task) return;
  task.notes = task.notes ?? [];
  task.notes.push({ id: uid(), text, createdAt: nowISO() });
  task.updatedAt = nowISO();

  textarea.value = '';
  renderNotesList(task.notes);
  saveToStorage();
  renderBoard();
}

function openAddModal(initialStatus) {
  document.getElementById('add-title').value = '';
  document.getElementById('add-description').value = '';
  document.getElementById('add-due-date').value = '';
  document.getElementById('add-priority').value = 'medium';
  document.getElementById('add-mental-weight').value = 'medium';
  document.getElementById('add-status').value = initialStatus;
  document.getElementById('modal-add').hidden = false;
  document.getElementById('add-title').focus();
}

function closeAddModal() {
  document.getElementById('modal-add').hidden = true;
}

function createTaskFromModal() {
  const title = document.getElementById('add-title').value.trim() || 'Без названия';
  const description = document.getElementById('add-description').value.trim();
  const dueVal = document.getElementById('add-due-date').value;
  const dueDate = dueVal && DATE_ONLY_REGEX.test(dueVal) ? dueVal : null;
  const priority = document.getElementById('add-priority').value;
  const mentalWeight = document.getElementById('add-mental-weight').value;
  const status = document.getElementById('add-status').value;
  const sphereId = currentSphereId ?? spheres[0]?.id;

  const task = {
    id: uid(),
    title,
    description,
    status,
    priority,
    mentalWeight: VALID_MENTAL_WEIGHTS.includes(mentalWeight) ? mentalWeight : 'medium',
    sphereId,
    dueDate,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    notes: [],
    subtasks: [],
  };
  tasks.push(task);
  saveToStorage();
  renderBoard();
  closeAddModal();
}

/** id выбранного раздела в оверлее спусковых крючков: null = выбор раздела, иначе граф */
let currentTriggersSectionId = null;

function openTriggersOverlay() {
  const overlay = document.getElementById('triggers-overlay');
  if (!overlay) return;
  overlay.hidden = false;
  hideTriggersPopover();
  showTriggersGraph('zdorovie');
}

function closeTriggersOverlay() {
  const overlay = document.getElementById('triggers-overlay');
  const popover = document.getElementById('triggers-popover');
  if (overlay) overlay.hidden = true;
  if (popover) popover.hidden = true;
  currentTriggersSectionId = null;
}

function openSettingsOverlay() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.hidden = false;
}

function closeSettingsOverlay() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.hidden = true;
}

function showTriggersSectionChoice() {
  const choose = document.getElementById('triggers-choose');
  const contentWrap = document.getElementById('triggers-content-wrap');
  const backBtn = document.getElementById('triggers-overlay-back');
  const subtitle = document.getElementById('triggers-overlay-subtitle');
  if (choose) choose.hidden = false;
  if (contentWrap) contentWrap.hidden = true;
  if (backBtn) backBtn.hidden = true;
  if (subtitle) subtitle.textContent = 'Выберите раздел — откроется список триггеров. Клик по пункту: добавить задачу в сферу.';
}

function showTriggersGraph(sectionId) {
  const root = TRIGGER_GRAPH.find((r) => r.id === sectionId);
  if (!root) return;
  currentTriggersSectionId = sectionId;
  const choose = document.getElementById('triggers-choose');
  const contentWrap = document.getElementById('triggers-content-wrap');
  const backBtn = document.getElementById('triggers-overlay-back');
  const subtitle = document.getElementById('triggers-overlay-subtitle');
  if (choose) choose.hidden = true;
  if (contentWrap) contentWrap.hidden = false;
  if (backBtn) backBtn.hidden = false;
  if (subtitle) subtitle.textContent = `Раздел «${root.label}». Клик по пункту — добавить задачу в сферу.`;
  renderTriggerList(sectionId);
}

function backToTriggersSectionChoice() {
  currentTriggersSectionId = null;
  hideTriggersPopover();
  showTriggersSectionChoice();
  const list = document.getElementById('triggers-list');
  if (list) list.innerHTML = '';
}

/** Рекурсивно создаёт пункт списка (кнопка + вложенный ul при наличии children) */
function createTriggerListItem(item) {
  const li = document.createElement('li');
  li.className = 'triggers-list__li';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'triggers-list__item';
  btn.textContent = item.label;
  btn.dataset.label = item.label;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showTriggersPopover(btn, item.label);
  });
  li.appendChild(btn);
  if (item.children?.length) {
    const ul = document.createElement('ul');
    ul.className = 'triggers-list__ul';
    item.children.forEach((child) => ul.appendChild(createTriggerListItem(child)));
    li.appendChild(ul);
  }
  return li;
}

/** Иерархический список триггеров: заголовок раздела + нумерованный список (до 3 уровней) */
function renderTriggerList(sectionId) {
  const root = TRIGGER_GRAPH.find((r) => r.id === sectionId);
  if (!root) return;
  const container = document.getElementById('triggers-list');
  if (!container) return;
  container.innerHTML = '';
  const title = document.createElement('h3');
  title.className = 'triggers-list__section-title';
  title.textContent = root.label;
  container.appendChild(title);
  const ol = document.createElement('ol');
  ol.className = 'triggers-list__ol';
  (root.children || []).forEach((item) => ol.appendChild(createTriggerListItem(item)));
  container.appendChild(ol);
}

/** Позиционирует popover внутри content, не вылезая за границы. */
function positionPopover(popoverEl, anchorRect, contentRect) {
  let left = anchorRect.right - contentRect.left + POPOVER_OFFSET_H;
  let top = anchorRect.top - contentRect.top;
  if (left + POPOVER_WIDTH > contentRect.width - POPOVER_PADDING) {
    left = anchorRect.left - contentRect.left - POPOVER_WIDTH - POPOVER_OFFSET_H;
  }
  if (left < POPOVER_PADDING) left = POPOVER_PADDING;
  if (top + POPOVER_HEIGHT > contentRect.height - POPOVER_PADDING) {
    top = anchorRect.bottom - contentRect.top - POPOVER_HEIGHT - POPOVER_OFFSET_V;
  }
  if (top < POPOVER_PADDING) top = POPOVER_PADDING;
  popoverEl.style.left = `${left}px`;
  popoverEl.style.top = `${top}px`;
}

function showTriggersPopover(anchorElement, label) {
  const popover = document.getElementById('triggers-popover');
  const labelEl = document.getElementById('triggers-popover-label');
  const input = document.getElementById('triggers-popover-input');
  const select = document.getElementById('triggers-popover-sphere');
  if (!popover || !labelEl || !input || !select) return;
  labelEl.textContent = label;
  input.value = '';
  select.innerHTML = '';
  const sortedSpheres = [...spheres].sort((a, b) => a.order - b.order);
  sortedSpheres.forEach((s) => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
  popover.hidden = false;
  const content = document.querySelector('.triggers-overlay__content');
  if (anchorElement && content) {
    const rect = anchorElement.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    positionPopover(popover, rect, contentRect);
  } else {
    popover.style.left = '50%';
    popover.style.top = '40%';
  }
  input.focus();
}

function hideTriggersPopover() {
  const popover = document.getElementById('triggers-popover');
  if (popover) popover.hidden = true;
}

function submitTriggersPopover() {
  const input = document.getElementById('triggers-popover-input');
  const select = document.getElementById('triggers-popover-sphere');
  if (!input || !select) return;
  const text = input.value.trim();
  if (!text) return;
  addTaskFromTrigger(text, select.value);
  hideTriggersPopover();
  renderBoard();
}

function addTaskFromTrigger(title, sphereId) {
  if (!spheres.some((s) => s.id === sphereId)) return;
  const task = {
    id: uid(),
    title: title.trim() || 'Без названия',
    description: '',
    status: 'backlog',
    priority: 'medium',
    mentalWeight: 'medium',
    sphereId,
    dueDate: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    notes: [],
    subtasks: [],
  };
  tasks.push(task);
  saveToStorage();
  renderBoard();
}

// ——— Календарь ———
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
let calendarSelectedDate = null;

function getTasksByDate(dateStr) {
  return tasks.filter((t) => t.dueDate === dateStr);
}

function getMonthName(month, year) {
  return new Date(year, month, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const titleEl = document.getElementById('calendar-overlay-title');
  if (!grid || !titleEl) return;
  titleEl.textContent = getMonthName(calendarMonth, calendarYear);
  const first = new Date(calendarYear, calendarMonth, 1);
  const last = new Date(calendarYear, calendarMonth + 1, 0);
  const startDay = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  grid.innerHTML = '';
  weekDays.forEach((d) => {
    const th = document.createElement('div');
    th.className = 'calendar-grid__weekday';
    th.textContent = d;
    grid.appendChild(th);
  });
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'calendar-grid__day calendar-grid__day--empty';
    grid.appendChild(empty);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = getTasksByDate(dateStr).length;
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'calendar-grid__day';
    cell.textContent = day;
    cell.dataset.date = dateStr;
    if (count > 0) cell.classList.add('calendar-grid__day--has-tasks');
    if (calendarSelectedDate === dateStr) cell.classList.add('calendar-grid__day--selected');
    cell.addEventListener('click', () => selectCalendarDay(dateStr));
    grid.appendChild(cell);
  }
}

function selectCalendarDay(dateStr) {
  calendarSelectedDate = dateStr;
  renderCalendar();
  renderCalendarDayTasks(dateStr);
}

function renderCalendarDayTasks(dateStr) {
  const titleEl = document.getElementById('calendar-day-tasks-title');
  const listEl = document.getElementById('calendar-day-tasks-list');
  if (!titleEl || !listEl) return;
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : null;
  const dateLabel = d ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
  titleEl.textContent = dateStr ? `Задачи на ${dateLabel}` : 'Выберите день';
  listEl.innerHTML = '';
  if (!dateStr) return;
  const dayTasks = getTasksByDate(dateStr);
  dayTasks.forEach((task) => {
    const sphere = spheres.find((s) => s.id === task.sphereId);
    const li = document.createElement('li');
    li.className = 'calendar-day-tasks__item';
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'btn btn--ghost calendar-day-tasks__link';
    link.textContent = task.title;
    link.addEventListener('click', () => {
      closeCalendarOverlay();
      openTaskModal(task.id);
    });
    const sphereSpan = document.createElement('span');
    sphereSpan.className = 'calendar-day-tasks__sphere';
    sphereSpan.textContent = sphere?.name ?? task.sphereId;
    li.appendChild(link);
    li.appendChild(sphereSpan);
    listEl.appendChild(li);
  });
  if (dayTasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'calendar-day-tasks__empty';
    empty.textContent = 'Нет задач на эту дату';
    listEl.appendChild(empty);
  }
}

function openCalendarOverlay() {
  calendarMonth = new Date().getMonth();
  calendarYear = new Date().getFullYear();
  calendarSelectedDate = null;
  const overlay = document.getElementById('calendar-overlay');
  if (overlay) overlay.hidden = false;
  renderCalendar();
  renderCalendarDayTasks(null);
}

function closeCalendarOverlay() {
  const overlay = document.getElementById('calendar-overlay');
  if (overlay) overlay.hidden = true;
}

function setupModals() {
  document.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-close');
      if (id === 'modal-task') closeTaskModal();
      if (id === 'modal-add') closeAddModal();
      if (id === 'modal-add-sphere') closeAddSphereModal();
      const modal = document.getElementById(id);
      if (modal) modal.hidden = true;
    });
  });

  document.getElementById('btn-open-triggers').addEventListener('click', openTriggersOverlay);
  document.getElementById('triggers-overlay-close').addEventListener('click', closeTriggersOverlay);
  document.getElementById('triggers-overlay-backdrop').addEventListener('click', closeTriggersOverlay);
  document.getElementById('triggers-overlay-back').addEventListener('click', backToTriggersSectionChoice);
  document.querySelectorAll('.triggers-choose__card').forEach((btn) => {
    btn.addEventListener('click', () => showTriggersGraph(btn.dataset.sectionId));
  });
  document.getElementById('triggers-popover-btn').addEventListener('click', submitTriggersPopover);
  document.getElementById('triggers-popover-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTriggersPopover();
  });
  document.getElementById('triggers-overlay')?.addEventListener('click', (e) => {
    const popover = document.getElementById('triggers-popover');
    if (popover && !popover.hidden && !popover.contains(e.target)) hideTriggersPopover();
  });

  document.getElementById('btn-save-task').addEventListener('click', saveTaskFromModal);
  document.getElementById('btn-delete-task').addEventListener('click', deleteTaskFromModal);
  document.getElementById('btn-add-note').addEventListener('click', addNoteFromModal);
  document.getElementById('btn-add-subtask').addEventListener('click', addSubtaskFromModal);
  document.getElementById('subtask-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSubtaskFromModal(); }
  });
  document.getElementById('detail-mental-weight').addEventListener('change', () => {
    const weight = document.getElementById('detail-mental-weight').value;
    const block = document.getElementById('task-detail-subtasks');
    if (block) block.hidden = weight !== 'medium' && weight !== 'heavy';
  });
  document.getElementById('btn-create-task').addEventListener('click', createTaskFromModal);

  document.getElementById('btn-add-sphere-note').addEventListener('click', addSphereNote);
  document.getElementById('btn-add-sphere').addEventListener('click', openAddSphereModal);
  document.getElementById('btn-create-sphere').addEventListener('click', createSphereFromModal);

  document.querySelectorAll('.column__add').forEach((btn) => {
    btn.addEventListener('click', () => openAddModal(btn.dataset.status));
  });

  document.getElementById('btn-open-calendar').addEventListener('click', openCalendarOverlay);
  document.getElementById('calendar-close').addEventListener('click', closeCalendarOverlay);
  document.getElementById('calendar-overlay-backdrop').addEventListener('click', closeCalendarOverlay);
  document.getElementById('calendar-prev').addEventListener('click', () => {
    calendarMonth -= 1;
    if (calendarMonth < 0) { calendarMonth = 11; calendarYear -= 1; }
    renderCalendar();
  });
  document.getElementById('calendar-next').addEventListener('click', () => {
    calendarMonth += 1;
    if (calendarMonth > 11) { calendarMonth = 0; calendarYear += 1; }
    renderCalendar();
  });

  document.getElementById('btn-open-settings').addEventListener('click', openSettingsOverlay);
  document.getElementById('settings-overlay-close').addEventListener('click', closeSettingsOverlay);
  document.getElementById('settings-overlay-backdrop').addEventListener('click', closeSettingsOverlay);

  document.getElementById('btn-inbox-quick').addEventListener('click', () => {
    const popover = document.getElementById('inbox-quick-popover');
    if (popover && !popover.hidden) closeInboxQuickPopover();
    else openInboxQuickPopover();
  });
  document.getElementById('inbox-quick-submit').addEventListener('click', submitInboxQuick);
  document.getElementById('inbox-quick-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitInboxQuick(); }
  });
  document.addEventListener('click', (e) => {
    const popover = document.getElementById('inbox-quick-popover');
    const btn = document.getElementById('btn-inbox-quick');
    if (popover && !popover.hidden && !popover.contains(e.target) && btn && !btn.contains(e.target)) {
      closeInboxQuickPopover();
    }
  });
  document.getElementById('btn-empty-inbox').addEventListener('click', openEmptyInboxOverlay);

  document.getElementById('inbox-empty-close').addEventListener('click', closeEmptyInboxOverlay);
  document.getElementById('inbox-empty-backdrop').addEventListener('click', closeEmptyInboxOverlay);
  document.getElementById('inbox-empty-to-task').addEventListener('click', () => onInboxEmptyAction('task'));
  document.getElementById('inbox-empty-to-note').addEventListener('click', () => onInboxEmptyAction('note'));
  document.getElementById('inbox-empty-to-calendar').addEventListener('click', () => onInboxEmptyAction('calendar'));
  document.getElementById('inbox-empty-to-trash').addEventListener('click', () => onInboxEmptyAction('trash'));
  document.getElementById('inbox-empty-done-close').addEventListener('click', closeEmptyInboxOverlay);

  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('input-import').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importJSON(file)
      .then(() => {
        alert('Данные загружены.');
        e.target.value = '';
        if (currentTriggersSectionId) renderTriggerList(currentTriggersSectionId);
        closeSettingsOverlay();
      })
      .catch(() => {
        alert('Не удалось загрузить файл. Проверьте формат JSON.');
        e.target.value = '';
      });
  });
}

function init() {
  loadFromStorage();
  document.body.dataset.sphere = currentSphereId === DEFAULT_SPHERE_IDS.life ? 'life' : 'work';
  renderTabs();
  renderSphereNotes();
  renderBoard();
  updateInboxBadge();
  updateBoardTip();
  setupModals();
  STATUSES.forEach((status) => {
    const container = document.querySelector(`[data-column="${status}"]`);
    if (container) setupColumnDrop(container, status);
  });
}

init();
