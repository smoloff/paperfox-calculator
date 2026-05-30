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

async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (_) {}
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (_) {
        return false;
    }
}

function showToast(message, duration = 1500) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('toast-visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('toast-visible'), duration);
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

function printSideLabel(key) {
    return (parseInt(key.split('+')[1], 10) === 0 ? 'односторонній ' : 'двосторонній ') + key;
}

function buildCoverLines(data) {
    if (data.type === 'staple' || data.type === 'glue') {
        const lines = [
            `Папір: ${data.covMat}`,
            `Друк: ${printSideLabel(data.covPrintKey)}`
        ];
        if (data.covLam && data.covLam !== 'none') lines.push(`Ламінація: ${data.covLam}`);
        return lines;
    }
    const kitLabels = {
        'plastic-white':   'Прозора обкладинка + Біла підкладка',
        'plastic-plastic': 'Прозора обкладинка + Прозора підкладка',
        'none':            'Без комплекту'
    };
    const lines = [`Комплект: ${kitLabels[data.springBaseSet] || data.springBaseSet}`];
    if (data.customCover) {
        lines.push(`Кастомна обкладинка: ${data.customCover.mat} ${printSideLabel(data.customCover.printKey)}`);
        if (data.customCover.lam !== 'none') lines.push(`Ламінація обкладинки: ${data.customCover.lam}`);
    }
    if (data.customBacking) {
        lines.push(`Кастомна підкладка: ${data.customBacking.mat} ${printSideLabel(data.customBacking.printKey)}`);
        if (data.customBacking.lam !== 'none') lines.push(`Ламінація підкладки: ${data.customBacking.lam}`);
    }
    return lines;
}

function buildMessengerText(data) {
    const titleName  = (data.customName || data.productType).toUpperCase();
    const coverLines = buildCoverLines(data);
    const qtyLines   = data.quantities.flatMap(({ qty, totalCost }) => [
        `Тираж: ${qty} шт.`,
        `Вартість: ${totalCost.toFixed(2)} грн.`
    ]);
    return [
        `**${titleName} ${data.productFormat}**`,
        `Розмір: ${data.w}×${data.h} мм`,
        `Орієнтація: ${data.orientation}`,
        `Метод зшивки: ${data.bindingLabel}`,
        '**Обкладинка**',
        ...coverLines,
        '**Наповнення**',
        `Папір: ${data.innerMat}`,
        `Друк: ${printSideLabel(data.innerPrintKey)}`,
        `Сторінок: ${data.pages} шт.`,
        ...qtyLines,
        'Термін: 1 робочий день'
    ].join('\n');
}

function buildEmailHtml(data) {
    const titleName  = (data.customName || data.productType).toUpperCase();
    const coverLines = buildCoverLines(data);
    const qtyLines   = data.quantities.flatMap(({ qty, totalCost }) => [
        `Тираж: ${qty} шт.`,
        `Вартість: ${totalCost.toFixed(2)} грн.`
    ]);
    return [
        `<b>${titleName} ${data.productFormat}</b>`,
        `Розмір: ${data.w}×${data.h} мм`,
        `Орієнтація: ${data.orientation}`,
        `Метод зшивки: ${data.bindingLabel}`,
        '<b>Обкладинка</b>',
        ...coverLines,
        '<b>Наповнення</b>',
        `Папір: ${data.innerMat}`,
        `Друк: ${printSideLabel(data.innerPrintKey)}`,
        `Сторінок: ${data.pages} шт.`,
        ...qtyLines,
        'Термін: 1 робочий день'
    ].join('<br>\n');
}

function buildEmailPlainText(data) {
    const titleName  = (data.customName || data.productType).toUpperCase();
    const coverLines = buildCoverLines(data);
    const qtyLines   = data.quantities.flatMap(({ qty, totalCost }) => [
        `Тираж: ${qty} шт.`,
        `Вартість: ${totalCost.toFixed(2)} грн.`
    ]);
    return [
        `${titleName} ${data.productFormat}`,
        `Розмір: ${data.w}×${data.h} мм`,
        `Орієнтація: ${data.orientation}`,
        `Метод зшивки: ${data.bindingLabel}`,
        'Обкладинка',
        ...coverLines,
        'Наповнення',
        `Папір: ${data.innerMat}`,
        `Друк: ${printSideLabel(data.innerPrintKey)}`,
        `Сторінок: ${data.pages} шт.`,
        ...qtyLines,
        'Термін: 1 робочий день'
    ].join('\n');
}

async function copyHtmlAndPlain(html, plain) {
    try {
        await navigator.clipboard.write([
            new ClipboardItem({
                'text/html':  new Blob([html],  { type: 'text/html' }),
                'text/plain': new Blob([plain], { type: 'text/plain' })
            })
        ]);
        return true;
    } catch (_) {
        return copyToClipboard(plain);
    }
}
