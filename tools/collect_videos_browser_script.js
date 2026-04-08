/**
 * Run this in your browser console while logged into eddify.co
 * (any page on the site will work — you just need to be logged in)
 *
 * It fetches each lesson page and extracts the YouTube/Vimeo video URL.
 * When finished, it prints a JSON array you can paste back.
 *
 * HOW TO USE:
 *   1. Go to https://eddify.co and log in as admin
 *   2. Open DevTools → Console  (F12 or Cmd+Option+J)
 *   3. Paste this entire script and press Enter
 *   4. Wait ~2 minutes for all 72 lessons to be fetched
 *   5. Copy the JSON output that appears at the end
 */

(async () => {
  const lessons = [
    // Module 1: Requirements & Resources
    { url: "https://eddify.co/course/sat-and-act-math/lessons/sat-math-requirements/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/official-sat-practice-tests/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/sat-calendar/" },
    // Module 2: Questions & Office Hours
    { url: "https://eddify.co/course/sat-and-act-math/lessons/submit-math-questions/" },
    // Module 3: Integers
    { url: "https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/multiplication-division/" },
    // Module 4: Fractions
    { url: "https://eddify.co/course/sat-and-act-math/lessons/fractions-introduction/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/fraction-addition-subtraction/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/fraction-multiplication-division/" },
    // Module 5: Order of Operations
    { url: "https://eddify.co/course/sat-and-act-math/lessons/pemdas/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/number-operations-practice/" },
    // Module 6: Properties of Exponents & Radicals
    { url: "https://eddify.co/course/sat-and-act-math/lessons/properties-of-exponents/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/introduction-to-radicals/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/adding-and-subtracting-radicals/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/multiplying-and-dividing-radicals/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/rationalizing-conjugates/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/qbank-more-practice-questions/" },
    // Module 7: Complex Numbers
    { url: "https://eddify.co/course/sat-and-act-math/lessons/imaginary-number-i/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/addition-subtraction-and-multiplication/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/division-conjugates/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/complex-s-sat-act-questions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/qbank-more-practice-questions-2/" },
    // Module 8: Linear Functions
    { url: "https://eddify.co/course/sat-and-act-math/lessons/converting-between-forms/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/graphing/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/linear-functions-sat-act-qs/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/qbank-more-practice-questions-3/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/qbank-interpreting-linear-equations/" },
    // Module 9: Systems of Equations
    { url: "https://eddify.co/course/sat-and-act-math/lessons/systems-introduction/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/solving-systems/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/mixture-problems-coming-soon/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/systems-sat-act-qs/" },
    // Module 10: Function Notation
    { url: "https://eddify.co/course/sat-and-act-math/lessons/function-notation-composition/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/function-notation-sat-act-qs/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/qbank-more-practice-questions-4/" },
    // Module 11: Quadratic Functions
    { url: "https://eddify.co/course/sat-and-act-math/lessons/forms-converting-forms/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/graphing-2/" },
    // Module 12: Factoring
    { url: "https://eddify.co/course/sat-and-act-math/lessons/gcf-grouping/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/quadratic-equations/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/sum-difference-of-cubes/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/factoring-sat-act-questions/" },
    // Module 13: Polynomial Division
    { url: "https://eddify.co/course/sat-and-act-math/lessons/long-and-synthetic-division/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/polynomial-division-sat-act-qs/" },
    // Module 14: Similarity
    { url: "https://eddify.co/course/sat-and-act-math/lessons/similar-figures/" },
    // Module 15: Lines, Angles, & Triangles
    { url: "https://eddify.co/course/sat-and-act-math/lessons/lines-angle-relationships/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/degrees-radians-regular-polygons/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/lines-angles-sat-act-questions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/types-of-triangles-trigonometry/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/special-right-complimentary-angles/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/triangles-sat-act-questions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/practice-lines-angles-triangles-easy-medium/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/practice-lines-angles-triangles-hard/" },
    // Module 16: Circles
    { url: "https://eddify.co/course/sat-and-act-math/lessons/area-of-sector-and-arc-length/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/sector-and-arc-sat-act-questions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/standard-general-formula-of-circles/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/circle-formula-sat-act-questions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/circles-practice-questions-hard/" },
    // Module 17: Parent Functions & Transformations
    { url: "https://eddify.co/course/sat-and-act-math/lessons/identifying-functions/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/parent-functions-transformations/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/transformations-exploration-desmos/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/parent-functions-transformations-practice/" },
    // Module 18: Data & Statistics
    { url: "https://eddify.co/course/sat-and-act-math/lessons/fundamental-counting-principle/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/intro-to-probability/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/andor-probability/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/mean-median-mode/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/mean-median-mode-practice/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/correlation/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/two-way-frequency-tables/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/fcm-probability-frequency-practice/" },
    // Module 19: ACT Special Topics
    { url: "https://eddify.co/course/sat-and-act-math/lessons/logs/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/matrices/" },
    { url: "https://eddify.co/course/sat-and-act-math/lessons/law-of-sines-and-cosines/" },
    // Module 20: Question Bank
    { url: "https://eddify.co/course/sat-and-act-math/lessons/proceed-to-eddifys-question-bank/" },
  ];

  const results = [];
  const ytRe  = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/i;
  const ytRe2 = /youtu\.be\/([\w-]{11})/i;
  const viRe  = /vimeo\.com\/(?:video\/)?(\d+)/i;

  function extractVideo(html) {
    let m = html.match(ytRe) || html.match(ytRe2);
    if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
    m = html.match(viRe);
    if (m) return `https://vimeo.com/${m[1]}`;
    return null;
  }

  console.log(`Fetching ${lessons.length} lesson pages...`);
  for (let i = 0; i < lessons.length; i++) {
    const { url } = lessons[i];
    try {
      const resp = await fetch(url, { credentials: 'include' });
      const html = await resp.text();
      const videoUrl = extractVideo(html);
      results.push({ url, videoUrl });
      if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${lessons.length} done`);
    } catch (e) {
      results.push({ url, videoUrl: null, error: String(e) });
    }
    await new Promise(r => setTimeout(r, 300)); // 300ms between requests
  }

  const withVideo = results.filter(r => r.videoUrl).length;
  console.log(`\nDone. ${withVideo}/${results.length} lessons have video URLs.`);
  console.log('\n=== COPY EVERYTHING BELOW THIS LINE ===\n');
  console.log(JSON.stringify(results, null, 2));
})();
