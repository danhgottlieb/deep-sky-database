(function () {
    'use strict';

    const articleIds = new Map([
        ['38', 'sky-telescope-2025-04'],
        ['37', 'sky-telescope-2024-04'],
        ['34', 'sky-telescope-2022-06'],
        ['25', 'sky-telescope-2017-05'],
        ['20', 'sky-telescope-2014-09'],
        ['19', 'sky-telescope-2014-05'],
        ['18', 'sky-telescope-2013-07'],
        ['13', 'sky-telescope-2011-05'],
        ['11', 'sky-telescope-2010-04'],
        ['8', 'sky-telescope-2003-11'],
        ['6', 'sky-telescope-2002-04'],
        ['5', 'sky-telescope-2001-01'],
        ['4', 'sky-telescope-2000-08'],
        ['3', 'sky-telescope-2000-05'],
        ['2', 'sky-telescope-1999-10']
    ]);

    const list = document.getElementById('articles-list');
    if (!list) return;

    function addSearchLinks() {
        list.querySelectorAll('.article-item').forEach(item => {
            const number = item.querySelector('.article-num')?.textContent.trim().replace(/^#/, '');
            const articleId = articleIds.get(number);
            const actions = item.querySelector('.article-actions');

            if (!articleId || !actions?.querySelector('.article-pdf-link') || actions.querySelector('.article-search-link')) {
                return;
            }

            const link = document.createElement('a');
            link.href = `/explorer/?article=${encodeURIComponent(articleId)}`;
            link.className = 'article-link article-search-link';
            link.textContent = 'Search objects';
            link.setAttribute('aria-label', `Search objects from ${item.querySelector('h4')?.textContent.trim() || articleId}`);
            actions.appendChild(link);
        });

        return list.querySelectorAll('.article-search-link').length === articleIds.size;
    }

    const observer = new MutationObserver(() => {
        if (addSearchLinks()) observer.disconnect();
    });

    if (!addSearchLinks()) {
        observer.observe(list, { childList: true });
    }
})();
