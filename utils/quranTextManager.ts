// Manager for offline/online caching and retrieval of Quranic Text

export interface QuranVerse {
    numberInSurah: number;
    text: string;
    page: number;
}

export interface QuranSurahRange {
    number: number;
    name: string;
    ayahs: QuranVerse[];
}

const CACHE_NAME = 'quran-offline-cache';
const FULL_QURAN_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';

/**
 * Checks if the full Quran is cached locally in the browser's Cache API.
 */
export async function isFullQuranCached(): Promise<boolean> {
    if (!('caches' in window)) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match(FULL_QURAN_URL);
        return !!response;
    } catch (e) {
        console.error('Error checking Quran cache:', e);
        return false;
    }
}

/**
 * Downloads the complete Quran with progress tracking and caches it.
 */
export async function downloadFullQuranForOffline(
    onProgress: (progress: number) => void
): Promise<boolean> {
    if (!('caches' in window)) {
        throw new Error('متصفحك لا يدعم تخزين الملفات للعمل بدون إنترنت.');
    }

    try {
        onProgress(5);
        const response = await fetch(FULL_QURAN_URL);
        if (!response.ok) {
            throw new Error(`فشل الاتصال بالخادم: ${response.statusText}`);
        }

        const contentLength = +(response.headers.get('Content-Length') || '2300000'); // Estimate 2.3MB if not present
        const reader = response.body?.getReader();
        if (!reader) {
            // Fallback if reader is not supported
            onProgress(50);
            const data = await response.json();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(FULL_QURAN_URL, new Response(JSON.stringify(data), {
                headers: { 'Content-Type': 'application/json' }
            }));
            onProgress(100);
            return true;
        }

        let receivedLength = 0;
        const chunks: Uint8Array[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                chunks.push(value);
                receivedLength += value.length;
                const progress = Math.min(95, Math.round((receivedLength / contentLength) * 100));
                onProgress(progress);
            }
        }

        // Combine chunks into a single Blob
        const blob = new Blob(chunks, { type: 'application/json' });
        const cacheResponse = new Response(blob, {
            headers: { 'Content-Type': 'application/json' }
        });

        const cache = await caches.open(CACHE_NAME);
        await cache.put(FULL_QURAN_URL, cacheResponse);
        onProgress(100);
        return true;
    } catch (e) {
        console.error('Error downloading full Quran:', e);
        throw e;
    }
}

/**
 * Clears the cached Quran.
 */
export async function deleteCachedQuran(): Promise<boolean> {
    if (!('caches' in window)) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        return await cache.delete(FULL_QURAN_URL);
    } catch (e) {
        console.error('Error deleting cached Quran:', e);
        return false;
    }
}

/**
 * Helper to fetch a single Surah and cache it individually.
 */
async function getSurahData(surahNum: number): Promise<any> {
    const surahUrl = `https://api.alquran.cloud/v1/surah/${surahNum}/quran-uthmani`;
    if ('caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(surahUrl);
        if (cachedResponse) {
            return await cachedResponse.json();
        }

        // Fetch and cache it
        try {
            const res = await fetch(surahUrl);
            if (res.ok) {
                const clone = res.clone();
                await cache.put(surahUrl, clone);
                return await res.json();
            }
        } catch (e) {
            console.warn(`Failed to fetch surah ${surahNum} online, trying cache fallback...`, e);
        }
    } else {
        const res = await fetch(surahUrl);
        if (res.ok) return await res.json();
    }
    throw new Error('لا يوجد اتصال بالإنترنت ولم يتم تحميل هذه السورة مسبقاً.');
}

/**
 * Fetches the Quranic text for a specific range of surahs and ayahs.
 * Supports offline mode if cached, and online on-demand caching of surahs.
 */
export async function fetchQuranTextRange(
    startSurahNum: number,
    startAyah: number,
    endSurahNum: number,
    endAyah: number
): Promise<QuranSurahRange[]> {
    // 1. Check if full Quran is cached
    const isCached = await isFullQuranCached();
    if (isCached) {
        try {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(FULL_QURAN_URL);
            if (cachedResponse) {
                const fullData = await cachedResponse.json();
                const allSurahs = fullData.data.surahs;
                
                return extractRangeFromFullQuran(allSurahs, startSurahNum, startAyah, endSurahNum, endAyah);
            }
        } catch (e) {
            console.error('Error reading full Quran from cache, falling back to surah fetches:', e);
        }
    }

    // 2. Fetch required Surahs one by one (will automatically use/create individual caches)
    const ranges: QuranSurahRange[] = [];
    const minSurah = Math.min(startSurahNum, endSurahNum);
    const maxSurah = Math.max(startSurahNum, endSurahNum);

    for (let s = minSurah; s <= maxSurah; s++) {
        const surahJson = await getSurahData(s);
        const surahData = surahJson.data;

        const filteredAyahs = surahData.ayahs.filter((a: any) => {
            const aNum = a.numberInSurah;
            if (s === startSurahNum && s === endSurahNum) {
                return aNum >= Math.min(startAyah, endAyah) && aNum <= Math.max(startAyah, endAyah);
            }
            if (s === startSurahNum) {
                return aNum >= startAyah;
            }
            if (s === endSurahNum) {
                return aNum <= endAyah;
            }
            return true; // entirely inside range
        });

        ranges.push({
            number: surahData.number,
            name: surahData.name,
            ayahs: filteredAyahs.map((a: any) => ({
                numberInSurah: a.numberInSurah,
                text: a.text,
                page: a.page
            }))
        });
    }

    return ranges;
}

function extractRangeFromFullQuran(
    allSurahs: any[],
    startSurahNum: number,
    startAyah: number,
    endSurahNum: number,
    endAyah: number
): QuranSurahRange[] {
    const ranges: QuranSurahRange[] = [];
    const minSurah = Math.min(startSurahNum, endSurahNum);
    const maxSurah = Math.max(startSurahNum, endSurahNum);

    for (let s = minSurah; s <= maxSurah; s++) {
        const surahData = allSurahs[s - 1];
        if (!surahData) continue;

        const filteredAyahs = surahData.ayahs.filter((a: any) => {
            const aNum = a.numberInSurah;
            if (s === startSurahNum && s === endSurahNum) {
                return aNum >= Math.min(startAyah, endAyah) && aNum <= Math.max(startAyah, endAyah);
            }
            if (s === startSurahNum) {
                return aNum >= startAyah;
            }
            if (s === endSurahNum) {
                return aNum <= endAyah;
            }
            return true;
        });

        ranges.push({
            number: surahData.number,
            name: surahData.name,
            ayahs: filteredAyahs.map((a: any) => ({
                numberInSurah: a.numberInSurah,
                text: a.text,
                page: a.page
            }))
        });
    }

    return ranges;
}
