/**
 * migu-noscore 自动化测试脚本
 *
 * 使用 Playwright 加载扩展并验证比分屏蔽功能。
 *
 * 依赖:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * 用法:
 *   node test/test.js
 */

const { chromium } = require('playwright');
const path = require('path');

const EXT_PATH = path.resolve(__dirname, '..', 'migu-noscore');
const SCHEDULE_URL = 'https://www.miguvideo.com/p/schedule/';
const LIVE_URL = 'https://www.miguvideo.com/p/live/120000575528';

function launchBrowser() {
  return chromium.launchPersistentContext('', {
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-extensions-except=' + EXT_PATH,
      '--load-extension=' + EXT_PATH
    ]
  });
}

async function testSchedulePage(page) {
  console.log('--- 赛程页测试 ---');
  await page.goto(SCHEDULE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(12000);

  const result = await page.evaluate(() => {
    const scores = document.querySelectorAll('.team-score');
    const times = document.querySelectorAll('.match-time');

    let hiddenScores = 0, visibleScores = 0;
    scores.forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') hiddenScores++;
      else visibleScores++;
    });

    let hiddenTimes = 0, visibleTimes = 0;
    times.forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') hiddenTimes++;
      else visibleTimes++;
    });

    return {
      scores: { total: scores.length, hidden: hiddenScores, visible: visibleScores },
      times: { total: times.length, hidden: hiddenTimes, visible: visibleTimes }
    };
  });

  const scoresPass = result.scores.total > 0 && result.scores.visible === 0;
  const timesPass = result.times.total > 0 && result.times.hidden === 0;

  console.log('  比分数:', result.scores.total, '| 已隐藏:', result.scores.hidden, scoresPass ? '✓' : '✗');
  console.log('  比赛时间:', result.times.total, '| 仍可见:', result.times.visible, timesPass ? '✓' : '✗');

  return scoresPass && timesPass;
}

async function testLivePage(page) {
  console.log('\n--- 直播/回放页测试 ---');
  await page.goto(LIVE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(15000);

  const result = await page.evaluate(() => {
    const titleScores = document.querySelectorAll('.titleScores');
    const teamScore = document.querySelectorAll('.teamScore');
    const rightBox = document.querySelector('.right-box');
    const episode = document.querySelector('.episode');
    const webPlay = document.querySelector('.webPlay');

    let tsHidden = 0;
    titleScores.forEach(el => {
      if (window.getComputedStyle(el).display === 'none') tsHidden++;
    });

    let tssHidden = 0;
    teamScore.forEach(el => {
      if (window.getComputedStyle(el).display === 'none' ||
          window.getComputedStyle(el).visibility === 'hidden') tssHidden++;
    });

    return {
      titleScores: { total: titleScores.length, hidden: tsHidden },
      teamScore: { total: teamScore.length, hidden: tssHidden },
      rightBoxDisplay: rightBox ? window.getComputedStyle(rightBox).display : 'none',
      episodeDisplay: episode ? window.getComputedStyle(episode).display : 'N/A',
      webPlayMarginRight: webPlay ? window.getComputedStyle(webPlay).marginRight : 'N/A'
    };
  });

  const tsPass = result.titleScores.total > 0 && result.titleScores.hidden === result.titleScores.total;
  const tssPass = result.teamScore.hidden === result.teamScore.total;
  const rbPass = result.rightBoxDisplay === 'none';
  const epPass = result.episodeDisplay === 'none';
  const wpPass = result.webPlayMarginRight === '0px';

  console.log('  顶部比分栏隐藏:', tsPass ? '✓' : '✗');
  console.log('  比分数字隐藏:', tssPass ? '✓' : '✗');
  console.log('  右侧面板隐藏:', rbPass ? '✓' : '✗');
  console.log('  侧栏收起:', epPass ? '✓' : '✗');
  console.log('  视频全宽:', wpPass ? '✓' : '✗');

  return tsPass && tssPass && rbPass && epPass && wpPass;
}

(async () => {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    const scheduleOk = await testSchedulePage(page);
    const liveOk = await testLivePage(page);

    console.log('\n=========================');
    if (scheduleOk && liveOk) {
      console.log('所有测试通过 ✓');
    } else {
      console.log('部分测试失败 ✗');
      process.exit(1);
    }
  } catch (e) {
    console.error('测试异常:', e.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();
