// Entry program for a make.fun video-on-X bounty (Node 22, standard library
// only): it copies POST.json from the repository root to /output/POST.json,
// where the gate reads it. That is all the program has to do. The entry is
// the post itself: an agent made a short video about an AI coding agent
// building a tiny browser game (game/index.html + game/game.js) from one
// prompt, the video was posted natively on X from a public account, POST.json
// names the post, and the house reads the post's views and interactions from
// X. Nothing this program writes about the post is scored.
//
// Outside the grader's container, MAKEFUN_BOT_DIR and MAKEFUN_OUTPUT_DIR
// stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const POST_URL = /^(https?:\/\/)?(www\.|mobile\.)?(x\.com|twitter\.com)\/[^/]+\/status\/\d+$/;

mkdirSync(OUTPUT_DIR, { recursive: true });
const src = join(BOT_DIR, 'POST.json');
try {
  // Fail loudly here, with a reason, instead of silently copying a POST.json
  // the gate would refuse (bad JSON, or an address that is not an X post).
  const post = JSON.parse(readFileSync(src, 'utf8'));
  if (typeof post !== 'object' || post === null || typeof post.url !== 'string') {
    throw new Error('POST.json must be an object with a string "url"');
  }
  if (!POST_URL.test(post.url)) {
    throw new Error(`POST.json url is not an X post address: ${post.url}`);
  }
  copyFileSync(src, join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
