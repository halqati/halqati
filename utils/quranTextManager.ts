// Manager for offline/online caching and retrieval of Quranic Text

export interface QuranVerse {
    numberInSurah: number;
    text: string;
    page: number;
    juz?: number;
}

export interface QuranSurahRange {
    number: number;
    name: string;
    ayahs: QuranVerse[];
}

let quranDataCache: any = null;
let fetchPromise: Promise<any> | null = null;

async function getQuranData(): Promise<any> {
    if (quranDataCache && (quranDataCache.data?.surahs?.length > 0 || quranDataCache.surahs?.length > 0)) {
        return quranDataCache;
    }

    if (fetchPromise) {
        return fetchPromise;
    }

    fetchPromise = (async () => {
        try {
            const res = await fetch('/quranTextUthmani.json');
            if (res.ok) {
                const data = await res.json();
                if (data && (data.data?.surahs?.length > 0 || data.surahs?.length > 0)) {
                    quranDataCache = data;
                    return quranDataCache;
                }
            }
        } catch (e) {
            console.warn('Failed to fetch /quranTextUthmani.json:', e);
        }

        try {
            const res2 = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
            if (res2.ok) {
                const data2 = await res2.json();
                if (data2 && (data2.data?.surahs?.length > 0 || data2.surahs?.length > 0)) {
                    quranDataCache = data2;
                    return quranDataCache;
                }
            }
        } catch (e) {
            console.error('Failed to fetch remote Quran text:', e);
        }

        return { data: { surahs: [] } };
    })();

    const result = await fetchPromise;
    fetchPromise = null;
    return result;
}

export async function isFullQuranCached(): Promise<boolean> {
    return true;
}

export async function downloadFullQuranForOffline(
    onProgress: (progress: number) => void
): Promise<boolean> {
    onProgress(10);
    onProgress(50);
    onProgress(100);
    return true;
}

export async function deleteCachedQuran(): Promise<boolean> {
    return true;
}

export async function fetchQuranTextRange(
    startSurahNum: number,
    startAyah: number,
    endSurahNum: number,
    endAyah: number
): Promise<QuranSurahRange[]> {
    const quranData = await getQuranData();
    const allSurahs = quranData.data ? quranData.data.surahs : (quranData.surahs || []);
    
    // Bounds check
    const validStartSurah = Math.max(1, Math.min(114, startSurahNum || 1));
    const validEndSurah = Math.max(1, Math.min(114, endSurahNum || validStartSurah));
    
    return extractRangeFromFullQuran(allSurahs, validStartSurah, startAyah || 1, validEndSurah, endAyah || 1);
}

export async function fetchQuranPage(pageNumber: number): Promise<QuranSurahRange[]> {
    const quranData = await getQuranData();
    const allSurahs = quranData.data ? quranData.data.surahs : (quranData.surahs || []);
    const validPage = Math.max(1, Math.min(604, pageNumber));

    const result: QuranSurahRange[] = [];
    for (const surah of allSurahs) {
        const pageAyahs = (surah.ayahs || []).filter((a: any) => a.page === validPage);
        if (pageAyahs.length > 0) {
            result.push({
                number: surah.number,
                name: surah.name,
                ayahs: pageAyahs.map((a: any) => ({
                    numberInSurah: a.numberInSurah,
                    text: a.text,
                    page: a.page,
                    juz: a.juz
                }))
            });
        }
    }
    return result;
}

export async function fetchQuranJuz(juzNumber: number): Promise<QuranSurahRange[]> {
    const quranData = await getQuranData();
    const allSurahs = quranData.data ? quranData.data.surahs : (quranData.surahs || []);
    const validJuz = Math.max(1, Math.min(30, juzNumber));

    const result: QuranSurahRange[] = [];
    for (const surah of allSurahs) {
        const juzAyahs = (surah.ayahs || []).filter((a: any) => a.juz === validJuz);
        if (juzAyahs.length > 0) {
            result.push({
                number: surah.number,
                name: surah.name,
                ayahs: juzAyahs.map((a: any) => ({
                    numberInSurah: a.numberInSurah,
                    text: a.text,
                    page: a.page,
                    juz: a.juz
                }))
            });
        }
    }
    return result;
}

export async function fetchQuranSurah(surahNumber: number): Promise<QuranSurahRange[]> {
    const quranData = await getQuranData();
    const allSurahs = quranData.data ? quranData.data.surahs : (quranData.surahs || []);
    const validSurahNum = Math.max(1, Math.min(114, surahNumber));
    const surahData = allSurahs[validSurahNum - 1];

    if (!surahData) return [];

    return [{
        number: surahData.number,
        name: surahData.name,
        ayahs: (surahData.ayahs || []).map((a: any) => ({
            numberInSurah: a.numberInSurah,
            text: a.text,
            page: a.page,
            juz: a.juz
        }))
    }];
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
                page: a.page,
                juz: a.juz
            }))
        });
    }

    return ranges;
}
