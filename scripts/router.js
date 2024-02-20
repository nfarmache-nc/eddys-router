import { decorateMain } from './scripts.js';
import { loadBlocks, decorateTemplateAndTheme } from './aem.js';

// Add your excluded paths to the list
const excludedPaths = [
  '/excluded',
];

async function render(html) {
  const main = document.querySelector('body>main');
  const head = document.querySelector('html>head');
  const newDocument = new DOMParser().parseFromString(html, 'text/html');
  const newHead = newDocument.querySelector('html>head');

  // replace meta tags
  [...head.querySelectorAll('meta')].forEach((tag) => tag.remove());
  const metaHtml = [...newHead.querySelectorAll('meta')].map((meta) => (meta).outerHTML).join('\n');
  head.querySelector('title').insertAdjacentHTML('afterend', metaHtml);

  // replace title
  document.title = newDocument.title;

  // replace main
  main.innerHTML = newDocument.querySelector('body>main').innerHTML;
  main.classList.add('hidden');
  document.body.className = 'appear';
  decorateTemplateAndTheme();
  decorateMain(main);
  await loadBlocks(main);
  main.classList.remove('hidden');
}

async function navigate(path, shouldPushState = true) {
  fetch(path)
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType || !contentType.includes('text/html')) {
        window.location.href = path;
      }

      return response.text();
    })
    .then(async (html) => {
      if (shouldPushState) {
        window.history.pushState({}, '', path);
      }

      render(html);
    });
}

function checkUrl(href) {
  const url = new URL(href, document.location.href);
  const path = `${url.pathname}${url.search}${url.hash}`;
  const simplePath = url.pathname;

  // check origin
  if (url.origin !== document.location.origin) {
    return { shouldFetchPage: false };
  }

  // check if it's the same page
  if (simplePath === document.location.pathname) {
    return { shouldFetchPage: false };
  }

  // check excluded paths
  if (excludedPaths.some((excludedPath) => (
    document.location.pathname === excludedPath
    || document.location.pathname.startsWith(`${excludedPath}/`)
    || simplePath === excludedPath
    || simplePath.startsWith(`${excludedPath}/`)
  ))) {
    return { shouldFetchPage: false };
  }

  // ok
  return { path, shouldFetchPage: true };
}

const clickHandler = (event) => {
  const { target } = event;
  if (target.tagName !== 'A' || typeof target.href === 'undefined') return;
  const { shouldFetchPage, path } = checkUrl(target.href);
  if (!shouldFetchPage) return;

  event.preventDefault();
  navigate(path);
};

const popstateHandler = () => {
  const { path } = checkUrl(document.location.href);
  navigate(path, false);
};

function router() {
  document.addEventListener('click', clickHandler);
  window.addEventListener('popstate', popstateHandler);
}

router();
