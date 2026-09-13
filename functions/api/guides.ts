interface Env {
  DB: D1Database;
  STORAGE: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const equipmentId = url.searchParams.get("equipment_id");
  const guideId = url.searchParams.get("id");
  const pendingOnly = url.searchParams.get("pending") === "true";

  try {
    // 1. Single Guide details with steps & equipment
    if (guideId) {
      const guide = await context.env.DB.prepare(
        `SELECT g.*, 
                json_object('id', e.id, 'name', e.name, 'slug', e.slug, 'image_url', e.image_url) as equipment 
         FROM guides g 
         LEFT JOIN equipment e ON g.equipment_id = e.id 
         WHERE g.id = ?`
      )
        .bind(guideId)
        .first();

      if (!guide) return new Response("Guide not found", { status: 404 });

      const { results: steps } = await context.env.DB.prepare(
        "SELECT * FROM guide_steps WHERE guide_id = ? ORDER BY step_number ASC"
      )
        .bind(guideId)
        .all();

      const { results: images } = await context.env.DB.prepare(
        "SELECT * FROM guide_images WHERE guide_id = ? ORDER BY order_index ASC"
      )
        .bind(guideId)
        .all();

      const formatted = {
        ...guide,
        equipment: typeof guide.equipment === "string" ? JSON.parse(guide.equipment) : guide.equipment,
        safety_ppe: guide.safety_ppe ? (typeof guide.safety_ppe === "string" ? JSON.parse(guide.safety_ppe) : guide.safety_ppe) : [],
        tools_required: guide.tools_required ? (typeof guide.tools_required === "string" ? JSON.parse(guide.tools_required) : guide.tools_required) : [],
        steps: (steps || []).map((st: any) => ({
          ...st,
          images: st.images ? (typeof st.images === "string" ? JSON.parse(st.images) : st.images) : [],
        })),
        images: images || [],
      };

      return Response.json(formatted);
    }

    // 2. Admin Pending Guides list (Strictly pending only)
    if (pendingOnly) {
      const { results } = await context.env.DB.prepare(
        `SELECT g.*, 
                json_object('id', e.id, 'name', e.name, 'slug', e.slug) as equipment 
         FROM guides g 
         LEFT JOIN equipment e ON g.equipment_id = e.id 
         WHERE g.status = 'pending' AND g.is_approved = 0
         ORDER BY g.created_at DESC`
      ).all();

      const formatted = (results || []).map((g: any) => ({
        ...g,
        equipment: typeof g.equipment === "string" ? JSON.parse(g.equipment) : g.equipment,
        safety_ppe: g.safety_ppe ? (typeof g.safety_ppe === "string" ? JSON.parse(g.safety_ppe) : g.safety_ppe) : [],
        tools_required: g.tools_required ? (typeof g.tools_required === "string" ? JSON.parse(g.tools_required) : g.tools_required) : [],
      }));

      return Response.json(formatted);
    }

    // 3. Approved Guides by Equipment
    if (equipmentId) {
      const { results } = await context.env.DB.prepare(
        "SELECT * FROM guides WHERE equipment_id = ? AND is_approved = 1 ORDER BY created_at DESC"
      )
        .bind(equipmentId)
        .all();

      const formatted = (results || []).map((g: any) => ({
        ...g,
        safety_ppe: g.safety_ppe ? (typeof g.safety_ppe === "string" ? JSON.parse(g.safety_ppe) : g.safety_ppe) : [],
        tools_required: g.tools_required ? (typeof g.tools_required === "string" ? JSON.parse(g.tools_required) : g.tools_required) : [],
      }));

      return Response.json(formatted);
    }

    // 4. All Approved Guides
    const { results } = await context.env.DB.prepare(
      `SELECT g.*, 
              json_object('id', e.id, 'name', e.name, 'slug', e.slug) as equipment 
       FROM guides g 
       LEFT JOIN equipment e ON g.equipment_id = e.id 
       WHERE g.is_approved = 1 
       ORDER BY g.created_at DESC`
    ).all();

    const formatted = (results || []).map((g: any) => ({
      ...g,
      equipment: typeof g.equipment === "string" ? JSON.parse(g.equipment) : g.equipment,
      safety_ppe: g.safety_ppe ? (typeof g.safety_ppe === "string" ? JSON.parse(g.safety_ppe) : g.safety_ppe) : [],
      tools_required: g.tools_required ? (typeof g.tools_required === "string" ? JSON.parse(g.tools_required) : g.tools_required) : [],
    }));

    return Response.json(formatted);
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

// Guide Submit (POST)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const data = (await context.request.json()) as any;
    const guideId = crypto.randomUUID();

    const ppeJson = JSON.stringify(data.safety_ppe || []);
    const toolsJson = JSON.stringify(data.tools_required || []);

    await context.env.DB.prepare(
      `INSERT INTO guides (
        id, equipment_id, title, author_email, author_phone, 
        symptom, safety_ppe, tools_required, introduction, 
        status, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`
    )
      .bind(
        guideId,
        data.equipment_id,
        data.title,
        data.author_email || null,
        data.author_phone || null,
        data.symptom || null,
        ppeJson,
        toolsJson,
        data.introduction || null
      )
      .run();

    if (data.steps && Array.isArray(data.steps)) {
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i];
        await context.env.DB.prepare(
          `INSERT INTO guide_steps (
            id, guide_id, step_number, title, instruction, warning, images
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            crypto.randomUUID(),
            guideId,
            step.step_number || i + 1,
            step.title || `Step ${i + 1}`,
            step.instruction || "",
            step.warning || null,
            JSON.stringify(step.images || [])
          )
          .run();
      }
    }

    if (data.image_urls && Array.isArray(data.image_urls)) {
      for (let i = 0; i < data.image_urls.length; i++) {
        const img = data.image_urls[i];
        const imgUrl = typeof img === "string" ? img : img.url;
        if (imgUrl) {
          await context.env.DB.prepare(
            `INSERT INTO guide_images (
              id, guide_id, caption, url, order_index
            ) VALUES (?, ?, ?, ?, ?)`
          )
            .bind(crypto.randomUUID(), guideId, img.name || img.caption || null, imgUrl, i)
            .run();
        }
      }
    }

    return Response.json({ success: true, id: guideId });
  } catch (err: any) {
    console.error("Guide creation error:", err);
    return new Response(err.message, { status: 500 });
  }
};

// Helper function to cleanup R2 storage images for a guide
async function deleteGuideR2Images(context: EventContext<Env, any, any>, guideId: string) {
  try {
    if (!context.env.STORAGE) return;

    // 1. Fetch images from guide_images table
    const { results: images } = await context.env.DB.prepare(
      "SELECT url FROM guide_images WHERE guide_id = ?"
    ).bind(guideId).all();

    for (const img of (images || [])) {
      try {
        const urlObj = new URL((img as any).url, "http://localhost");
        const key = urlObj.searchParams.get("key");
        if (key) {
          await context.env.STORAGE.delete(key);
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    // 2. Fetch step images from guide_steps table
    const { results: steps } = await context.env.DB.prepare(
      "SELECT images FROM guide_steps WHERE guide_id = ?"
    ).bind(guideId).all();

    for (const step of (steps || [])) {
      try {
        const imgs = JSON.parse((step as any).images || "[]");
        for (const imgItem of imgs) {
          const imgUrl = typeof imgItem === "string" ? imgItem : imgItem.url;
          if (imgUrl) {
            const urlObj = new URL(imgUrl, "http://localhost");
            const key = urlObj.searchParams.get("key");
            if (key) {
              await context.env.STORAGE.delete(key);
            }
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  } catch (err) {
    console.error("R2 cleanup error:", err);
  }
}

// Admin Approve / Reject (PATCH)
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const { id, action } = (await context.request.json()) as any;
    if (!id || !action) {
      return new Response("Missing id or action", { status: 400 });
    }

    if (action === "approve") {
      await context.env.DB.prepare(
        "UPDATE guides SET is_approved = 1, status = 'approved' WHERE id = ?"
      )
        .bind(id)
        .run();
      return Response.json({ success: true, message: "Guide approved" });
    }

    if (action === "reject") {
      // Clean up R2 storage files first
      await deleteGuideR2Images(context, id);

      // Clean up D1 database records
      await context.env.DB.prepare("DELETE FROM guide_steps WHERE guide_id = ?").bind(id).run();
      await context.env.DB.prepare("DELETE FROM guide_images WHERE guide_id = ?").bind(id).run();
      await context.env.DB.prepare("DELETE FROM bookmarks WHERE guide_id = ?").bind(id).run();
      await context.env.DB.prepare("DELETE FROM guides WHERE id = ?").bind(id).run();

      return Response.json({ success: true, message: "Guide rejected and permanently deleted from database & storage" });
    }

    return new Response("Invalid action", { status: 400 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

// Permanent Admin Delete (DELETE)
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const guideId = url.searchParams.get("id");

    if (!guideId) {
      return new Response("Missing guide ID", { status: 400 });
    }

    // Clean up R2 storage files first
    await deleteGuideR2Images(context, guideId);

    // Clean up D1 database records
    await context.env.DB.prepare("DELETE FROM guide_steps WHERE guide_id = ?").bind(guideId).run();
    await context.env.DB.prepare("DELETE FROM guide_images WHERE guide_id = ?").bind(guideId).run();
    await context.env.DB.prepare("DELETE FROM bookmarks WHERE guide_id = ?").bind(guideId).run();
    await context.env.DB.prepare("DELETE FROM guides WHERE id = ?").bind(guideId).run();

    return Response.json({ success: true, message: "Guide deleted permanently from database & storage" });
  } catch (err: any) {
    console.error("Delete error:", err);
    return new Response(err.message, { status: 500 });
  }
};