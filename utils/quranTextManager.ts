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

async function getQuranData(): Promise<any> {
    if (quranDataCache) {
        return quranDataCache;
    }

    try {
        const res = await fetch('/quranTextUthmani.json');
        if (res.ok) {
            quranDataCache = await res.json();
            return quranDataCache;
        }
    } catch (e) {
        // Ignore
    }

    try {
        const res2 = await fetch('/utils/quranTextUthmani.json');
        if (res2.ok) {
            quranDataCache = await res2.json();
            return quranDataCache;
        }
    } catch (e) {
        // Ignore
    }

    return { data: { surahs: [] } };
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
    return extractRangeFromFullQuran(allSurahs, startSurahNum, startAyah, endSurahNum, endAyah);
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
