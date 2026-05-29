function getMaterialWeight(name) {
    if (!name || name === 'none' || name.includes('пластик')) return 999;
    const match = name.match(/(\d+)\s*г\/м/);
    return match ? parseInt(match[1]) : 0;
}

function getTierPrice(itemName, amount) {
    if (!itemName) return 0;
    if (!window.priceBook[itemName]) {
        console.warn(`⚠️ Не знайдено: "${itemName}"`);
        return 0;
    }
    const tiers = window.priceBook[itemName];
    const thresholds = [1000, 500, 400, 200, 100, 50, 40, 20, 10, 5, 1];
    for (const t of thresholds) {
        if (amount >= t && tiers[t] > 0) return tiers[t];
    }
    return tiers[1] || 0;
}

function calcFit(pw, ph) {
    return Math.max(
        Math.floor(SRA3_W / pw) * Math.floor(SRA3_H / ph),
        Math.floor(SRA3_W / ph) * Math.floor(SRA3_H / pw)
    );
}

async function fetchWithRetry(url, options = {}) {
    const delays = [1000, 2000];
    const maxAttempts = 3;
    let lastError;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) return response;

            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                throw Object.assign(new Error(`HTTP ${response.status}`), { failFast: true });
            }

            lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.failFast) throw err;
            lastError = err;
        }

        if (attempt < maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delays[attempt]));
        }
    }

    throw new Error(`Не вдалося завантажити після ${maxAttempts} спроб: ${lastError.message}`);
}
