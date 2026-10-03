import { apiClient, USE_MOCKS, mockDelay } from './api.js';
import { mockNotices } from '../data/mockData.js';

// One common board for every department — this service has no
// department-scoping logic itself; a notice's `visibility` field
// ("All Departments" or a list of department keys) is the only
// filter, applied here so every caller sees a consistent result
// regardless of which department they're logged in as.
function visibleTo(notice, department) {
  if (notice.visibility === 'All Departments' || !Array.isArray(notice.visibility)) return true;
  return notice.visibility.includes(department);
}

async function getNotices(department) {
  if (USE_MOCKS) {
    const notices = mockNotices
      .filter((n) => visibleTo(n, department))
      .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
    return mockDelay(notices);
  }
  try {
    const res = await apiClient.get('/notices');
    return Array.isArray(res) && res.length > 0 ? res : mockNotices.filter((n) => visibleTo(n, department));
  } catch (err) {
    console.warn('API /notices error, falling back to local notices:', err?.message);
    return mockNotices.filter((n) => visibleTo(n, department));
  }
}

export const noticeService = { getNotices };
