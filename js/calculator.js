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

function calculate() {
    if (Object.keys(window.priceBook).length === 0) return;

    const resultBox = document.getElementById('calc-result');
    const w         = parseFloat(document.getElementById('calc-width').value);
    const h         = parseFloat(document.getElementById('calc-height').value);
    const pages     = parseInt(document.getElementById('inner-pages').value) || 0;
    const type      = document.getElementById('binding-type').value;
    const qtyInputs = document.querySelectorAll('.calc-quantity');
    const quantities = Array.from(qtyInputs).map(i => parseInt(i.value)).filter(v => v > 0 && !isNaN(v));

    if (!w || !h || quantities.length === 0) {
        resultBox.innerHTML = '<span style="color:#666;">Введіть коректні дані</span>';
        return;
    }

    // Валідація скоби
    if (type === 'staple') {
        const spread = Math.min(w, h) * 2;
        if (spread > 420) {
            resultBox.innerHTML = `
                <div class="error">
                    ⚠️ Скоба недоступна для цього формату.<br>
                    Розворот обкладинки: <strong>${spread}мм</strong> — перевищує максимум 420мм.<br>
                    Максимальний розмір для скоби: <strong>210мм</strong> по меншій стороні.
                </div>`;
            return;
        }
    }

    const isSpread = type === 'staple' || type === 'glue';
    const fitCover = calcFit(isSpread ? (w * 2) + BLEED : w + BLEED, h + BLEED);
    const fitInner = calcFit(w + BLEED, h + BLEED);

    if (fitCover === 0 || fitInner === 0) {
        resultBox.innerHTML = `<span class="error">Формат завеликий. Не поміщається на SRA3.</span>`;
        return;
    }

    // Наповнення: матеріал і тип друку
    const innerMat          = document.getElementById('inner-material').value;
    const matType           = window.materialPrintType[innerMat] || 'CMYK';
    const innerPrintBaseKey = document.getElementById('inner-print-type').value;
    const innerPrintKey     = matType === 'W+CMY' ? innerPrintBaseKey + '-wcmy' : innerPrintBaseKey;
    const innerPrintName    = MAPPING.print[innerPrintKey] || MAPPING.print[innerPrintBaseKey];

    let innerLeaves = 0;
    if (type === 'staple' || type === 'glue') {
        innerLeaves = pages / 2;
    } else {
        const isTwoSided = innerPrintBaseKey === '4+4' || innerPrintBaseKey === '1+1';
        innerLeaves = isTwoSided ? pages / 2 : pages;
    }

    // Обкладинка: зчитуємо раз, використовуємо для всіх тиражів
    const isStapleOrGlue = type === 'staple' || type === 'glue';
    const covMat      = isStapleOrGlue ? document.getElementById('standard-cover-material').value   : null;
    const covPrintKey = isStapleOrGlue ? document.getElementById('standard-cover-print').value       : null;
    const covLam      = isStapleOrGlue ? document.getElementById('standard-cover-lamination').value  : 'none';
    const covPrint    = covPrintKey    ? MAPPING.print[covPrintKey]                                   : null;

    const springBaseSet = !isStapleOrGlue ? document.getElementById('spring-base-set').value : null;

    const hasCustomCover   = !isStapleOrGlue && document.getElementById('spring-has-custom-cover').checked;
    const hasCustomBacking = !isStapleOrGlue && document.getElementById('spring-has-custom-backing').checked;

    const customCoverData = hasCustomCover ? {
        mat:      document.getElementById('spring-custom-cover-material').value,
        printKey: document.getElementById('spring-custom-cover-print').value,
        lam:      document.getElementById('spring-custom-cover-lamination').value
    } : null;

    const customBackingData = hasCustomBacking ? {
        mat:      document.getElementById('spring-custom-backing-material').value,
        printKey: document.getElementById('spring-custom-backing-print').value,
        lam:      document.getElementById('spring-custom-backing-lamination').value
    } : null;

    // Назва збірки
    let bindingName = '';
    if      (type === 'staple') bindingName = MAPPING.binding['staple'];
    else if (type === 'glue')   bindingName = MAPPING.binding['glue'];
    else if (type === 'spring-plastic') {
        bindingName = Math.max(w, h) > 297
            ? MAPPING.binding['spring-metal-a3']
            : pages < 120 ? MAPPING.binding['spring-plastic-small'] : MAPPING.binding['spring-plastic-large'];
    }
    else if (type === 'spring-metal') {
        bindingName = Math.max(w, h) > 297 ? MAPPING.binding['spring-metal-a3'] : MAPPING.binding['spring-metal-a4'];
    }

    // Розрахунок для кожного тиражу
    const results = quantities.map(qty => {
        let totalCost = 0;

        // Наповнення
        const innerSRA3 = Math.ceil((innerLeaves * qty) / fitInner);
        if (innerSRA3 > 0) {
            totalCost += innerSRA3 * getTierPrice(innerMat, innerSRA3);
            totalCost += innerSRA3 * getTierPrice(innerPrintName, innerSRA3);
        }

        // Обкладинка (скоба / клей)
        let coverSRA3 = 0;
        if (isStapleOrGlue) {
            coverSRA3 = Math.ceil(qty / fitCover);
            totalCost += coverSRA3 * getTierPrice(covMat,   coverSRA3);
            totalCost += coverSRA3 * getTierPrice(covPrint, coverSRA3);
            if (covLam !== 'none') totalCost += coverSRA3 * getTierPrice(covLam, coverSRA3);
        }

        // Кастомна обкладинка / підкладка (пружина)
        let customCover   = null;
        let customBacking = null;

        if (customCoverData) {
            const sheets = Math.ceil(qty / fitInner);
            totalCost += sheets * (getTierPrice(customCoverData.mat, sheets) +
                                   getTierPrice(MAPPING.print[customCoverData.printKey], sheets));
            if (customCoverData.lam !== 'none') totalCost += sheets * getTierPrice(customCoverData.lam, sheets);
            customCover = { ...customCoverData, sheets };
        }

        if (customBackingData) {
            const sheets = Math.ceil(qty / fitInner);
            totalCost += sheets * (getTierPrice(customBackingData.mat, sheets) +
                                   getTierPrice(MAPPING.print[customBackingData.printKey], sheets));
            if (customBackingData.lam !== 'none') totalCost += sheets * getTierPrice(customBackingData.lam, sheets);
            customBacking = { ...customBackingData, sheets };
        }

        // Збірка
        totalCost += qty * getTierPrice(bindingName, qty);

        return {
            qty, totalCost,
            innerSRA3, coverSRA3,
            covMat, covPrintKey, covLam,
            innerMat, innerPrintKey: innerPrintBaseKey, innerPrintName,
            pages, bindingName,
            w, h, type, springBaseSet,
            customCover, customBacking
        };
    });

    renderResults(results);
    return results;
}
