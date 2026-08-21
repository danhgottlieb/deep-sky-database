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
    const validArticleIds = new Set(articleIds.values());
    const selectionStorageKey = 'deepSkySelectedArticles';

    const list = document.getElementById('articles-list');
    if (!list) return;

    function getStoredArticleIds() {
        try {
            const value = window.sessionStorage.getItem(selectionStorageKey);
            if (!value) return [];

            const storedIds = JSON.parse(value);
            if (!Array.isArray(storedIds)) {
                throw new TypeError('Stored article selections are not an array');
            }

            return [...new Set(storedIds.filter(id => validArticleIds.has(id)))];
        } catch (error) {
            console.warn('Unable to read persisted article filter selections:', error);
            return [];
        }
    }

    function persistArticleIds(ids) {
        try {
            window.sessionStorage.setItem(selectionStorageKey, JSON.stringify(ids));
        } catch (error) {
            console.warn('Unable to persist article filter selections:', error);
        }
    }

    function articleIdsWith(articleId) {
        const ids = getStoredArticleIds();
        if (!ids.includes(articleId)) ids.push(articleId);
        return ids;
    }

    function explorerHref(ids) {
        const query = ids
            .map(articleId => `article=${encodeURIComponent(articleId)}`)
            .join('&');
        return `/explorer/?${query}`;
    }

    function refreshSearchLink(link) {
        link.href = explorerHref(articleIdsWith(link.dataset.articleId));
    }

    function addSearchLinks() {
        list.querySelectorAll('.article-item').forEach(item => {
            const number = item.querySelector('.article-num')?.textContent.trim().replace(/^#/, '');
            const articleId = articleIds.get(number);
            const actions = item.querySelector('.article-actions');

            if (!articleId || !actions?.querySelector('.article-pdf-link') || actions.querySelector('.article-search-link')) {
                return;
            }

            const link = document.createElement('a');
            link.className = 'article-link article-search-link';
            link.dataset.articleId = articleId;
            link.textContent = 'Search objects';
            link.setAttribute('aria-label', `Search objects from ${item.querySelector('h4')?.textContent.trim() || articleId}`);
            refreshSearchLink(link);
            link.addEventListener('click', () => {
                const ids = articleIdsWith(articleId);
                persistArticleIds(ids);
                link.href = explorerHref(ids);
            });
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

    window.addEventListener('pageshow', () => {
        list.querySelectorAll('.article-search-link').forEach(refreshSearchLink);
    });
})();
