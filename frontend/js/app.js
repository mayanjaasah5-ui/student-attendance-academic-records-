const pageContent = document.getElementById('page-content');
const dialog = document.getElementById('record-dialog');
const form = document.getElementById('record-form');
const formFields = document.getElementById('form-fields');
const pageNames = {
  dashboard: 'Dashboard', students: 'Students', lecturers: 'Lecturers',
  courses: 'Courses', attendance: 'Attendance', grades: 'Academic records'
};

const configs = {
  students: {
    title: 'Students', singular: 'student', description: 'Manage student registrations and profile information.',
    columns: [['studentId', 'Student ID'], ['fullName', 'Full name'], ['programme', 'Programme'], ['yearOfStudy', 'Year'], ['email', 'Email'], ['phone', 'Phone']],
    fields: [
      { name: 'studentId', label: 'Student ID', required: true }, { name: 'fullName', label: 'Full name', required: true },
      { name: 'gender', label: 'Gender', type: 'select', required: true, options: ['Female', 'Male', 'Other'] },
      { name: 'email', label: 'Email address', type: 'email', required: true }, { name: 'phone', label: 'Phone number', required: true },
      { name: 'programme', label: 'Programme', required: true }, { name: 'yearOfStudy', label: 'Year of study', type: 'number', min: 1, max: 10, required: true },
      { name: 'registrationDate', label: 'Registration date', type: 'date' }
    ]
  },
  lecturers: {
    title: 'Lecturers', singular: 'lecturer', description: 'Maintain lecturer profiles and department information.',
    columns: [['lecturerId', 'Lecturer ID'], ['fullName', 'Full name'], ['department', 'Department'], ['specialization', 'Specialization'], ['email', 'Email'], ['phone', 'Phone']],
    fields: [
      { name: 'lecturerId', label: 'Lecturer ID', required: true }, { name: 'fullName', label: 'Full name', required: true },
      { name: 'email', label: 'Email address', type: 'email', required: true }, { name: 'phone', label: 'Phone number', required: true },
      { name: 'department', label: 'Department', required: true }, { name: 'specialization', label: 'Specialization', required: true }
    ]
  },
  courses: {
    title: 'Courses', singular: 'course', description: 'Create courses and assign a lecturer to each course.',
    columns: [['courseCode', 'Course code'], ['courseName', 'Course name'], ['creditUnits', 'Credit units'], ['lecturer', 'Assigned lecturer']],
    fields: [
      { name: 'courseCode', label: 'Course code', required: true }, { name: 'courseName', label: 'Course name', required: true },
      { name: 'creditUnits', label: 'Credit units', type: 'number', min: 1, max: 20, required: true },
      { name: 'lecturer', label: 'Assigned lecturer', type: 'reference', resource: 'lecturers', optional: true },
      { name: 'description', label: 'Description', type: 'textarea', full: true }
    ]
  },
  attendance: {
    title: 'Attendance', singular: 'attendance record', description: 'Record and review daily student attendance by course.',
    columns: [['student', 'Student'], ['course', 'Course'], ['attendanceDate', 'Date'], ['status', 'Status'], ['remarks', 'Remarks']],
    fields: [
      { name: 'student', label: 'Student', type: 'reference', resource: 'students', required: true },
      { name: 'course', label: 'Course', type: 'reference', resource: 'courses', required: true },
      { name: 'attendanceDate', label: 'Attendance date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: ['Present', 'Absent', 'Late', 'Excused'] },
      { name: 'remarks', label: 'Remarks', type: 'textarea', full: true }
    ]
  },
  grades: {
    title: 'Academic records', singular: 'academic record', description: 'Store marks and calculate totals and grades automatically.',
    columns: [['student', 'Student'], ['course', 'Course'], ['courseworkMarks', 'Coursework'], ['examinationMarks', 'Examination'], ['totalMarks', 'Total'], ['grade', 'Grade']],
    fields: [
      { name: 'student', label: 'Student', type: 'reference', resource: 'students', required: true },
      { name: 'course', label: 'Course', type: 'reference', resource: 'courses', required: true },
      { name: 'courseworkMarks', label: 'Coursework marks (0–100)', type: 'number', min: 0, max: 100, step: 0.01, required: true },
      { name: 'examinationMarks', label: 'Examination marks (0–100)', type: 'number', min: 0, max: 100, step: 0.01, required: true },
      { name: 'remarks', label: 'Remarks', type: 'textarea', full: true }
    ]
  }
};

let currentPage = 'dashboard';
let records = [];
let editingRecord = null;
let requestSequence = 0;
const referenceCache = {};

document.getElementById('today-label').textContent = new Intl.DateTimeFormat(undefined, {
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
}).format(new Date());

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  let result;
  try { result = await response.json(); } catch { result = { message: 'The server returned an invalid response.' }; }
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status}).`);
  return result.data;
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.getElementById('toast-region').appendChild(toast);
  window.setTimeout(() => toast.remove(), 4200);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

function displayCell(record, field) {
  if (field === 'student' || field === 'course' || field === 'lecturer') {
    const ref = record[field];
    if (!ref) return 'Unassigned';
    const idField = field === 'student' ? 'studentId' : field === 'course' ? 'courseCode' : 'lecturerId';
    return `${ref[idField] || ''} · ${ref.fullName || ref.courseName || ''}`;
  }
  if (field === 'registrationDate' || field === 'attendanceDate' || field === 'createdAt') return displayDate(record[field]);
  if (field === 'status') return `<span class="tag ${escapeHtml(String(record[field]).toLowerCase())}">${escapeHtml(record[field])}</span>`;
  return escapeHtml(record[field] ?? '—');
}

async function checkConnection() {
  const label = document.getElementById('connection-label');
  const dot = document.querySelector('.status-dot');
  try {
    await api('/api/health');
    label.textContent = 'MongoDB connected';
    dot.classList.add('connected');
  } catch {
    label.textContent = 'MongoDB offline';
    dot.classList.remove('connected');
  }
}

function setActivePage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.page === page);
  });
  document.getElementById('page-crumb').textContent = pageNames[page];
  if (page === 'dashboard') loadDashboard();
  else renderResourcePage(page);
}

async function loadDashboard() {
  pageContent.innerHTML = '<div class="loading">Loading dashboard from MongoDB...</div>';
  try {
    const data = await api('/api/dashboard');
    pageContent.innerHTML = `
      <div class="page-heading"><div><p class="eyebrow">UNIVERSITY OVERVIEW</p><h1>Good day, Administrator</h1><p class="page-subtitle">A snapshot of your academic community and activity.</p></div><button class="button button-primary" data-quick-add>＋ Add student</button></div>
      <div class="stats-grid">
        ${statCard('♙', 'Registered students', data.students, 'Total student profiles', 'students')}
        ${statCard('♧', 'Lecturers', data.lecturers, 'Academic staff profiles', 'lecturers')}
        ${statCard('▤', 'Courses', data.courses, 'Courses in the catalogue', 'courses')}
        ${statCard('◷', 'Attendance records', data.attendanceRecords, 'All recorded sessions', 'attendance')}
      </div>
      <div class="dashboard-grid">
        <section class="panel"><div class="panel-heading"><h2>Recent registrations</h2><button class="table-action" data-view="students">View students →</button></div>
          <div class="recent-list">${data.recentStudents.length ? data.recentStudents.map((student) => `<div class="recent-row"><span class="person-avatar">${escapeHtml(initials(student.fullName))}</span><span class="recent-info"><b>${escapeHtml(student.fullName)}</b><small>${escapeHtml(student.studentId)} · ${escapeHtml(student.programme)}</small></span><span class="recent-date">${displayDate(student.createdAt)}</span></div>`).join('') : '<div class="empty-state">No student registrations yet.</div>'}</div>
        </section>
        <section class="panel"><div class="panel-heading"><h2>Attendance overview</h2><span>Recorded sessions</span></div>
          ${attendanceOverview(data.attendanceOverview)}
        </section>
      </div>`;
  } catch (error) {
    pageContent.innerHTML = `<div class="page-heading"><div><p class="eyebrow">UNIVERSITY OVERVIEW</p><h1>Dashboard</h1><p class="page-subtitle">Connect to MongoDB to view live academic data.</p></div></div><div class="panel empty-state"><b>Unable to load dashboard</b>${escapeHtml(error.message)}<br><br><button class="button button-quiet" data-retry>Try again</button></div>`;
  }
}

function statCard(icon, label, value, caption, page) {
  return `<button class="stat-card" data-view="${page}" style="text-align:left;width:100%;border:1px solid var(--line);cursor:pointer"><div class="stat-top">${label}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-caption">${caption}</div></button>`;
}

function initials(name = '') {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase();
}

function attendanceOverview(items) {
  const statuses = ['Present', 'Absent', 'Late', 'Excused'];
  const counts = Object.fromEntries(items.map((item) => [item._id, item.count]));
  const total = statuses.reduce((sum, status) => sum + (counts[status] || 0), 0);
  return `<div class="overview-list">${statuses.map((status) => {
    const count = counts[status] || 0;
    const percent = total ? Math.round(count / total * 100) : 0;
    return `<div><div class="overview-label"><span>${status}</span><b>${count} <span style="font-weight:400;color:#939c96">(${percent}%)</span></b></div><div class="progress-track"><div class="progress-fill ${status.toLowerCase()}" style="width:${percent}%"></div></div></div>`;
  }).join('')}</div>${total ? '' : '<div class="field-hint" style="margin-top:18px">Attendance data will appear as records are created.</div>'}`;
}

function filterMarkup(page) {
  if (page === 'attendance') {
    return `<select class="filter-control" data-filter="status"><option value="">All statuses</option>${['Present', 'Absent', 'Late', 'Excused'].map((item) => `<option>${item}</option>`).join('')}</select><input class="filter-control" type="date" data-filter="date" aria-label="Filter by date">`;
  }
  if (page === 'grades') return `<select class="filter-control" data-filter="course"><option value="">All courses</option>${(referenceCache.courses || []).map((item) => `<option value="${item._id}">${escapeHtml(item.courseCode)}</option>`).join('')}</select>`;
  if (page === 'students') return `<select class="filter-control" data-filter="yearOfStudy"><option value="">All years</option>${[1, 2, 3, 4, 5, 6].map((year) => `<option value="${year}">Year ${year}</option>`).join('')}</select>`;
  return '';
}

async function renderResourcePage(page) {
  const config = configs[page];
  const sequence = ++requestSequence;
  pageContent.innerHTML = '<div class="loading">Loading records from MongoDB...</div>';
  try {
    if (page === 'grades') await loadReferences('courses');
    const [data] = await Promise.all([api(`/api/${page}`), loadReferencesForForm(page)]);
    if (sequence !== requestSequence || currentPage !== page) return;
    records = data;
    pageContent.innerHTML = `<div class="page-heading"><div><p class="eyebrow">MANAGEMENT</p><h1>${config.title}</h1><p class="page-subtitle">${config.description}</p></div><button class="button button-primary" data-add>＋ Add ${config.singular}</button></div>
      <div class="table-panel"><div class="table-toolbar"><label class="search-box"><span>⌕</span><input type="search" id="record-search" placeholder="Search ${config.title.toLowerCase()}..." autocomplete="off"></label>${filterMarkup(page)}<span class="result-count" id="result-count"></span></div><div class="table-wrap"><table><thead><tr>${config.columns.map((column) => `<th>${column[1]}</th>`).join('')}<th>Actions</th></tr></thead><tbody id="record-rows"></tbody></table><div id="empty-state" class="empty-state" hidden><b>No records found</b>Try a different search or add your first ${config.singular}.</div></div><div class="table-footer">Records are loaded directly from the MongoDB database.</div></div>`;
    applyFilters();
  } catch (error) {
    if (sequence !== requestSequence || currentPage !== page) return;
    pageContent.innerHTML = `<div class="page-heading"><div><p class="eyebrow">MANAGEMENT</p><h1>${config.title}</h1><p class="page-subtitle">${config.description}</p></div></div><div class="panel empty-state"><b>Unable to load records</b>${escapeHtml(error.message)}<br><br><button class="button button-quiet" data-retry>Try again</button></div>`;
  }
}

async function loadReferences(resource) {
  if (!referenceCache[resource]) referenceCache[resource] = await api(`/api/${resource}`);
  return referenceCache[resource];
}

async function loadReferencesForForm(page) {
  const resources = page === 'courses' ? ['lecturers'] :
    page === 'attendance' || page === 'grades' ? ['students', 'courses'] : [];
  await Promise.all(resources.map(loadReferences));
}

function applyFilters() {
  const config = configs[currentPage];
  if (!config) return;
  const search = (document.getElementById('record-search')?.value || '').trim().toLowerCase();
  const filters = [...document.querySelectorAll('[data-filter]')].reduce((result, control) => {
    if (control.value) result[control.dataset.filter] = control.value;
    return result;
  }, {});
  const filtered = records.filter((record) => {
    const searchable = config.columns.map(([field]) => {
      const value = record[field];
      return value && typeof value === 'object'
        ? Object.values(value).join(' ')
        : String(value ?? '');
    }).join(' ').toLowerCase();
    return (!search || searchable.includes(search)) && Object.entries(filters).every(([field, value]) => {
      if (field === 'date') return new Date(record.attendanceDate).toISOString().slice(0, 10) === value;
      if (field === 'course' || field === 'student') return record[field]?._id === value;
      return String(record[field]) === value;
    });
  });
  const body = document.getElementById('record-rows');
  if (!body) return;
  document.getElementById('result-count').textContent = `${filtered.length} record${filtered.length === 1 ? '' : 's'}`;
  document.getElementById('empty-state').hidden = filtered.length !== 0;
  body.innerHTML = filtered.map((record) => `<tr data-record-id="${record._id}">${config.columns.map(([field]) => `<td class="${field === 'fullName' || field === 'studentId' || field === 'courseCode' ? 'primary-cell' : ''}">${displayCell(record, field)}</td>`).join('')}<td><div class="actions-cell"><button class="table-action" data-edit="${record._id}">Edit</button><button class="table-action delete" data-delete="${record._id}">Delete</button></div></td></tr>`).join('');
}

function inputMarkup(field, value) {
  const required = field.required ? 'required' : '';
  const full = field.full ? ' full-width' : '';
  let input;
  if (field.type === 'select') {
    input = `<select class="field-control" name="${field.name}" ${required}><option value="">Choose...</option>${field.options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}</select>`;
  } else if (field.type === 'reference') {
    const items = referenceCache[field.resource] || [];
    const label = (item) => field.resource === 'students' ? `${item.studentId} · ${item.fullName}` :
      field.resource === 'courses' ? `${item.courseCode} · ${item.courseName}` : `${item.lecturerId} · ${item.fullName}`;
    input = `<select class="field-control" name="${field.name}" ${required}><option value="">${field.optional ? 'Unassigned' : 'Choose...'}</option>${items.map((item) => `<option value="${item._id}" ${referenceId(value) === item._id ? 'selected' : ''}>${escapeHtml(label(item))}</option>`).join('')}</select>`;
  } else {
    const type = field.type || 'text';
    const attrs = [field.min !== undefined ? `min="${field.min}"` : '', field.max !== undefined ? `max="${field.max}"` : '', field.step ? `step="${field.step}"` : '', required].filter(Boolean).join(' ');
    const val = field.name === 'registrationDate' ? (value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)) :
      field.type === 'date' ? (value ? new Date(value).toISOString().slice(0, 10) : '') : value ?? '';
    input = field.type === 'textarea'
      ? `<textarea class="field-control" name="${field.name}" ${required}>${escapeHtml(val)}</textarea>`
      : `<input class="field-control" type="${type}" name="${field.name}" value="${escapeHtml(val)}" ${attrs}>`;
  }
  const hint = field.name === 'courseworkMarks' || field.name === 'examinationMarks'
    ? '<div class="field-hint">Total is the average of coursework and examination marks; grade is assigned automatically.</div>' : '';
  return `<div class="form-field${full}"><label for="field-${field.name}">${field.label}${field.required ? ' *' : ''}</label>${input.replace(`name="${field.name}"`, `id="field-${field.name}" name="${field.name}"`)}${hint}</div>`;
}

function referenceId(value) {
  return value && typeof value === 'object' ? value._id : value || '';
}

async function openForm(record = null) {
  const config = configs[currentPage];
  try {
    await loadReferencesForForm(currentPage);
    editingRecord = record;
    document.getElementById('dialog-title').textContent = `${record ? 'Edit' : 'Add'} ${config.singular}`;
    document.getElementById('save-record').textContent = record ? 'Save changes' : 'Save record';
    formFields.innerHTML = config.fields.map((field) => inputMarkup(field, record?.[field.name])).join('');
    dialog.showModal();
  } catch (error) {
    showToast(`Could not load form options: ${error.message}`, true);
  }
}

async function saveRecord(event) {
  event.preventDefault();
  const config = configs[currentPage];
  const payload = Object.fromEntries(new FormData(form).entries());
  for (const field of config.fields) {
    if (field.type === 'number' && payload[field.name] !== '') payload[field.name] = Number(payload[field.name]);
    if (field.type === 'reference' && payload[field.name] === '') payload[field.name] = null;
    if (field.name === 'registrationDate' && !payload[field.name]) delete payload[field.name];
  }
  const button = document.getElementById('save-record');
  button.disabled = true;
  button.textContent = 'Saving...';
  try {
    const route = `/api/${currentPage}${editingRecord ? `/${editingRecord._id}` : ''}`;
    await api(route, { method: editingRecord ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    dialog.close();
    showToast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${editingRecord ? 'updated' : 'created'} successfully.`);
    Object.keys(referenceCache).forEach((key) => delete referenceCache[key]);
    if (currentPage === 'dashboard') loadDashboard(); else renderResourcePage(currentPage);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    button.disabled = false;
    button.textContent = editingRecord ? 'Save changes' : 'Save record';
  }
}

async function deleteRecord(id) {
  const config = configs[currentPage];
  const record = records.find((item) => item._id === id);
  const label = record?.fullName || record?.courseName || record?.courseCode || record?.student?.fullName || record?.lecturerId || '';
  if (!window.confirm(`Delete ${config.singular}${label ? ` "${label}"` : ''}? This cannot be undone.`)) return;
  try {
    await api(`/api/${currentPage}/${id}`, { method: 'DELETE' });
    showToast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} deleted.`);
    renderResourcePage(currentPage);
  } catch (error) {
    showToast(error.message, true);
  }
}

document.querySelector('.navigation').addEventListener('click', (event) => {
  const link = event.target.closest('[data-page]');
  if (link) setActivePage(link.dataset.page);
});

pageContent.addEventListener('click', (event) => {
  const addButton = event.target.closest('[data-add], [data-quick-add]');
  if (addButton) {
    if (addButton.hasAttribute('data-quick-add')) setActivePage('students');
    openForm();
    return;
  }
  const editButton = event.target.closest('[data-edit]');
  if (editButton) { openForm(records.find((item) => item._id === editButton.dataset.edit)); return; }
  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) { deleteRecord(deleteButton.dataset.delete); return; }
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { setActivePage(viewButton.dataset.view); return; }
  if (event.target.closest('[data-retry]')) {
    if (currentPage === 'dashboard') loadDashboard(); else renderResourcePage(currentPage);
  }
});

pageContent.addEventListener('input', (event) => {
  if (event.target.id === 'record-search') applyFilters();
});
pageContent.addEventListener('change', (event) => {
  if (event.target.matches('[data-filter]')) applyFilters();
});
form.addEventListener('submit', saveRecord);
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
document.getElementById('cancel-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { form.reset(); editingRecord = null; });

checkConnection();
setActivePage('dashboard');
