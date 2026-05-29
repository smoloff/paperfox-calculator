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
