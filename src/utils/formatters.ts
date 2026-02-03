/**
 * Formats a large number into a human-readable string with abbreviations (K, M, B, T).
 * Example: 1500 -> "1.5K", 1000000 -> "1M"
 */
export const formatEtherions = (num: number): string => {
    if (num === 0) return "0";
    if (!num) return "0";

    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (absNum >= 1e12) {
        return sign + (absNum / 1e12).toFixed(1).replace(/\.0$/, '') + "T";
    }
    if (absNum >= 1e9) {
        return sign + (absNum / 1e9).toFixed(1).replace(/\.0$/, '') + "B";
    }
    if (absNum >= 1e6) {
        return sign + (absNum / 1e6).toFixed(1).replace(/\.0$/, '') + "M";
    }
    if (absNum >= 1e3) {
        return sign + (absNum / 1e3).toFixed(1).replace(/\.0$/, '') + "K";
    }

    return sign + absNum.toString();
};

/**
 * Parses a string with abbreviations (K, M, B, T) into a number.
 * Example: "10B" -> 10,000,000,000
 */
export const parseAbbreviatedNumber = (val: string): number => {
    if (!val) return 0;

    const cleanVal = val.trim().toUpperCase();
    const multiplierMap: Record<string, number> = {
        'K': 1e3,
        'M': 1e6,
        'B': 1e9,
        'T': 1e12
    };

    const suffix = cleanVal.slice(-1);
    const numericPart = cleanVal.slice(0, -1);

    if (multiplierMap[suffix]) {
        const num = parseFloat(numericPart);
        return isNaN(num) ? 0 : num * multiplierMap[suffix];
    }

    const fullNum = parseFloat(cleanVal);
    return isNaN(fullNum) ? 0 : fullNum;
};
