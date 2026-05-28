// Артикул паперу для конкретного типу друку
function getArticle(matName, printKey) {
    const entry = window.priceBook[matName];
    if (!entry || !entry.articles) return '';
    return entry.articles[printKey.replace('-wcmy', '')] || '';
}

// Артикул для ламінації та брошурування (колонка G)
function getBaseArticle(name) {
    const entry = window.priceBook[name];
    if (!entry || !entry.articles) return '';
    return entry.articles['base'] || '';
}

function formatTechLine({ label, article, counts, unit, costs }) {
    const articlePart = article ? ` (арт. ${article})` : '';
    const countsPart = counts.map((c, i) => {
        const costStr = costs ? ` (${costs[i].toFixed(2)} ₴)` : '';
        return `${c} ${unit}${costStr}`;
    }).join(' | ');
    return `<div class="rb-tech-row">${label}${articlePart} — ${countsPart}</div>`;
}

function renderResults(results) {
    if (!results || results.length === 0) return;
    const resultBox = document.getElementById('calc-result');
    const r0 = results[0];
    const { w, h, type, pages, innerMat, innerPrintKey, bindingName, springBaseSet } = r0;

    // ── Назва продукту ──
    const formatMap  = [[148, 210, 'А5'], [210, 297, 'А4'], [297, 420, 'А3']];
    const sortedDims = [w, h].sort((a, b) => a - b);
    const fmtMatch   = formatMap.find(([sw, sh]) =>
        Math.abs(sortedDims[0] - sw) <= 2 && Math.abs(sortedDims[1] - sh) <= 2
    );
    const productName  = fmtMatch ? `Брошура ${fmtMatch[2]} (${w}×${h} мм)` : `Буклет ${w}×${h} мм`;
    const orientation  = w >= h ? 'Альбомна' : 'Книжна';
    const bindingLabels = {
        'staple':         'На скобу',
        'glue':           'Термобіндер (клей)',
        'spring-plastic': 'На пластикову пружину',
        'spring-metal':   'На металеву пружину'
    };

    // ── БЛОК 1: ОБКЛАДИНКА ──
    let coverHTML = '';
    if (type === 'staple' || type === 'glue') {
        const { covMat, covPrintKey, covLam } = r0;
        coverHTML = `
            <div class="rb-section">
                <div class="rb-section-title">Обкладинка</div>
                <div class="rb-row"><span>Папір:</span><span>${covMat}</span></div>
                <div class="rb-row"><span>Друк:</span><span>${covPrintKey}</span></div>
                <div class="rb-row"><span>Ламінація:</span><span>${covLam !== 'none' ? covLam : 'без ламінування'}</span></div>
            </div>`;
    } else {
        const kitLabels = {
            'plastic-white':   'Прозора обкладинка + Біла підкладка',
            'plastic-plastic': 'Прозора обкладинка + Прозора підкладка',
            'none':            'Без комплекту'
        };
        coverHTML = `<div class="rb-section">
            <div class="rb-section-title">Обкладинка</div>
            <div class="rb-row"><span>Комплект:</span><span>${kitLabels[springBaseSet] || springBaseSet}</span></div>`;
        if (r0.customCover) {
            const { mat, printKey, lam } = r0.customCover;
            coverHTML += `
            <div class="rb-subsection-title">Додаткова обкладинка:</div>
            <div class="rb-row"><span>Папір:</span><span>${mat}</span></div>
            <div class="rb-row"><span>Друк:</span><span>${printKey}</span></div>
            <div class="rb-row"><span>Ламінація:</span><span>${lam !== 'none' ? lam : 'без'}</span></div>`;
        }
        if (r0.customBacking) {
            const { mat, printKey, lam } = r0.customBacking;
            coverHTML += `
            <div class="rb-subsection-title">Додаткова підкладка:</div>
            <div class="rb-row"><span>Папір:</span><span>${mat}</span></div>
            <div class="rb-row"><span>Друк:</span><span>${printKey}</span></div>
            <div class="rb-row"><span>Ламінація:</span><span>${lam !== 'none' ? lam : 'без'}</span></div>`;
        }
        coverHTML += `</div>`;
    }

    // ── БЛОК 1: ЦІНИ ──
    const priceListHTML = results.map(({ qty, totalCost }) =>
        `<div class="rb-price-row"><span>Тираж: ${qty} шт.</span><strong>${totalCost.toFixed(2)} ₴</strong></div>`
    ).join('');

    // ── БЛОК 2: ТЕХНІЧНИЙ ──
    // Секція ОБКЛАДИНКА
    const techCoverLines = [];
    if (type === 'staple' || type === 'glue') {
        const { covMat, covPrintKey, covLam } = r0;
        const covPrint = covPrintKey ? MAPPING.print[covPrintKey] : null;
        techCoverLines.push({
            label:   `SRA3 ${covMat} ${covPrintKey}`,
            article: getArticle(covMat, covPrintKey),
            counts:  results.map(r => r.coverSRA3),
            costs:   results.map(r => r.coverSRA3 * (getTierPrice(covMat, r.coverSRA3) + getTierPrice(covPrint, r.coverSRA3))),
            unit:    'арк.'
        });
        if (covLam !== 'none') {
            techCoverLines.push({
                label:   covLam,
                article: getBaseArticle(covLam),
                counts:  results.map(r => r.coverSRA3),
                costs:   results.map(r => r.coverSRA3 * getTierPrice(covLam, r.coverSRA3)),
                unit:    'арк.'
            });
        }
    } else {
        if (r0.customCover) {
            const { mat, printKey, lam } = r0.customCover;
            const printName = MAPPING.print[printKey];
            techCoverLines.push({
                label:   `SRA3 ${mat} ${printKey}`,
                article: getArticle(mat, printKey),
                counts:  results.map(r => r.customCover ? r.customCover.sheets : 0),
                costs:   results.map(r => {
                    const s = r.customCover ? r.customCover.sheets : 0;
                    return s * (getTierPrice(mat, s) + getTierPrice(printName, s));
                }),
                unit:    'арк.'
            });
            if (lam !== 'none') {
                techCoverLines.push({
                    label:   lam,
                    article: getBaseArticle(lam),
                    counts:  results.map(r => r.customCover ? r.customCover.sheets : 0),
                    costs:   results.map(r => (r.customCover ? r.customCover.sheets : 0) * getTierPrice(lam, r.customCover ? r.customCover.sheets : 0)),
                    unit:    'арк.'
                });
            }
        }
        if (r0.customBacking) {
            const { mat, printKey, lam } = r0.customBacking;
            const printName = MAPPING.print[printKey];
            techCoverLines.push({
                label:   `SRA3 ${mat} ${printKey}`,
                article: getArticle(mat, printKey),
                counts:  results.map(r => r.customBacking ? r.customBacking.sheets : 0),
                costs:   results.map(r => {
                    const s = r.customBacking ? r.customBacking.sheets : 0;
                    return s * (getTierPrice(mat, s) + getTierPrice(printName, s));
                }),
                unit:    'арк.'
            });
            if (lam !== 'none') {
                techCoverLines.push({
                    label:   lam,
                    article: getBaseArticle(lam),
                    counts:  results.map(r => r.customBacking ? r.customBacking.sheets : 0),
                    costs:   results.map(r => (r.customBacking ? r.customBacking.sheets : 0) * getTierPrice(lam, r.customBacking ? r.customBacking.sheets : 0)),
                    unit:    'арк.'
                });
            }
        }
    }

    // Секція НАПОВНЕННЯ
    const techInnerLine = {
        label:   `SRA3 ${innerMat} ${innerPrintKey}`,
        article: getArticle(innerMat, innerPrintKey),
        counts:  results.map(r => r.innerSRA3),
        costs:   results.map(r => r.innerSRA3 * (getTierPrice(innerMat, r.innerSRA3) + getTierPrice(r.innerPrintName, r.innerSRA3))),
        unit:    'арк.'
    };

    // Секція ЗБІРКА
    const techBindingLine = {
        label:   bindingName,
        article: getBaseArticle(bindingName),
        counts:  results.map(r => r.qty),
        costs:   results.map(r => r.qty * getTierPrice(bindingName, r.qty)),
        unit:    'шт.'
    };

    const hasBig = r0.type === 'staple' && r0.bigCost > 0;
    const techBigLine = hasBig ? {
        label:   'Бігування',
        article: getBaseArticle('Бігування'),
        counts:  results.map(r => r.qty),
        costs:   results.map(r => r.qty * getTierPrice('Бігування', r.qty)),
        unit:    'шт.'
    } : null;

    const techCoverHTML = techCoverLines.length > 0
        ? `<div class="rb-tech-subtitle">Обкладинка</div>${techCoverLines.map(formatTechLine).join('')}`
        : '';

    resultBox.innerHTML = `
        <div class="result-block">
            <div class="rb-title">${productName}</div>
            <div class="rb-section rb-main-spec">
                <div class="rb-row"><span>Розмір:</span><span>${w}×${h} мм</span></div>
                <div class="rb-row"><span>Орієнтація:</span><span>${orientation}</span></div>
                <div class="rb-row"><span>Метод зшивки:</span><span>${bindingLabels[type] || type}</span></div>
            </div>
            ${coverHTML}
            <div class="rb-section">
                <div class="rb-section-title">Наповнення</div>
                <div class="rb-row"><span>Папір:</span><span>${innerMat}</span></div>
                <div class="rb-row"><span>Друк:</span><span>${innerPrintKey}</span></div>
                <div class="rb-row"><span>Сторінок:</span><span>${pages} шт.</span></div>
            </div>
            <div class="rb-price-section">
                ${priceListHTML}
            </div>
            <div class="rb-tech-section">
                <div class="rb-tech-title">Для розрахунку</div>
                ${techCoverHTML}
                <div class="rb-tech-subtitle">Наповнення</div>
                ${formatTechLine(techInnerLine)}
                <div class="rb-tech-subtitle">Збірка</div>
                ${formatTechLine(techBindingLine)}
                ${techBigLine ? formatTechLine(techBigLine) : ''}
            </div>
        </div>
    `;
}
