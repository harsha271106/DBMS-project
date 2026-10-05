const API = 'http://localhost:3000/api';

// ==========================================
// OWNER / VIEWER AUTHENTICATION
// ==========================================
let isOwner = sessionStorage.getItem('owner_authenticated') === 'true';
let ownerKey = sessionStorage.getItem('owner_key') || '';

window.openOwnerModal = function() {
  if (isOwner) {
    isOwner = false;
    ownerKey = '';
    sessionStorage.removeItem('owner_authenticated');
    sessionStorage.removeItem('owner_key');
    alert('Switched back to View-Only mode.');
    updateUIForRole();
    return;
  }

  const modal = document.getElementById('ownerModal');
  const input = document.getElementById('ownerPassInput');
  if (modal) {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
    } else {
      modal.style.display = 'block';
    }
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 60);
    }
  }
};

window.closeOwnerModal = function() {
  const modal = document.getElementById('ownerModal');
  if (modal) {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.style.display = 'none';
    }
  }
};

window.submitOwnerAuth = async function() {
  const input = document.getElementById('ownerPassInput');
  const pass = input ? input.value.trim() : '';
  if (!pass) return;

  try {
    const res = await fetch(`${API}/verify-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: pass })
    });

    if (res.ok) {
      isOwner = true;
      ownerKey = pass;
      sessionStorage.setItem('owner_authenticated', 'true');
      sessionStorage.setItem('owner_key', ownerKey);
      closeOwnerModal();
      alert('Owner mode unlocked! Full edit controls active.');
    } else {
      alert('Access Denied: Incorrect passphrase.');
    }
  } catch (err) {
    alert('Verification Error: ' + err.message);
  }

  updateUIForRole();
};

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('ownerModal');
  if (modal && (modal.open || modal.style.display === 'block')) {
    if (e.key === 'Enter') submitOwnerAuth();
    if (e.key === 'Escape') closeOwnerModal();
  }
});

function updateUIForRole() {
  const toggleBtn = document.getElementById('ownerToggleBtn');
  const roleBadge = document.getElementById('roleBadge');
  const forms = document.querySelectorAll('.owner-control');
  const deleteBtns = document.querySelectorAll('.btn-delete');
  const actionCols = document.querySelectorAll('.action-col');

  if (toggleBtn) {
    if (isOwner) {
      toggleBtn.innerHTML = '🔒 Lock to Viewer Mode';
      toggleBtn.style.background = 'rgba(244, 63, 94, 0.15)';
      toggleBtn.style.color = '#f43f5e';
      toggleBtn.style.borderColor = 'rgba(244, 63, 94, 0.3)';
    } else {
      toggleBtn.innerHTML = '🔑 Unlock Owner Mode';
      toggleBtn.style.background = '#1e293b';
      toggleBtn.style.color = 'var(--primary)';
      toggleBtn.style.borderColor = 'var(--surface-border)';
    }
  }

  if (roleBadge) {
    if (isOwner) {
      roleBadge.innerHTML = '👑 Owner Mode (Full Access)';
      roleBadge.className = 'badge-role owner';
    } else {
      roleBadge.innerHTML = '👁️ Viewer (Read Only)';
      roleBadge.className = 'badge-role viewer';
    }
  }

  forms.forEach(form => {
    form.style.display = isOwner ? 'grid' : 'none';
  });

  actionCols.forEach(col => {
    col.style.display = isOwner ? 'table-cell' : 'none';
  });

  deleteBtns.forEach(btn => {
    const parentCell = btn.closest('td');
    if (parentCell) {
      parentCell.style.display = isOwner ? 'table-cell' : 'none';
    }
  });
}

// ==========================================
// GLOBAL LIVE SEARCH ENGINE
// ==========================================
window.filterAllTables = function() {
  const query = document.getElementById('globalSearchInput').value.toLowerCase().trim();
  const tables = document.querySelectorAll('.table-container table tbody');

  tables.forEach(tbody => {
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      if (row.cells.length === 1 && row.cells[0].colSpan > 1) return;
      const rowText = row.innerText.toLowerCase();
      row.style.display = (!query || rowText.includes(query)) ? '' : 'none';
    });
  });
};

window.clearGlobalSearch = function() {
  const input = document.getElementById('globalSearchInput');
  if (input) {
    input.value = '';
    filterAllTables();
    input.focus();
  }
};

// ==========================================
// 1. STUDENTS MODULE
// ==========================================
async function loadStudents() {
  try {
    const res = await fetch(`${API}/students`);
    const data = await res.json();
    
    const countEl = document.getElementById('metric-students');
    if (countEl) countEl.textContent = Array.isArray(data) ? data.length : 0;

    const tbody = document.getElementById('studentTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No student records found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(s => `
      <tr>
        <td><span class="mono-tag">${s.student_id}</span></td>
        <td style="font-weight:600;">${s.name}</td>
        <td>${s.program} <span style="color:var(--text-muted); font-size:11px;">(S${s.semester})</span></td>
        <td><span style="color:var(--primary); font-family:var(--mono); font-weight:600;">${parseFloat(s.cgpa).toFixed(2)}</span></td>
        <td class="action-cell"><button class="btn-delete" onclick="deleteStudent('${s.student_id}')">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load students:', err);
  }
}

const studentForm = document.getElementById('studentForm');
if (studentForm) {
  studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const student = {
      student_id: document.getElementById('s_id').value.trim(),
      name: document.getElementById('s_name').value.trim(),
      email: document.getElementById('s_email').value.trim(),
      program: document.getElementById('s_program').value.trim(),
      semester: parseInt(document.getElementById('s_semester').value),
      cgpa: parseFloat(document.getElementById('s_cgpa').value),
    };

    try {
      const res = await fetch(`${API}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(student)
      });
      if (res.ok) {
        studentForm.reset();
        await loadStudents();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteStudent(id) {
  if (!confirm(`Delete student record ${id}?`)) return;
  try {
    const res = await fetch(`${API}/students/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadStudents();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 2. PROGRESS REPORTS MODULE
// ==========================================
async function loadReports() {
  try {
    const res = await fetch(`${API}/reports`);
    const data = await res.json();

    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No progress reports found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => `
      <tr>
        <td><span class="mono-tag">${r.record_id}</span></td>
        <td><strong>Week ${r.week_num}</strong></td>
        <td style="font-size:12px; line-height:1.4;">${r.description}</td>
        <td style="color:var(--text-muted); font-size:11.5px;"><em>${r.mentor_feedback || 'Pending'}</em></td>
        <td class="action-cell"><button class="btn-delete" onclick="deleteReport('${r.record_id}', ${r.week_num})">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load reports:', err);
  }
}

const reportForm = document.getElementById('reportForm');
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const report = {
      record_id: document.getElementById('r_record_id').value.trim(),
      week_num: parseInt(document.getElementById('r_week_num').value),
      description: document.getElementById('r_desc').value.trim(),
      mentor_feedback: document.getElementById('r_feedback').value.trim(),
    };

    try {
      const res = await fetch(`${API}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(report)
      });
      if (res.ok) {
        reportForm.reset();
        await loadReports();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteReport(record_id, week_num) {
  if (!confirm(`Delete report for ${record_id} Week ${week_num}?`)) return;
  try {
    const res = await fetch(`${API}/reports/${record_id}/${week_num}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadReports();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 3. COMPANIES MODULE
// ==========================================
async function loadCompanies() {
  try {
    const res = await fetch(`${API}/companies`);
    const data = await res.json();
    
    const countEl = document.getElementById('metric-companies');
    if (countEl) countEl.textContent = Array.isArray(data) ? data.length : 0;

    const tbody = document.getElementById('companyTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No partner companies found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(c => `
      <tr>
        <td><span class="mono-tag">${c.company_id}</span></td>
        <td style="font-weight:600;">${c.name}</td>
        <td style="color:var(--text-muted);">${c.location}</td>
        <td style="font-size:12px; color:var(--text-muted);">${c.contact || 'N/A'}</td>
        <td class="action-cell"><button class="btn-delete" onclick="deleteCompany('${c.company_id}')">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load companies:', err);
  }
}

const companyForm = document.getElementById('companyForm');
if (companyForm) {
  companyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const comp = {
      company_id: document.getElementById('c_id').value.trim(),
      name: document.getElementById('c_name').value.trim(),
      industry: document.getElementById('c_industry').value.trim(),
      location: document.getElementById('c_location').value.trim(),
      contact: document.getElementById('c_contact').value.trim()
    };

    try {
      const res = await fetch(`${API}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(comp)
      });
      if (res.ok) {
        companyForm.reset();
        await loadCompanies();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteCompany(id) {
  if (!confirm(`Delete company ${id}?`)) return;
  try {
    const res = await fetch(`${API}/companies/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadCompanies();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 4. INTERNSHIP POSTINGS MODULE
// ==========================================
async function loadPostings() {
  try {
    const res = await fetch(`${API}/postings`);
    const data = await res.json();

    const countEl = document.getElementById('metric-postings');
    if (countEl) countEl.textContent = Array.isArray(data) ? data.length : 0;

    const tbody = document.getElementById('postingTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No postings found in database</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(p => {
      const id = p.posting_id || 'N/A';
      const company = p.company_name || 'Partner';
      const title = p.role_title || p.title || 'Role';
      const stipend = p.stipend ? `₹${Number(p.stipend).toLocaleString('en-IN')}` : 'Unpaid';
      const duration = p.duration || 'N/A';

      return `
        <tr>
          <td><span class="mono-tag">${id}</span></td>
          <td style="font-weight:600;">${company}</td>
          <td style="color:var(--primary); font-weight:600;">${title}</td>
          <td>${stipend}</td>
          <td><span class="mono-tag">${duration}</span></td>
          <td class="action-cell"><button class="btn-delete" onclick="deletePosting('${id}')">Remove</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load postings:', err);
  }
}

const postingForm = document.getElementById('postingForm');
if (postingForm) {
  postingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const posting = {
      posting_id: document.getElementById('post_id').value.trim(),
      company_id: document.getElementById('post_comp_id').value.trim(),
      title: document.getElementById('post_title').value.trim(),
      stipend: parseFloat(document.getElementById('post_stipend').value),
      duration: document.getElementById('post_duration').value.trim(),
      description: document.getElementById('post_desc').value.trim()
    };

    try {
      const res = await fetch(`${API}/postings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(posting)
      });
      if (res.ok) {
        postingForm.reset();
        await loadPostings();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deletePosting(id) {
  if (!confirm(`Delete posting ${id}?`)) return;
  try {
    const res = await fetch(`${API}/postings/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadPostings();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 5. APPLICATIONS MODULE
// ==========================================
async function loadApplications() {
  try {
    const res = await fetch(`${API}/applications`);
    const data = await res.json();

    const tbody = document.getElementById('applicationTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No applications found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(a => {
      const id = a.application_id || 'N/A';
      const student = a.student_name || a.student_id || 'Applicant';
      const role = a.role_applied || a.posting_id || 'Internship';
      const status = a.status || 'Submitted';

      return `
        <tr>
          <td><span class="mono-tag">${id}</span></td>
          <td style="font-weight:600;">${student}</td>
          <td>${role}</td>
          <td><span class="pill" style="font-size:10px;">${status}</span></td>
          <td class="action-cell"><button class="btn-delete" onclick="deleteApplication('${id}')">Remove</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

const applicationForm = document.getElementById('applicationForm');
if (applicationForm) {
  applicationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const app = {
      application_id: document.getElementById('app_id').value.trim(),
      student_id: document.getElementById('app_student_id').value.trim(),
      posting_id: document.getElementById('app_posting_id').value.trim(),
      status: document.getElementById('app_status').value
    };

    try {
      const res = await fetch(`${API}/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(app)
      });
      if (res.ok) {
        applicationForm.reset();
        await loadApplications();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteApplication(id) {
  if (!confirm(`Delete application ${id}?`)) return;
  try {
    const res = await fetch(`${API}/applications/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadApplications();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 6. FACULTY MENTORS MODULE
// ==========================================
async function loadMentors() {
  try {
    const res = await fetch(`${API}/mentors`);
    const data = await res.json();

    const tbody = document.getElementById('mentorTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No mentors found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(m => `
      <tr>
        <td><span class="mono-tag">${m.faculty_id}</span></td>
        <td style="font-weight:600;">${m.name}</td>
        <td>${m.department}</td>
        <td class="action-cell"><button class="btn-delete" onclick="deleteMentor('${m.faculty_id}')">Remove</button></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load mentors:', err);
  }
}

const mentorForm = document.getElementById('mentorForm');
if (mentorForm) {
  mentorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mentor = {
      faculty_id: document.getElementById('m_id').value.trim(),
      name: document.getElementById('m_name').value.trim(),
      department: document.getElementById('m_dept').value.trim(),
      email: document.getElementById('m_email').value.trim()
    };

    try {
      const res = await fetch(`${API}/mentors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(mentor)
      });
      if (res.ok) {
        mentorForm.reset();
        await loadMentors();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteMentor(id) {
  if (!confirm(`Delete faculty mentor ${id}?`)) return;
  try {
    const res = await fetch(`${API}/mentors/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadMentors();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// 7. INTERNSHIP RECORDS MODULE
// ==========================================
async function loadRecords() {
  try {
    const res = await fetch(`${API}/records`);
    const data = await res.json();

    const countEl = document.getElementById('metric-records');
    if (countEl) countEl.textContent = Array.isArray(data) ? data.length : 0;

    const tbody = document.getElementById('recordTableBody');
    if (!tbody) return;

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No records found</td></tr>`;
      return;
    }

    tbody.innerHTML = data.map(r => {
      const id = r.record_id || 'N/A';
      const student = r.student_name || 'Enrolled Student';
      const mentor = r.mentor_name || 'Faculty Guide';
      const start = r.start_date ? new Date(r.start_date).toLocaleDateString() : 'N/A';
      const status = r.final_status || 'Active';

      return `
        <tr>
          <td><span class="mono-tag">${id}</span></td>
          <td style="font-weight:600;">${student}</td>
          <td>${mentor}</td>
          <td>${start}</td>
          <td><span class="pill" style="font-size:10px;">${status}</span></td>
          <td class="action-cell"><button class="btn-delete" onclick="deleteRecord('${id}')">Remove</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load records:', err);
  }
}

const recordForm = document.getElementById('recordForm');
if (recordForm) {
  recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rec = {
      record_id: document.getElementById('rec_id').value.trim(),
      application_id: document.getElementById('rec_app_id').value.trim(),
      faculty_id: document.getElementById('rec_fac_id').value.trim(),
      final_status: document.getElementById('rec_status').value,
      start_date: document.getElementById('rec_start').value,
      end_date: document.getElementById('rec_end').value || null
    };

    try {
      const res = await fetch(`${API}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-owner-key': ownerKey },
        body: JSON.stringify(rec)
      });
      if (res.ok) {
        recordForm.reset();
        await loadRecords();
        updateUIForRole();
        filterAllTables();
      } else {
        const err = await res.json();
        alert('Insert Failed: ' + err.error);
      }
    } catch (err) {
      alert('Network/Server Error: ' + err.message);
    }
  });
}

async function deleteRecord(id) {
  if (!confirm(`Delete record ${id}?`)) return;
  try {
    const res = await fetch(`${API}/records/${id}`, { 
      method: 'DELETE',
      headers: { 'x-owner-key': ownerKey }
    });
    if (res.ok) {
      await loadRecords();
      updateUIForRole();
      filterAllTables();
    } else {
      const err = await res.json();
      alert('Delete Failed: ' + err.error);
    }
  } catch (err) {
    alert('Network/Server Error: ' + err.message);
  }
}

// ==========================================
// INITIAL BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadStudents(),
    loadReports(),
    loadCompanies(),
    loadPostings(),
    loadApplications(),
    loadMentors(),
    loadRecords()
  ]);
  updateUIForRole();
  filterAllTables();
});