/**
 * migu-noscore - 咪咕视频比分屏蔽插件
 * 屏蔽赛程页和直播/回放页面的所有比分显示
 */
(function () {
  'use strict';

  const HIDE_CLASS = 'migu-noscore-hidden';
  const SCORE_REGEX = /\d+\s*[-:：]\s*\d+/;
  let styleEl = null;
  let scanTimer = null;

  function injectDynamicStyle() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'migu-noscore-dynamic';
    styleEl.textContent = '.' + HIDE_CLASS + ' { visibility: hidden !important; }';
    (document.head || document.documentElement).appendChild(styleEl);
  }

  function isLivePage() {
    return window.location.href.includes('/p/live/');
  }

  function isSchedulePage() {
    return window.location.href.includes('/p/schedule/');
  }

  /* ============================
   * 处理赛程页面的比分
   * ============================ */
  function processSchedulePage() {
    if (!isSchedulePage()) return;
    document.querySelectorAll('.team-score').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });
  }

  /* ============================
   * 处理直播/回放页面
   * ============================ */
  function processLivePage() {
    if (!isLivePage()) return;

    // 1. 顶部标题比分区域
    document.querySelectorAll('.titleScores').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });
    document.querySelectorAll('.teamScore').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });

    // 2. 隐藏右侧面板整体（比分/进球片段/聊天等内容）
    hideRightPanel();

    // 3. 点击展开按钮，让视频区域全屏
    expandVideoArea();
  }

  function hideRightPanel() {
    var rightBox = document.querySelector('.right-box');
    if (rightBox) {
      rightBox.style.display = 'none';
    }
  }

  let episodeControlClicked = false;

  function expandVideoArea() {
    if (episodeControlClicked) return;

    var ec = document.querySelector('.episodeControl');
    if (!ec) return;

    var ep = document.querySelector('.episode');
    if (ep && (ep.style.display === 'none' || window.getComputedStyle(ep).display === 'none')) {
      episodeControlClicked = true;
      return;
    }

    ec.click();

    setTimeout(function () {
      var ep2 = document.querySelector('.episode');
      if (ep2 && (ep2.style.display === 'none' || window.getComputedStyle(ep2).display === 'none')) {
        episodeControlClicked = true;
      }
    }, 800);
  }

  /* ============================
   * 通用处理 - 处理所有页面
   * ============================ */
  function processNewNodes(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) return;

    // 处理 team-score
    root.querySelectorAll('.team-score').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });

    // 处理 titleScores
    root.querySelectorAll('.titleScores').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });

    // 处理 teamScore
    root.querySelectorAll('.teamScore').forEach(function (el) {
      el.classList.add(HIDE_CLASS);
    });

    // 如果节点本身就是要隐藏的元素
    if (root.classList) {
      var cls = root.classList;
      if (cls.contains('team-score') || cls.contains('titleScores') || cls.contains('teamScore')) {
        root.classList.add(HIDE_CLASS);
      }
    }
  }

  /* ============================
   * MutationObserver - 监听DOM变化
   * ============================ */
  function setupMutationObserver() {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];
        if (mutation.type === 'childList') {
          for (var j = 0; j < mutation.addedNodes.length; j++) {
            processNewNodes(mutation.addedNodes[j]);
          }
        }
      }

      // 如果有任何结构变化，重新检查右侧面板
      if (isLivePage()) {
        hideRightPanel();
        expandVideoArea();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  let tabClickHandlerInstalled = false;

  /* ============================
   * 监听 tab 点击事件
   * 当用户切换右侧面板的 tab（如 赛程、数据）时，
   * 新加载的内容可能包含比分
   * ============================ */
  function setupTabClickHandler() {
    if (!isLivePage()) return;
    if (tabClickHandlerInstalled) return;
    tabClickHandlerInstalled = true;

    document.addEventListener('click', function (e) {
      var target = e.target;

      // 检查是否点击了右侧面板的 tab
      var rightBox = document.querySelector('.right-box');
      if (!rightBox) return;

      if (rightBox.contains(target)) {
        // 延迟处理，等 tab 内容渲染完成
        setTimeout(function () {
          processLivePage();
        }, 500);
        setTimeout(function () {
          processLivePage();
        }, 1500);
      }
    }, true);
  }

  /* ============================
   * 定时扫描 - 兜底方案
   * ============================ */
  function startPeriodicScan() {
    if (scanTimer) return;

    var interval = isLivePage() ? 2000 : 1500;
    var maxRounds = isLivePage() ? 45 : 20;
    var rounds = 0;

    scanTimer = setInterval(function () {
      rounds++;
      processSchedulePage();
      processLivePage();

      if (rounds >= maxRounds) {
        clearInterval(scanTimer);
        scanTimer = null;
      }
    }, interval);

    window.addEventListener('beforeunload', function () {
      if (scanTimer) {
        clearInterval(scanTimer);
        scanTimer = null;
      }
    });
  }

  /* ============================
   * SPA 路由变化检测
   * 因为咪咕视频使用 Vue SPA，页面切换不触发完整加载
   * ============================ */
  function setupSPANavigationDetection() {
    var lastUrl = window.location.href;

    var originalPushState = history.pushState;
    var originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(history, arguments);
      onUrlChange();
    };

    history.replaceState = function () {
      originalReplaceState.apply(history, arguments);
      onUrlChange();
    };

    window.addEventListener('popstate', function () {
      onUrlChange();
    });

    function onUrlChange() {
      var currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        episodeControlClicked = false;
        setTimeout(function () {
          processSchedulePage();
          processLivePage();
          setupTabClickHandler();
        }, 300);
        setTimeout(function () {
          processSchedulePage();
          processLivePage();
        }, 1500);
      }
    }
  }

  /* ============================
   * 初始化
   * ============================ */
  function init() {
    injectDynamicStyle();
    setupMutationObserver();
    setupSPANavigationDetection();
    setupTabClickHandler();

    function ready() {
      processSchedulePage();
      processLivePage();
      startPeriodicScan();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ready);
    } else {
      ready();
    }
  }

  init();
})();
