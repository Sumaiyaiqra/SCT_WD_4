// ---------- State ----------
const STORAGE_KEY = "todo-app-tasks";
let tasks = loadTasks();
let filter = "all";
let editingId = null;

// ---------- Elements ----------
const form = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const dueInput = document.getElementById("task-due");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const progressText = document.getElementById("progress-text");
const progressBar = document.getElementById("progress-bar");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter");

// ---------- Storage ----------
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    /* storage unavailable: app still works for this session */
  }
}

// ---------- Actions ----------
function addTask(text, due) {
  tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, due, done: false });
  commit();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) task.done = !task.done;
  commit();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  commit();
}

function updateTask(id, text, due) {
  const task = tasks.find(t => t.id === id);
  if (task) { task.text = text; task.due = due; }
  editingId = null;
  commit();
}

function commit() {
  saveTasks();
  render();
}

// ---------- Helpers ----------
function formatDue(due) {
  return new Date(due).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function isOverdue(task) {
  return !task.done && task.due && new Date(task.due) < new Date();
}

// Unfinished first, then by due date (no date goes last)
function sortedTasks() {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due) return new Date(a.due) - new Date(b.due);
    if (a.due) return -1;
    if (b.due) return 1;
    return 0;
  });
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- Rendering ----------
function render() {
  const visible = sortedTasks().filter(t =>
    filter === "all" ? true : filter === "done" ? t.done : !t.done
  );

  list.replaceChildren(...visible.map(buildTask));

  const doneCount = tasks.filter(t => t.done).length;
  progressText.textContent = `${doneCount} of ${tasks.length} completed`;
  progressBar.style.width = tasks.length ? `${(doneCount / tasks.length) * 100}%` : "0";
  clearDoneBtn.hidden = doneCount === 0;

  if (visible.length === 0) {
    emptyState.hidden = false;
    emptyState.textContent =
      tasks.length === 0 ? "No tasks yet. Add your first task above."
      : filter === "done" ? "Nothing completed yet."
      : "All caught up. Nothing left to do.";
  } else {
    emptyState.hidden = true;
  }
}

function buildTask(task) {
  const li = el("li", "task");
  if (task.done) li.classList.add("is-done");
  if (isOverdue(task)) li.classList.add("is-overdue");

  if (task.id === editingId) {
    li.append(buildEditor(task));
    return li;
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  checkbox.setAttribute("aria-label", `Mark "${task.text}" as completed`);
  checkbox.addEventListener("change", () => toggleTask(task.id));

  const body = el("div", "task-body");
  body.append(el("p", "task-text", task.text));
  if (task.due) {
    body.append(el("span", "due-tag", (isOverdue(task) ? "Overdue: " : "Due ") + formatDue(task.due)));
  }

  const actions = el("div", "task-actions");
  const editBtn = el("button", "icon-btn", "Edit");
  editBtn.type = "button";
  editBtn.addEventListener("click", () => { editingId = task.id; render(); });
  const delBtn = el("button", "icon-btn delete", "Delete");
  delBtn.type = "button";
  delBtn.addEventListener("click", () => deleteTask(task.id));
  actions.append(editBtn, delBtn);

  li.append(checkbox, body, actions);
  return li;
}

function buildEditor(task) {
  const wrap = el("div", "task-body");
  const fields = el("div", "edit-fields");

  const textField = document.createElement("input");
  textField.type = "text";
  textField.value = task.text;
  textField.maxLength = 120;
  textField.setAttribute("aria-label", "Task text");

  const dueField = document.createElement("input");
  dueField.type = "datetime-local";
  dueField.value = task.due || "";
  dueField.setAttribute("aria-label", "Due date and time");

  fields.append(textField, dueField);

  const buttons = el("div", "edit-buttons");
  const save = el("button", "btn btn-primary", "Save changes");
  save.type = "button";
  const cancel = el("button", "btn btn-ghost", "Cancel");
  cancel.type = "button";
  buttons.append(save, cancel);

  const doSave = () => {
    const text = textField.value.trim();
    if (!text) { textField.focus(); return; }
    updateTask(task.id, text, dueField.value);
  };
  save.addEventListener("click", doSave);
  cancel.addEventListener("click", () => { editingId = null; render(); });
  textField.addEventListener("keydown", e => {
    if (e.key === "Enter") doSave();
    if (e.key === "Escape") { editingId = null; render(); }
  });

  wrap.append(fields, buttons);
  setTimeout(() => textField.focus(), 0);
  return wrap;
}

// ---------- Events ----------
form.addEventListener("submit", e => {
  e.preventDefault();
  const text = taskInput.value.trim();
  if (!text) return;
  addTask(text, dueInput.value);
  form.reset();
  taskInput.focus();
});

filterButtons.forEach(btn =>
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle("is-active", b === btn));
    render();
  })
);

clearDoneBtn.addEventListener("click", () => {
  tasks = tasks.filter(t => !t.done);
  commit();
});

// Refresh "overdue" styling every minute
setInterval(() => { if (!editingId) render(); }, 60000);

render();
