// Manager for offline/online caching and retrieval of Quranic Text
import quranDataLocal from './quranTextUthmani.json';

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

/**
 * Checks if the full Quran is cached locally. Always true as it is pre-bundled/loaded.
 */
export async function isFullQuranCached(): Promise<boolean> {
    return true;
}

/**
 * Simulates download since it's already pre-bundled/loaded.
 */
export async function downloadFullQuranForOffline(
    onProgress: (progress: number) => void
): Promise<boolean> {
    onProgress(10);
    onProgress(50);
    onProgress(100);
    return true;
}

/**
 * Clears the cached Quran. No-op since we bundle it.
 */
export async function deleteCachedQuran(): Promise<boolean> {
    return true;
}

/**
 * Fetches the Quranic text for a specific range of surahs and ayahs.
 * Fully offline, using pre-bundled local JSON data.
 */
export async function fetchQuranTextRange(
    startSurahNum: number,
    startAyah: number,
    endSurahNum: number,
    endAyah: number
): Promise<QuranSurahRange[]> {
    const allSurahs = quranDataLocal.data.surahs;
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
