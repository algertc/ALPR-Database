import pg from "pg";
import { getConfig } from "@/lib/settings";

let pool = null;
let currentConfigHash = null;

async function getNewPool(config) {
  const [host, portStr] = (config?.database?.host || "localhost:5432").split(
    ":"
  );
  const port = parseInt(portStr || "5432", 10);

  return new pg.Pool({
    host: host,
    port: port,
    user: config?.database?.user || "postgres",
    password: config?.database?.password || "password",
    database: config?.database?.name || "postgres",
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

export async function getPool(retryCount = 3) {
  try {
    const config = await getConfig();
    const newConfigHash = JSON.stringify({
      host: config?.database?.host,
      name: config?.database?.name,
      user: config?.database?.user,
      password: config?.database?.password,
    });

    if (!pool || newConfigHash !== currentConfigHash) {
      // If there's an existing pool, wait for all clients to be released
      if (pool) {
        try {
          await pool.end();
        } catch (e) {
          console.warn("Error ending previous pool:", e);
        }
      }

      pool = await getNewPool(config);
      currentConfigHash = newConfigHash;

      // Test the connection
      const client = await pool.connect();
      try {
        await client.query("SELECT 1");
        console.log("Database connection successful");
      } finally {
        client.release();
      }
    }

    return pool;
  } catch (error) {
    if (retryCount > 0) {
      console.log(`Retrying connection... (${retryCount} attempts remaining)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return getPool(retryCount - 1);
    }
    throw error;
  }
}

// Helper function to manage database operations
export async function withClient(operation) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

// Default page size for paginated queries
const DEFAULT_PAGE_SIZE = 25;

export async function getPlateReads({
  page = 1,
  pageSize = 25,
  filters = {},
  sort = { field: "", direction: "" },
} = {}) {
  return withClient(async (client) => {
    const offset = (page - 1) * pageSize;
    let paramIndex = 1;
    let conditions = [];
    let values = [];

    if (filters.plateNumber) {
      if (filters.fuzzySearch) {
        const normalizedSearch = filters.plateNumber
          .replace(/[^a-zA-Z0-9]/g, "")
          .toUpperCase();

        conditions.push(`(
          pr.plate_number ILIKE $${paramIndex} OR 
          REPLACE(REPLACE(UPPER(pr.plate_number), ' ', ''), '*', '') LIKE $${
            paramIndex + 1
          } OR
          LEVENSHTEIN(
            REPLACE(REPLACE(UPPER(pr.plate_number), ' ', ''), '*', ''),
            $${paramIndex + 2}
          ) <= GREATEST(2, CEIL(LENGTH($${paramIndex + 2}) * 0.25))
        )`);

        values.push(
          `%${filters.plateNumber}%`,
          `%${normalizedSearch}%`,
          normalizedSearch
        );
        paramIndex += 3;
      } else {
        conditions.push(`pr.plate_number ILIKE $${paramIndex}`);
        values.push(`%${filters.plateNumber}%`);
        paramIndex++;
      }
    }

    if (
      filters.hourRange?.from !== undefined &&
      filters.hourRange?.to !== undefined
    ) {
      if (filters.hourRange.from <= filters.hourRange.to) {
        conditions.push(
          `EXTRACT(HOUR FROM pr.timestamp) BETWEEN $${paramIndex} AND $${
            paramIndex + 1
          }`
        );
      } else {
        conditions.push(
          `(EXTRACT(HOUR FROM pr.timestamp) >= $${paramIndex} OR 
            EXTRACT(HOUR FROM pr.timestamp) < $${paramIndex + 1})`
        );
      }
      values.push(filters.hourRange.from, filters.hourRange.to);
      paramIndex += 2;
    }

    if (filters.dateRange?.from && filters.dateRange?.to) {
      conditions.push(
        `pr.timestamp::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`
      );
      values.push(filters.dateRange.from, filters.dateRange.to);
      paramIndex += 2;
    }

    if (filters.tag) {
      if (filters.tag === "untagged") {
        conditions.push(
          `pr.plate_number NOT IN (SELECT DISTINCT plate_number FROM plate_tags)`
        );
      } else if (filters.tag !== "all") {
        conditions.push(`EXISTS (
          SELECT 1 FROM plate_tags pt2 
          JOIN tags t2 ON pt2.tag_id = t2.id 
          WHERE pt2.plate_number = pr.plate_number 
          AND t2.name = $${paramIndex}
        )`);
        values.push(filters.tag);
        paramIndex++;
      }
    }

    if (filters.cameraName) {
      conditions.push(`pr.camera_name ILIKE $${paramIndex}`);
      values.push(filters.cameraName);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT pr.id)
      FROM plate_reads pr
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);

    let orderByClause = "ORDER BY pr.timestamp DESC";
    if (sort.field === "occurrence_count") {
      orderByClause = `ORDER BY p.occurrence_count ${sort.direction}, pr.timestamp DESC`;
    } else if (sort.field === "timestamp" && sort.direction === "asc") {
      orderByClause = `ORDER BY pr.timestamp ASC`;
    }

    const dataQuery = `
      SELECT 
        pr.id,
        pr.plate_number,
        pr.image_data,
        pr.image_path,
        pr.bi_path,
        pr.thumbnail_path,
        pr.timestamp,
        pr.camera_name,
        p.occurrence_count,
        pr.crop_coordinates,
        pr.confidence,
        pr.validated,
        kp.name as known_name,
        kp.notes,
        array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
          FILTER (WHERE t.name IS NOT NULL) as tags,
        p.flagged
      FROM plate_reads pr
      JOIN plates p ON pr.plate_number = p.plate_number
      LEFT JOIN known_plates kp ON pr.plate_number = kp.plate_number
      LEFT JOIN plate_tags pt ON pr.plate_number = pt.plate_number
      LEFT JOIN tags t ON pt.tag_id = t.id
      ${whereClause}
      GROUP BY 
        pr.id, 
        pr.plate_number, 
        pr.image_data,
        pr.image_path,
        pr.thumbnail_path,
        pr.bi_path,
        pr.timestamp, 
        pr.camera_name,
        pr.crop_coordinates,
        p.occurrence_count,
        p.flagged,
        kp.name, 
        kp.notes,
        pr.confidence,
        pr.validated
      ${orderByClause}
      LIMIT ${pageSize} 
      OFFSET ${offset}
    `;

    const result = await client.query(dataQuery, values);

    return {
      data: result.rows,
      pagination: {
        page,
        pageSize,
        total: totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
      },
    };
  });
}

// Optimized getAllPlates with pagination support
export async function getAllPlates(paginationOpts) {
  const pool = await getPool();
  const {
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    sortBy = "first_seen_at",
    sortDesc = true,
    filters = {},
  } = paginationOpts || {};

  const offset = (page - 1) * pageSize;
  let paramIndex = 1;
  let conditions = [];
  let values = [];

  if (filters.search) {
    conditions.push(`p.plate_number ILIKE $${paramIndex} OR      
      kp.name ILIKE $${paramIndex} OR
      kp.notes ILIKE $${paramIndex}`);
    values.push(`%${filters.search}%`);
    paramIndex++;
  }

  if (filters.tag) {
    if (filters.tag === "untagged") {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM plate_tags pt2 
        WHERE pt2.plate_number = p.plate_number
      )`);
    } else {
      conditions.push(`EXISTS (
        SELECT 1 FROM plate_tags pt2 
        JOIN tags t2 ON pt2.tag_id = t2.id 
        WHERE pt2.plate_number = p.plate_number 
        AND t2.name = $${paramIndex}
      )`);
      values.push(filters.tag);
      paramIndex++;
    }
  }

  if (filters.dateRange?.from && filters.dateRange?.to) {
    conditions.push(
      `p.first_seen_at::date BETWEEN $${paramIndex} AND $${paramIndex + 1}`
    );
    values.push(filters.dateRange.from, filters.dateRange.to);
    paramIndex += 2;
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    // Get total count first
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM plates p 
       LEFT JOIN known_plates kp ON p.plate_number = kp.plate_number
       ${whereClause}`,
      values
    );

    const result = await pool.query(
      `
      WITH plate_data AS (
        SELECT 
          p.plate_number,
          p.first_seen_at,
          p.created_at,
          p.flagged,
          kp.name,
          kp.notes,
          COUNT(pr.id) as occurrence_count,
          MAX(pr.timestamp) as last_seen_at
        FROM plates p
        LEFT JOIN plate_reads pr ON p.plate_number = pr.plate_number
        LEFT JOIN known_plates kp ON p.plate_number = kp.plate_number
        ${whereClause}
        GROUP BY 
          p.plate_number,
          p.first_seen_at,
          p.created_at,
          p.flagged,
          kp.name,
          kp.notes
        ORDER BY ${sortBy === "last_seen_at" ? "MAX(pr.timestamp)" : sortBy} 
        ${sortDesc ? "DESC NULLS LAST" : "ASC NULLS LAST"}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      )
      SELECT 
        pd.*,
        COALESCE(
          array_agg(
            CASE WHEN t.name IS NOT NULL 
            THEN jsonb_build_object('name', t.name, 'color', t.color)
            END
          ) FILTER (WHERE t.name IS NOT NULL),
          ARRAY[]::jsonb[]
        ) as tags
      FROM plate_data pd
      LEFT JOIN plate_tags pt ON pd.plate_number = pt.plate_number
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY 
        pd.plate_number,
        pd.first_seen_at,
        pd.created_at,
        pd.flagged,
        pd.name,
        pd.notes,
        pd.occurrence_count,
        pd.last_seen_at
      ORDER BY ${sortBy === "last_seen_at" ? "last_seen_at" : `pd.${sortBy}`}
      ${sortDesc ? "DESC NULLS LAST" : "ASC NULLS LAST"}
    `,
      [...values, pageSize, offset]
    );

    return {
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        pageCount: Math.ceil(parseInt(countResult.rows[0].count) / pageSize),
        page,
        pageSize,
      },
    };
  } catch (error) {
    console.error("Error in getAllPlates:", error);
    throw error;
  }
}

export async function getFlaggedPlates() {
  const pool = await getPool();
  const query = `
    SELECT 
      p.plate_number,
      array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
        FILTER (WHERE t.name IS NOT NULL) as tags
    FROM plates p
    LEFT JOIN plate_tags pt ON p.plate_number = pt.plate_number
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.flagged = true
    GROUP BY p.plate_number
    ORDER BY p.plate_number`;

  const result = await pool.query(query);
  return result.rows;
}

export async function getNotificationPlates() {
  try {
    const pool = await getPool();
    const query = `
      SELECT 
        pn.*,
        array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
          FILTER (WHERE t.name IS NOT NULL) as tags
      FROM plate_notifications pn
      LEFT JOIN plate_tags pt ON pn.plate_number = pt.plate_number
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY pn.id, pn.plate_number, pn.enabled, pn.priority, pn.created_at, pn.updated_at
      ORDER BY pn.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error("Error fetching notification plates:", error);
    throw error;
  }
}

export async function addNotificationPlate(plateNumber) {
  const pool = await getPool();
  const query = `
    INSERT INTO plate_notifications (plate_number, priority)
    VALUES ($1, 1)
    ON CONFLICT ON CONSTRAINT plate_notifications_plate_number_key
    DO UPDATE
    SET enabled = true, updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  const result = await pool.query(query, [plateNumber]);
  return result.rows[0];
}

export async function updateNotificationPriorityDB(plateNumber, priority) {
  const pool = await getPool();
  const query = `
    UPDATE plate_notifications
    SET priority = $2, updated_at = CURRENT_TIMESTAMP
    WHERE plate_number = $1
    RETURNING *
  `;
  const result = await pool.query(query, [plateNumber, priority]);
  return result.rows[0];
}

export async function toggleNotification(plateNumber, enabled) {
  const pool = await getPool();
  const query = `
    UPDATE plate_notifications
    SET enabled = $2, updated_at = CURRENT_TIMESTAMP
    WHERE plate_number = $1
    RETURNING *
  `;
  const result = await pool.query(query, [plateNumber, enabled]);
  return result.rows[0];
}

export async function deleteNotification(plateNumber) {
  const pool = await getPool();
  const query = `DELETE FROM plate_notifications WHERE plate_number = $1`;
  await pool.query(query, [plateNumber]);
}

export async function checkPlateForNotification(plateNumber) {
  const pool = await getPool();
  const query = `
    SELECT * FROM plate_notifications
    WHERE plate_number = $1 AND enabled = true
  `;
  const result = await pool.query(query, [plateNumber]);
  return result.rows[0];
}

export async function checkPlateForMqttNotification(plateNumber) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      SELECT mn.* FROM mqttnotifications mn
      WHERE mn.plate_number = $1 AND mn.enabled = true
      LIMIT 1
    `,
      [plateNumber]
    );
    return result.rows[0];
  });
}

export async function getPlateDetails(plateNumber) {
  const pool = await getPool();
  const query = `
    SELECT 
      p.notes, 
      p.name,
      pn.priority,
      pn.enabled
    FROM plates p
    LEFT JOIN plate_notifications pn ON p.plate_number = pn.plate_number
    WHERE p.plate_number = $1
  `;
  const result = await pool.query(query, [plateNumber]);
  return result.rows[0];
}

export async function getMetrics(startDate, endDate, cameraName = null) {
  const pool = await getPool();
  const query = `
      WITH daily_stats AS (
        SELECT 
          COUNT(DISTINCT plate_number) as unique_plates,
          COUNT(*) as total_reads
        FROM plate_reads 
        WHERE timestamp > $2::timestamp with time zone 
          AND timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR camera_name = $3)
      ),
      new_plates_stats AS (
        SELECT COUNT(DISTINCT plate_number) as new_plates_count
        FROM plate_reads
        WHERE timestamp > $2::timestamp with time zone 
          AND timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR camera_name = $3)
          AND plate_number NOT IN (
            SELECT DISTINCT plate_number 
            FROM plate_reads 
            WHERE timestamp <= $2::timestamp with time zone
              AND ($3::text IS NULL OR camera_name = $3)
          )
      ),
      suspicious_all_time AS (
        SELECT COUNT(DISTINCT pr.plate_number) as suspicious_count
        FROM plate_reads pr
        JOIN plate_tags pt ON pr.plate_number = pt.plate_number
        JOIN tags t ON pt.tag_id = t.id
        WHERE t.name = 'Suspicious'
          AND ($3::text IS NULL OR pr.camera_name = $3)
      ),
      time_data AS (
        SELECT 
          timestamp,
          EXTRACT(HOUR FROM timestamp)::integer as hour,
          1 as frequency
        FROM plate_reads
        WHERE timestamp > $2::timestamp with time zone 
          AND timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR camera_name = $3)
      ),
      tag_stats AS (
        SELECT 
          t.name as category,
          t.color,
          COUNT(DISTINCT pr.plate_number) as count
        FROM plate_reads pr
        JOIN plate_tags pt ON pr.plate_number = pt.plate_number
        JOIN tags t ON pt.tag_id = t.id
        WHERE pr.timestamp > $2::timestamp with time zone 
          AND pr.timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR pr.camera_name = $3)
        GROUP BY t.name, t.color
        ORDER BY count DESC
      ),
      camera_stats AS (
        SELECT 
          COALESCE(camera_name, 'Unknown') as camera_name,
          COUNT(*) as read_count
        FROM plate_reads
        WHERE timestamp > $2::timestamp with time zone 
          AND timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR camera_name = $3)
        GROUP BY camera_name
        ORDER BY read_count DESC
      ),
      top_plates AS (
        SELECT 
          pr.plate_number,
          COUNT(*) as occurrence_count,
          kp.name as known_name,
          array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
            FILTER (WHERE t.name IS NOT NULL) as tags,
          (
            SELECT json_agg(json_build_object(
              'timestamp', pr2.timestamp,
              'image_data', pr2.image_data,
              'thumbnail_path', pr2.thumbnail_path
            ))
            FROM (
              SELECT timestamp, image_data, thumbnail_path
              FROM plate_reads pr_sub
              WHERE pr_sub.plate_number = pr.plate_number
                AND pr_sub.timestamp > $2::timestamp with time zone 
                AND pr_sub.timestamp <= $1::timestamp with time zone
                AND ($3::text IS NULL OR pr_sub.camera_name = $3)
              ORDER BY timestamp DESC
              LIMIT 4
            ) pr2
          ) as recent_images
        FROM plate_reads pr
        LEFT JOIN known_plates kp ON pr.plate_number = kp.plate_number
        LEFT JOIN plate_tags pt ON pr.plate_number = pt.plate_number
        LEFT JOIN tags t ON pt.tag_id = t.id
        WHERE pr.timestamp > $2::timestamp with time zone 
          AND pr.timestamp <= $1::timestamp with time zone
          AND ($3::text IS NULL OR pr.camera_name = $3)
        GROUP BY pr.plate_number, kp.name
        ORDER BY COUNT(*) DESC
        LIMIT 10
      ),
      total_plates AS (
        SELECT COUNT(DISTINCT plate_number) as total_plates_count
        FROM plates
      )
      SELECT 
        d.unique_plates,
        d.total_reads,
        n.new_plates_count,
        s.suspicious_count,
        tp.total_plates_count,
        (SELECT json_agg(json_build_object(
          'timestamp', timestamp,
          'hour', hour,
          'frequency', frequency
        )) FROM time_data) as time_data,
        (SELECT json_agg(json_build_object(
          'camera', camera_name,
          'read_count', read_count
        )) FROM camera_stats) as camera_counts,
        (SELECT json_agg(json_build_object(
          'plate', plate_number,
          'count', occurrence_count,
          'name', known_name,
          'tags', tags,
          'recent_images', recent_images
        )) FROM top_plates) as top_plates,
        (SELECT json_agg(json_build_object(
          'category', category,
          'color', color,
          'count', count
        )) FROM tag_stats) as tag_stats
    FROM daily_stats d, new_plates_stats n, suspicious_all_time s, total_plates tp
  `;

  const result = await pool.query(query, [endDate, startDate, cameraName]);
  return result.rows[0];
}

// New known plates management methods
export async function manageKnownPlate({
  plateNumber,
  name = null,
  notes = null,
  tags = [],
}) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Insert or update the plate
    const plateResult = await client.query(
      `INSERT INTO plates (plate_number, name, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (plate_number) DO UPDATE SET
         name = EXCLUDED.name,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [plateNumber, name, notes]
    );

    // Handle tags if provided
    if (tags.length > 0) {
      // Remove existing tags
      await client.query(`DELETE FROM plate_tags WHERE plate_number = $1`, [
        plateNumber,
      ]);

      // Add new tags
      const tagQuery = `
        INSERT INTO plate_tags (plate_number, tag_id)
        SELECT $1, id FROM tags WHERE name = ANY($2)
        ON CONFLICT (plate_number, tag_id) DO NOTHING
      `;
      await client.query(tagQuery, [plateNumber, tags]);
    }

    // Get the complete plate data with tags
    const finalResult = await client.query(
      `SELECT 
        p.*,
        array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags
       FROM plates p
       LEFT JOIN plate_tags pt ON p.plate_number = pt.plate_number
       LEFT JOIN tags t ON pt.tag_id = t.id
       WHERE p.plate_number = $1
       GROUP BY p.plate_number, p.name, p.notes, p.first_seen_at, p.created_at, p.updated_at`,
      [plateNumber]
    );

    await client.query("COMMIT");
    return finalResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getKnownPlates() {
  const pool = await getPool();
  console.log("getting known plates");
  const result = await pool.query(
    `SELECT 
      kp.plate_number,
      kp.name,
      kp.notes,
      kp.ignore,
      kp.created_at,
      array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as tags,
      (SELECT flagged FROM plates WHERE plate_number = kp.plate_number LIMIT 1) as flagged
     FROM known_plates kp
     LEFT JOIN plate_tags pt ON kp.plate_number = pt.plate_number
     LEFT JOIN tags t ON pt.tag_id = t.id
     GROUP BY kp.plate_number, kp.name, kp.notes, kp.ignore, kp.created_at
     ORDER BY kp.created_at DESC`
  );
  return result.rows;
}

// Add/Update a known plate
export async function updateKnownPlate(plateNumber, { name, notes }) {
  const pool = await getPool();
  const result = await pool.query(
    `INSERT INTO known_plates (plate_number, name, notes)
     VALUES ($1, $2, $3)
     ON CONFLICT (plate_number) 
     DO UPDATE SET 
       name = EXCLUDED.name,
       notes = EXCLUDED.notes
     RETURNING *`,
    [plateNumber, name, notes]
  );
  return result.rows[0];
}

// Tag Management
export async function getAvailableTags() {
  return withClient(async (client) => {
    const result = await client.query("SELECT * FROM tags ORDER BY name");
    return result.rows;
  });
}

export async function createTag(name, color = "#808080") {
  const pool = await getPool();
  const result = await pool.query(
    `INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *`,
    [name, color]
  );
  return result.rows[0];
}

export async function updateTagColor(name, color) {
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE tags SET color = $2 WHERE name = $1 RETURNING *`,
    [name, color]
  );
  return result.rows[0];
}

export async function updateTagName(originalName, newName) {
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE tags SET name = $2 WHERE name = $1 RETURNING *`,
    [originalName, newName]
  );
  return result.rows[0];
}

export async function deleteTag(name) {
  const pool = await getPool();
  await pool.query("DELETE FROM tags WHERE name = $1", [name]);
}

// Plate Tag Management
export async function addTagToPlate(plateNumber, tagName) {
  const pool = await getPool();
  await pool.query(
    `INSERT INTO plate_tags (plate_number, tag_id)
     SELECT $1, id FROM tags WHERE name = $2
     ON CONFLICT (plate_number, tag_id) DO NOTHING`,
    [plateNumber, tagName]
  );
}

export async function getTagsForPlate(plateNumber) {
  const pool = await getPool();
  const result = await pool.query(
    `SELECT t.name 
     FROM plate_tags pt 
     JOIN tags t ON pt.tag_id = t.id 
     WHERE pt.plate_number = $1`,
    [plateNumber]
  );
  return result.rows.map((row) => row.name);
}

export async function removeTagFromPlate(plateNumber, tagName) {
  const pool = await getPool();
  await pool.query(
    `DELETE FROM plate_tags 
     WHERE plate_number = $1 
     AND tag_id = (SELECT id FROM tags WHERE name = $2)`,
    [plateNumber, tagName]
  );
}

export async function getPlateHistory(plateNumber) {
  const pool = await getPool();
  const result = await pool.query(
    `
    SELECT 
      pr.*,
      kp.name as known_name,
      kp.notes,
      array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
        FILTER (WHERE t.name IS NOT NULL) as tags
    FROM plate_reads pr
    LEFT JOIN known_plates kp ON pr.plate_number = kp.plate_number
    LEFT JOIN plate_tags pt ON pr.plate_number = pt.plate_number
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE pr.plate_number = $1
    GROUP BY 
      pr.id, 
      pr.plate_number, 
      pr.image_data, 
      pr.image_path, 
      pr.thumbnail_path,
      pr.timestamp, 
      kp.name, 
      kp.notes
    ORDER BY pr.timestamp DESC`,
    [plateNumber]
  );
  return result.rows;
}

export async function removeKnownPlate(plateNumber) {
  const pool = await getPool();
  await pool.query("DELETE FROM known_plates WHERE plate_number = $1", [
    plateNumber,
  ]);
}

export async function removePlate(plateNumber) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM plates 
       WHERE plate_number = $1`,
      [plateNumber]
    );

    await client.query(
      `DELETE FROM known_plates 
       WHERE plate_number = $1`,
      [plateNumber]
    );

    await client.query(
      `DELETE FROM plate_tags 
       WHERE plate_number = $1`,
      [plateNumber]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error removing plate:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function removePlateRead(id) {
  const pool = await getPool();
  await pool.query("DELETE FROM plate_reads WHERE id = $1", [id]);
}

export async function togglePlateFlag(plateNumber, flagged) {
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE plates 
     SET flagged = $1
     WHERE plate_number = $2
     RETURNING *`,
    [flagged, plateNumber]
  );

  return result.rows[0];
}

export async function getPlateInsights(plateNumber) {
  const pool = await getPool();
  const result = await pool.query(
    `
    WITH recent_reads AS (
      SELECT 
        timestamp,
        image_data,
        image_path,
        thumbnail_path
      FROM plate_reads
      WHERE plate_number = $1
      ORDER BY timestamp DESC
      LIMIT 7
    )
    SELECT
      p.plate_number,
      p.first_seen_at,
      COUNT(pr.id) as total_occurrences,
      MAX(pr.timestamp) as last_seen_at,
      array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
        FILTER (WHERE t.name IS NOT NULL) as tags,
      (SELECT json_agg(json_build_object(
        'timestamp', timestamp,
        'hour', EXTRACT(HOUR FROM timestamp),
        'frequency', 1
      )) FROM plate_reads WHERE plate_number = $1) as time_data,
      (SELECT json_agg(json_build_object(
        'timestamp', timestamp,
        'imageData', image_data,
        'image_path', image_path,
        'thumbnail_path', thumbnail_path
      )) FROM recent_reads) as recent_reads,
      kp.name as known_name,
      kp.notes
    FROM plates p
    LEFT JOIN plate_reads pr ON p.plate_number = pr.plate_number
    LEFT JOIN known_plates kp ON p.plate_number = kp.plate_number
    LEFT JOIN plate_tags pt ON p.plate_number = pt.plate_number
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.plate_number = $1
    GROUP BY p.plate_number, p.first_seen_at, kp.name, kp.notes
  `,
    [plateNumber]
  );
  return result.rows[0];
}

export async function cleanupOldRecords(maxRecords) {
  const pool = await getPool();

  try {
    // First check if we're over the threshold
    const {
      rows: [{ count }],
    } = await pool.query("SELECT COUNT(*) as count FROM plate_reads");

    console.log(
      `Current plate_reads count: ${count}, threshold: ${maxRecords * 1.1}`
    );

    // Only cleanup if we're 10% over the limit
    if (count > maxRecords * 1.1) {
      const deleteResult = await pool.query(
        `
        DELETE FROM plate_reads 
        WHERE id IN (
          SELECT id FROM plate_reads
          ORDER BY timestamp ASC
          LIMIT (SELECT COUNT(*) - $1 FROM plate_reads)
        )
        `,
        [maxRecords]
      );

      console.log(`Cleaned up ${deleteResult.rowCount} old records`);
    }
  } catch (error) {
    console.error("Error cleaning up old records:", error);
    throw error;
  }
}

export async function getDistinctCameraNames() {
  return withClient(async (client) => {
    const query = `
      SELECT DISTINCT camera_name 
      FROM plate_reads 
      WHERE camera_name IS NOT NULL 
      ORDER BY camera_name`;

    const result = await client.query(query);
    return result.rows.map((row) => row.camera_name);
  });
}

export async function updatePlateRead(readId, newPlateNumber) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE plate_reads 
       SET plate_number = $1, validated = true 
       WHERE id = $2`,
      [newPlateNumber, readId]
    );

    // Create new entry in plates table instead of updating the old one to prevent data loss in edge case where the misread is a real plate
    await client.query(
      `INSERT INTO plates (plate_number)
       VALUES ($1)
       ON CONFLICT (plate_number) DO NOTHING`,
      [newPlateNumber]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAllPlateReads(oldPlateNumber, newPlateNumber) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE plate_reads 
       SET plate_number = $1, validated = true 
       WHERE plate_number = $2
       RETURNING id`,
      [newPlateNumber, oldPlateNumber]
    );

    console.log(
      `Corrected ${result.rowCount} plate reads from ${oldPlateNumber} to ${newPlateNumber} and set Validated=True`
    );

    await client.query(
      `INSERT INTO plates (plate_number)
       VALUES ($1)
       ON CONFLICT (plate_number) DO NOTHING`,
      [newPlateNumber]
    );

    await client.query("COMMIT");

    return result.rowCount; // Return number of updated records
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating all plate reads:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function togglePlateIgnore(plateNumber, ignore) {
  const pool = await getPool();
  const result = await pool.query(
    `UPDATE known_plates 
     SET ignore = $1
     WHERE plate_number = $2
     RETURNING *`,
    [ignore, plateNumber]
  );

  return result.rows[0];
}

export async function isPlateIgnored(plateNumber) {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT ignore FROM known_plates WHERE plate_number = $1 AND ignore = true`,
      [plateNumber]
    );
    return result.rows.length > 0;
  });
}

export async function getPlateImagePreviews(plateNumber, startDate, endDate) {
  return withClient(async (client) => {
    const query = `
    SELECT 
      thumbnail_path,
      image_data,
      timestamp
    FROM plate_reads
    WHERE plate_number = $1
      AND timestamp > $2::timestamp with time zone 
      AND timestamp <= $3::timestamp with time zone
    ORDER BY timestamp DESC
    LIMIT 4
  `;

    const result = await client.query(query, [plateNumber, startDate, endDate]);
    return result.rows;
  });
}

export async function backfillOccurrenceCounts() {
  return withClient(async (client) => {
    try {
      await client.query(`
        WITH plate_counts AS (
          SELECT plate_number, COUNT(*) as count
          FROM plate_reads
          GROUP BY plate_number
        )
        UPDATE plates p
        SET occurrence_count = pc.count
        FROM plate_counts pc
        WHERE p.plate_number = pc.plate_number
      `);

      return { success: true };
    } catch (error) {
      console.error("Error backfilling occurrence counts:", error);
      return { success: false, error: error.message };
    }
  });
}

export async function getRecordsToMigrate(batchSize = 100, lastId = 0) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      SELECT id, plate_number, image_data, timestamp 
      FROM plate_reads 
      WHERE id > $1 
        AND image_data IS NOT NULL 
        AND (image_path IS NULL OR thumbnail_path IS NULL)
      ORDER BY id
      LIMIT $2
    `,
      [lastId, batchSize]
    );
    return result.rows;
  });
}
//progress?
export async function getTotalRecordsToMigrate() {
  return withClient(async (client) => {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM plate_reads 
      WHERE image_data IS NOT NULL 
        AND (image_path IS NULL OR thumbnail_path IS NULL)
    `);
    return parseInt(result.rows[0].count);
  });
}

export async function updateImagePathsBatch(updates) {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const { id, imagePath, thumbnailPath } of updates) {
        await client.query(
          `UPDATE plate_reads 
           SET image_path = $1, thumbnail_path = $2 
           WHERE id = $3`,
          [imagePath, thumbnailPath, id]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function clearImageDataBatch(batchSize = 1000) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      WITH updated_records AS (
        UPDATE plate_reads 
        SET image_data = NULL 
        WHERE id IN (
          SELECT id 
          FROM plate_reads 
          WHERE image_data IS NOT NULL 
            AND image_path IS NOT NULL 
            AND thumbnail_path IS NOT NULL
          LIMIT $1
        )
        RETURNING id
      )
      SELECT COUNT(*) as count FROM updated_records
    `,
      [batchSize]
    );
    return parseInt(result.rows[0].count);
  });
}

export async function getEarliestPlateData() {
  return withClient(async (client) => {
    const result = await client.query(
      `
      SELECT 
        plate_number,
        first_seen_at,
        created_at
      FROM plates 
      ORDER BY first_seen_at ASC 
      LIMIT 1
      `
    );
    return result.rows[0] || null;
  });
}

export async function getTotalPlatesCount() {
  return withClient(async (client) => {
    const result = await client.query(`SELECT COUNT(*) as total FROM plates`);
    return parseInt(result.rows[0].total);
  });
}

export async function checkUpdateStatus() {
  return withClient(async (client) => {
    const result = await client.query(
      `SELECT update1 FROM devmgmt WHERE id = 1`
    );
    return result.rows[0]?.update1 || false;
  });
}

export async function markUpdateComplete() {
  return withClient(async (client) => {
    await client.query(`UPDATE devmgmt SET update1 = true WHERE id = 1`);
    return true;
  });
}

export async function verifyImageMigration() {
  return withClient(async (client) => {
    // First check if there are any plates at all
    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM plate_reads
    `);

    const totalPlates = parseInt(totalResult.rows[0].count);

    // If no plates exist yet, consider migration complete
    if (totalPlates === 0) {
      return {
        success: true,
        isComplete: true,
        incompleteCount: 0,
      };
    }

    // Otherwise check for incomplete migrations
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM plate_reads 
      WHERE image_data IS NOT NULL 
        AND (image_path IS NULL OR thumbnail_path IS NULL)
    `);

    const incompleteCount = parseInt(result.rows[0].count);

    return {
      success: true,
      isComplete: incompleteCount === 0,
      incompleteCount,
    };
  });
}

export async function getTrainingRecordCount() {
  return withClient(async (client) => {
    try {
      // Get the last processed record ID
      const lastRecordResult = await client.query(`
        SELECT training_last_record FROM devmgmt LIMIT 1
      `);
      const lastRecordId = lastRecordResult.rows[0]?.training_last_record || 0;

      // Get the latest record ID in plate_reads
      const latestIdResult = await client.query(`
        SELECT MAX(id) as max_id FROM plate_reads
      `);
      const latestId = latestIdResult.rows[0]?.max_id || 0;

      return {
        lastRecordId,
        latestId,
        newRecordsCount: Math.max(0, latestId - lastRecordId),
      };
    } catch (error) {
      console.error("Error checking training record count:", error);
      throw error;
    }
  });
}

export async function confirmPlateRecord(readId, value = true) {
  return withClient(async (client) => {
    await client.query(
      `UPDATE plate_reads 
       SET validated = $2
       WHERE id = $1`,
      [readId, value]
    );
    return { success: true };
  });
}

// MQTT Broker Management
export async function getMqttBrokers() {
  return withClient(async (client) => {
    const result = await client.query(`
      SELECT id, name, broker, port, topic, use_tls 
      FROM mqttbrokers 
      ORDER BY name
    `);
    return result.rows;
  });
}

export async function getMqttBrokerInfo(id) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      SELECT * FROM mqttbrokers WHERE id = $1
    `,
      [id]
    );
    return result.rows[0];
  });
}

export async function addMqttBroker(
  name,
  broker,
  port,
  topic,
  username,
  password,
  useTls = false
) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      INSERT INTO mqttbrokers (name, broker, port, topic, username, password, use_tls)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [name, broker, port, topic, username, password, useTls]
    );
    return result.rows[0];
  });
}

export async function editMqttBroker(
  id,
  name,
  broker,
  port,
  topic,
  username,
  password,
  useTls
) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      UPDATE mqttbrokers 
      SET name = $2, broker = $3, port = $4, topic = $5, username = $6, password = $7, use_tls = $8
      WHERE id = $1
      RETURNING *
    `,
      [id, name, broker, port, topic, username, password, useTls]
    );
    return result.rows[0];
  });
}

export async function deleteMqttBroker(id) {
  return withClient(async (client) => {
    await client.query(`DELETE FROM mqttbrokers WHERE id = $1`, [id]);
    return { success: true };
  });
}

// MQTT Notification Management
export async function addMqttNotification(
  plateNumber,
  name,
  brokerId,
  message,
  includeKnownPlateInfo = true,
  enabled = true
) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      INSERT INTO mqttnotifications (plate_number, name, brokerid, message, includeKnownPlateInfo, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [plateNumber, name, brokerId, message, includeKnownPlateInfo, enabled]
    );
    return result.rows[0];
  });
}

export async function getMqttNotifications() {
  return withClient(async (client) => {
    const result = await client.query(`
      SELECT 
        mn.*,
        mb.name as broker_name,
        mb.broker as broker_url,
        mb.port as broker_port,
        mb.topic as broker_topic,
        mb.username as broker_username,
        mb.password as broker_password,
        mb.use_tls as broker_use_tls,
        array_agg(DISTINCT jsonb_build_object('name', t.name, 'color', t.color)) 
          FILTER (WHERE t.name IS NOT NULL) as tags
      FROM mqttnotifications mn
      LEFT JOIN mqttbrokers mb ON mn.brokerid = mb.id
      LEFT JOIN plate_tags pt ON mn.plate_number = pt.plate_number
      LEFT JOIN tags t ON pt.tag_id = t.id
      GROUP BY 
        mn.id, mn.plate_number, mn.name, mn.enabled, mn.brokerid, mn.message, mn.includeknownplateinfo,
        mb.name, mb.broker, mb.port, mb.topic, mb.username, mb.password, mb.use_tls
      ORDER BY mn.id DESC
    `);
    return result.rows;
  });
}

export async function editMqttNotification(
  id,
  plateNumber,
  name,
  brokerId,
  message,
  includeKnownPlateInfo
) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      UPDATE mqttnotifications 
      SET plate_number = $2, name = $3, brokerid = $4, message = $5, includeKnownPlateInfo = $6
      WHERE id = $1
      RETURNING *
    `,
      [id, plateNumber, name, brokerId, message, includeKnownPlateInfo]
    );
    return result.rows[0];
  });
}

export async function toggleMqttNotificationEnabled(id, enabled) {
  return withClient(async (client) => {
    const result = await client.query(
      `
      UPDATE mqttnotifications 
      SET enabled = $2
      WHERE id = $1
      RETURNING *
    `,
      [id, enabled]
    );
    return result.rows[0];
  });
}

export async function deleteMqttNotification(id) {
  return withClient(async (client) => {
    await client.query(`DELETE FROM mqttnotifications WHERE id = $1`, [id]);
    return { success: true };
  });
}

export async function addUnseenPlate(plate_number, flagged = false) {
  return withClient(async (client) => {
    const result = await client.query(
      `INSERT INTO plates (plate_number, flagged) VALUES ($1, $2)
       ON CONFLICT (plate_number) 
       DO UPDATE SET flagged = $2
       RETURNING *`,
      [plate_number, flagged]
    );
    return result.rows[0];
  });
}
