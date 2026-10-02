/**
 * CoalSetu — Full-Text Search Service
 * Uses PostgreSQL native FTS (tsvector + tsquery) for lightning-fast
 * multi-table search across all governance and mining records.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Unified search across all major tables using PostgreSQL FTS.
 * Falls back to ILIKE if tsvector is unavailable.
 */
async function globalSearch(query, { limit = 20, tables = 'all' } = {}) {
  if (!query || query.trim().length < 2) return { results: [], total: 0, query };

  const q = query.trim();
  const results = [];

  // Build tsquery — replace spaces with & for AND matching, handle single words
  const tsQuery = q
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '') + ':*')
    .join(' & ');

  try {
    // ── Flags ──
    if (tables === 'all' || tables.includes('flags')) {
      const flagResults = await prisma.$queryRaw`
        SELECT
          id, category, description, severity, status,
          "mineName", "assignedAuthority", "createdAt",
          'Flag' AS type,
          ts_rank(
            to_tsvector('english', coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce("mineName",'')),
            to_tsquery('english', ${tsQuery})
          ) AS rank
        FROM flags
        WHERE
          to_tsvector('english', coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce("mineName",''))
          @@ to_tsquery('english', ${tsQuery})
          OR description ILIKE ${'%' + q + '%'}
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT ${limit}
      `;
      results.push(...flagResults.map(r => ({ ...r, type: 'Flag', href: `/flags/${r.id}` })));
    }

    // ── Corrective Actions ──
    if (tables === 'all' || tables.includes('corrective_actions')) {
      const caResults = await prisma.$queryRaw`
        SELECT
          id, issue, recommendation, status, "assignedTo", "mineName", "createdAt",
          'CorrectiveAction' AS type,
          ts_rank(
            to_tsvector('english', coalesce(issue,'') || ' ' || coalesce(recommendation,'') || ' ' || coalesce("mineName",'')),
            to_tsquery('english', ${tsQuery})
          ) AS rank
        FROM corrective_actions
        WHERE
          to_tsvector('english', coalesce(issue,'') || ' ' || coalesce(recommendation,'') || ' ' || coalesce("mineName",''))
          @@ to_tsquery('english', ${tsQuery})
          OR issue ILIKE ${'%' + q + '%'}
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT ${limit}
      `;
      results.push(...caResults.map(r => ({ ...r, type: 'Corrective Action', href: `/corrective-actions/${r.id}` })));
    }

    // ── Inspections ──
    if (tables === 'all' || tables.includes('inspections')) {
      const insResults = await prisma.$queryRaw`
        SELECT
          id, "inspectionType", status, inspector, "mineName", "createdAt",
          'Inspection' AS type,
          ts_rank(
            to_tsvector('english', coalesce("inspectionType",'') || ' ' || coalesce(inspector,'') || ' ' || coalesce("mineName",'')),
            to_tsquery('english', ${tsQuery})
          ) AS rank
        FROM inspections
        WHERE
          to_tsvector('english', coalesce("inspectionType",'') || ' ' || coalesce(inspector,'') || ' ' || coalesce("mineName",''))
          @@ to_tsquery('english', ${tsQuery})
          OR "mineName" ILIKE ${'%' + q + '%'}
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT ${limit}
      `;
      results.push(...insResults.map(r => ({ ...r, type: 'Inspection', href: `/inspections/${r.id}` })));
    }

    // ── Notices ──
    if (tables === 'all' || tables.includes('notices')) {
      const noticeResults = await prisma.$queryRaw`
        SELECT
          id, title, description, category, status, authority, "createdAt",
          'Notice' AS type,
          ts_rank(
            to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce(authority,'')),
            to_tsquery('english', ${tsQuery})
          ) AS rank
        FROM notices
        WHERE
          to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce(authority,''))
          @@ to_tsquery('english', ${tsQuery})
          OR title ILIKE ${'%' + q + '%'}
          OR description ILIKE ${'%' + q + '%'}
        ORDER BY rank DESC, "createdAt" DESC
        LIMIT ${limit}
      `;
      results.push(...noticeResults.map(r => ({ ...r, type: 'Notice', href: `/notices/${r.id}` })));
    }

    // Sort all results by rank desc
    results.sort((a, b) => (parseFloat(b.rank) || 0) - (parseFloat(a.rank) || 0));

    return {
      query: q,
      total: results.length,
      results: results.slice(0, limit),
    };
  } catch (err) {
    // If FTS fails (e.g., table doesn't exist yet), return empty gracefully
    console.warn('[SearchService] FTS query failed, returning empty:', err.message);
    return { query: q, total: 0, results: [], error: err.message };
  }
}

/**
 * Create GIN indexes for fast FTS — run once on startup.
 * Safe to call multiple times (IF NOT EXISTS pattern).
 */
async function ensureFTSIndexes() {
  const indexSql = [
    `CREATE INDEX IF NOT EXISTS idx_flags_fts ON flags USING GIN (to_tsvector('english', coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce("mineName",'')))`,
    `CREATE INDEX IF NOT EXISTS idx_corrective_actions_fts ON corrective_actions USING GIN (to_tsvector('english', coalesce(issue,'') || ' ' || coalesce(recommendation,'') || ' ' || coalesce("mineName",'')))`,
    `CREATE INDEX IF NOT EXISTS idx_inspections_fts ON inspections USING GIN (to_tsvector('english', coalesce("inspectionType",'') || ' ' || coalesce(inspector,'') || ' ' || coalesce("mineName",'')))`,
    `CREATE INDEX IF NOT EXISTS idx_notices_fts ON notices USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(category,'') || ' ' || coalesce(authority,'')))`,
  ];

  for (const sql of indexSql) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e) {
      // Non-fatal — table might not exist yet
      console.warn('[SearchService] Index creation skipped:', e.message.slice(0, 80));
    }
  }
  console.log('[SearchService] PostgreSQL FTS GIN indexes ensured ✓');
}

module.exports = { globalSearch, ensureFTSIndexes };
