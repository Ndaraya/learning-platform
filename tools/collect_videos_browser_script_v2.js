/**
 * v2 — Uses the LearnPress AJAX endpoint to load actual lesson content.
 *
 * HOW TO USE:
 *   1. Go to https://eddify.co/course/sat-and-act-math/ (the course page) and log in
 *   2. Open DevTools → Console (F12), type "allow pasting", press Enter
 *   3. Paste this entire script and press Enter
 *   4. Wait ~3 minutes for all 72 lessons
 *   5. Copy the JSON output that appears at the end
 */

(async () => {
  const courseUrl = 'https://eddify.co/course/sat-and-act-math/';

  // Step 1: Fetch the course page to extract item IDs and nonce
  console.log('Fetching course page...');
  const courseResp = await fetch(courseUrl, { credentials: 'include' });
  const courseHtml = await courseResp.text();

  // Extract nonce from lpData
  const nonceMatch = courseHtml.match(/"nonce"\s*:\s*"([a-f0-9]+)"/);
  const nonce = nonceMatch ? nonceMatch[1] : null;
  console.log('Nonce:', nonce);

  // Extract course WP ID
  const courseIdMatch = courseHtml.match(/["\s]course[_-]id["']?\s*[:=]\s*["']?(\d+)/i)
    || courseHtml.match(/"item_id"\s*:\s*(\d+)/)
    || courseHtml.match(/post-(\d+)\s/);
  console.log('Course ID match attempt:', courseIdMatch ? courseIdMatch[0] : 'not found');

  // Extract all lesson items: data-item-id + title from the curriculum list
  const itemRe = /data-item-id="(\d+)"[^>]*data-item-type="lp_lesson"[^>]*>[\s\S]*?course-item-title[^>]*>([\s\S]*?)<\/div>/g;
  const items = [];
  let m;
  while ((m = itemRe.exec(courseHtml)) !== null) {
    const itemId = m[1];
    const title  = m[2].replace(/<[^>]+>/g, '').trim();
    items.push({ itemId, title });
  }
  console.log(`Found ${items.length} lesson items.`);

  if (items.length === 0) {
    console.error('No items found — check selectors. Dumping first 2000 chars:');
    console.log(courseHtml.substring(0, 2000));
    return;
  }

  // Step 2: For each item, call the LP AJAX endpoint
  const ajaxUrl   = 'https://eddify.co/wp-json/lp/v1/load_content_via_ajax/';
  const adminAjax = 'https://eddify.co/wp-admin/admin-ajax.php';

  const ytRe  = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i;
  const ytRe2 = /youtu\.be\/([\w-]{11})/i;
  const viRe  = /vimeo\.com\/(?:video\/)?(\d+)/i;

  function extractVideo(text) {
    let hit = text.match(ytRe) || text.match(ytRe2);
    if (hit) return `https://www.youtube.com/watch?v=${hit[1]}`;
    hit = text.match(viRe);
    if (hit) return `https://vimeo.com/${hit[1]}`;
    return null;
  }

  const results = [];

  for (let i = 0; i < items.length; i++) {
    const { itemId, title } = items[i];
    let videoUrl = null;

    try {
      // Try LP REST API first
      const params = new URLSearchParams({ item_id: itemId });
      if (nonce) params.append('nonce', nonce);

      const r = await fetch(`${ajaxUrl}?${params}`, {
        credentials: 'include',
        headers: nonce ? { 'X-WP-Nonce': nonce } : {},
      });
      const text = await r.text();

      videoUrl = extractVideo(text);

      // If nothing, try the JSON body for an html field
      if (!videoUrl) {
        try {
          const json = JSON.parse(text);
          const inner = JSON.stringify(json);
          videoUrl = extractVideo(inner);
        } catch {}
      }

      // Fallback: try admin-ajax.php
      if (!videoUrl) {
        const fd = new FormData();
        fd.append('action',   'lp_item_content');
        fd.append('item_id',   itemId);
        if (nonce) fd.append('nonce', nonce);

        const r2 = await fetch(adminAjax, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const text2 = await r2.text();
        videoUrl = extractVideo(text2);
      }
    } catch (e) {
      console.warn(`  Error on ${title}:`, String(e));
    }

    results.push({ itemId, title, videoUrl });

    if (videoUrl) {
      console.log(`  [${i+1}/${items.length}] ${title.substring(0,45)} -> ${videoUrl}`);
    } else if ((i + 1) % 10 === 0) {
      console.log(`  ${i+1}/${items.length} done (no video yet for this batch)`);
    }

    await new Promise(r => setTimeout(r, 400));
  }

  const withVideo = results.filter(r => r.videoUrl).length;
  console.log(`\nDone. ${withVideo}/${results.length} lessons have video URLs.`);
  console.log('\n=== COPY EVERYTHING BELOW THIS LINE ===\n');
  console.log(JSON.stringify(results, null, 2));
})();
