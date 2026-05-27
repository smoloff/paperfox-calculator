document.addEventListener("DOMContentLoaded", () => {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1asD1K_0wabCaXY3vlsqJoeyrXiP_fN_yigfcUUclNew/export?format=csv&gid=0';
    
    const MAPPING = {
        print: {
            '4+4':      'Двосторонній друк 4+4',
            '4+0':      'Односторонній друк 4+0',
            '1+1':      'Двосторонній друк 1+1',
            '1+0':      'Односторонній друк 1+0',
            // W+CMY — для темних паперів (Pergraphica Black, Touche Black...)
            '4+4-wcmy': 'Двосторонній друк 4+4 (W+CMY)',
            '4+0-wcmy': 'Односторонній друк 4+0 (W+CMY)',
        },
        binding: {
            'staple':              'Брошуровка - 2 скоби',
            'glue':                "М'який переплет",
            'spring-plastic-small':'Брошуровка А4 - Пластикова пружинка <120 сторінок',
            'spring-plastic-large':'Брошуровка А4 - Пластикова пружинка >120 сторінок',
            'spring-metal-a4':     'Брошуровка А5/А4 - Металева пружинка',
            'spring-metal-a3':     'Брошуровка А3 - Металева пружинка'
        }
    };

    window.priceBook = {};
    window.materials = { paper: [], lamination: [] };
    window.materialPrintType = {}; // тип друку для кожного паперу: 'CMYK' або 'W+CMY'
  
    const wrapper = document.querySelector('.calculator-wrapper');
    const resultBox = document.getElementById('calc-result');
    const bindingType = document.getElementById('binding-type');
    const innerPrintType = document.getElementById('inner-print-type');
    const innerPages = document.getElementById('inner-pages');
    const pagesHint = document.getElementById('inner-pages-hint');
    const innerMaterial = document.getElementById('inner-material');
  
    function parseCSV(text) {
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        const result = [];

        const splitLine = (line) => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());

        // Таблиця має два рядки заголовків:
        // Рядок 1 (index 0): Найменування номенклатури, Група, Тип друку (col 13-15)
        // Рядок 2 (index 1): Ціни 1+, 5+, 10+... (col 16-26)
        // Об'єднуємо: рядок 1 пріоритетний, порожні комірки заповнюємо з рядка 2
        const row1 = splitLine(lines[0]);
        const row2 = splitLine(lines[1]);
        const maxLen = Math.max(row1.length, row2.length);
        const headers = Array.from({ length: maxLen }, (_, i) => row1[i] || row2[i] || '');

        // ===== ДІАГНОСТИКА CSV =====
        console.log('📋 Об\'єднані заголовки:', headers.filter(h => h));
        console.log('🔍 Колонки з цінами:', headers.filter(h => /^\d+\+$/.test(h)));
        // ===========================

        // Дані починаються з рядка 3 (index 2)
        for (let i = 2; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const currentline = splitLine(lines[i]);
            const obj = { _cols: currentline };
            for (let j = 0; j < headers.length; j++) {
                if (headers[j]) obj[headers[j]] = currentline[j] || '';
            }
            result.push(obj);
        }
        return result;
    }
  
    async function loadMaterials() {
        try {
            const response = await fetch(SHEET_CSV_URL);
            const data = await response.text();
            const rows = parseCSV(data);

            // ===== ДІАГНОСТИКА ПЕРШОГО РЯДКА =====
            if (rows.length > 0) {
                console.log('📦 Перший рядок таблиці:', rows[0]);
                // Знаходимо перший рядок з ціною > 0
                const sampleRow = rows.find(r => r['Найменування номенклатури']);
                if (sampleRow) {
                    console.log('💰 Зразок цін для:', sampleRow['Найменування номенклатури']);
                    // Виводимо всі ключі та їх значення де є числа
                    Object.entries(sampleRow).forEach(([k, v]) => {
                        if (v && !isNaN(parseFloat(v.toString().replace(/\s/g, '').replace(',', '.')))) {
                            console.log(`  Колонка "${k}" = "${v}"`);
                        }
                    });
                }
            }
            // =====================================
  
            rows.forEach(row => {
                const name = row['Найменування номенклатури'];
                if (!name) return;
                
                const parsePrice = (val) => {
                    if (!val || val === '') return 0;
                    return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
                };
                const p = (key) => parsePrice(row[key] || row[key.replace('+', '')] || '0');

                const group = row['Група'] || '';
                const printType = row['Тип друку'] || '';
                const isWCMY = printType.includes('W+CMY');

                // Послуги ДРУК: CMYK зберігаємо під звичайною назвою,
                // W+CMY — під назвою з суфіксом "(W+CMY)"
                if (group === 'ДРУК' || group.includes('ДРУК')) {
                    const bookKey = isWCMY ? `${name} (W+CMY)` : name;
                    if (!window.priceBook[bookKey]) {
                        window.priceBook[bookKey] = {
                            1: p('1+'), 5: p('5+'), 10: p('10+'), 20: p('20+'),
                            40: p('40+'), 50: p('50+'), 100: p('100+'), 200: p('200+'),
                            400: p('400+'), 500: p('500+'), 1000: p('1000+')
                        };
                    }
                    return; // не додаємо до materials
                }

                // Всі інші позиції: зберігаємо першу появу
                if (!window.priceBook[name]) {
                    window.priceBook[name] = {
                        1: p('1+'), 5: p('5+'), 10: p('10+'), 20: p('20+'),
                        40: p('40+'), 50: p('50+'), 100: p('100+'), 200: p('200+'),
                        400: p('400+'), 500: p('500+'), 1000: p('1000+')
                    };
                }
  
                // Папір для dropdown — зберігаємо тип друку
                if ((group.includes('ПАПІР') || group.includes('КАРТОН')) && printType.includes('Лазерний')) {
                    window.materials.paper.push(name);
                    window.materialPrintType[name] = isWCMY ? 'W+CMY' : 'CMYK';
                    if (window.priceBook[name]) {
                        window.priceBook[name].articles = {
                            '4+0': row._cols[1] || '',
                            '4+4': row._cols[2] || '',
                            '1+0': row._cols[3] || '',
                            '1+1': row._cols[4] || ''
                        };
                    }
                }
                if (group.includes('ПОКРИТТЯ')) {
                    window.materials.lamination.push(name);
                }
            });

            // ===== ДІАГНОСТИКА PREBOOK =====
            const sampleKey = Object.keys(window.priceBook).find(k => k.includes('друк') || k.includes('Друк'));
            if (sampleKey) {
                console.log(`📊 priceBook["${sampleKey}"]:`, window.priceBook[sampleKey]);
                const hasAnyPrice = Object.values(window.priceBook[sampleKey]).some(v => v > 0);
                console.log(hasAnyPrice ? '✅ Ціни завантажились!' : '❌ Всі ціни = 0, перевір назви колонок!');
            }
            // ================================
  
            populateSelects();
            updateUI();
        } catch (error) {
            resultBox.innerHTML = '<span class="error">Помилка завантаження бази даних</span>';
            console.error('❌ Помилка fetch:', error);
        }
    }
  
    function populateSelects() {
        const createOptions = (arr, defaultOpt = null) => {
            let html = defaultOpt ? `<option value="${defaultOpt.val}">${defaultOpt.text}</option>` : '';
            arr.forEach(item => html += `<option value="${item}">${item}</option>`);
            return html;
        };
        const noLam = { val: 'none', text: 'Без ламінування' };
  
        document.getElementById('inner-material').innerHTML = createOptions(window.materials.paper);
        document.getElementById('standard-cover-material').innerHTML = createOptions(window.materials.paper);
        document.getElementById('spring-custom-cover-material').innerHTML = createOptions(window.materials.paper);
        document.getElementById('spring-custom-backing-material').innerHTML = createOptions(window.materials.paper);
  
        document.getElementById('standard-cover-lamination').innerHTML = createOptions(window.materials.lamination, noLam);
        document.getElementById('spring-custom-cover-lamination').innerHTML = createOptions(window.materials.lamination, noLam);
        document.getElementById('spring-custom-backing-lamination').innerHTML = createOptions(window.materials.lamination, noLam);
    }
  
    function getMaterialWeight(name) {
        if (!name || name === 'none' || name.includes('пластик')) return 999;
        const match = name.match(/(\d+)\s*г\/м/);
        return match ? parseInt(match[1]) : 0;
    }
  
    function updateMaterialConstraints() {
        const innerWeight = getMaterialWeight(innerMaterial.value);
        const selectsToCheck = ['standard-cover-material', 'spring-custom-cover-material', 'spring-custom-backing-material'];
        selectsToCheck.forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            Array.from(select.options).forEach(opt => {
                const optWeight = getMaterialWeight(opt.value);
                opt.disabled = optWeight < innerWeight && optWeight !== 999 && optWeight !== 0;
            });
            if (select.options[select.selectedIndex] && select.options[select.selectedIndex].disabled) {
                const firstEnabled = Array.from(select.options).find(o => !o.disabled);
                if (firstEnabled) select.value = firstEnabled.value;
            }
        });
    }
  
    function updateUI() {
        const type = bindingType.value;
        const printType = innerPrintType.value;
        const blockStandard = document.getElementById('block-standard-cover');
        const blockSpring = document.getElementById('block-spring-options');
        
        Array.from(innerPrintType.options).forEach(opt => opt.disabled = false);
  
        if (type === 'staple' || type === 'glue') {
            blockStandard.style.display = 'block';
            blockSpring.style.display = 'none';
            if (printType === '4+0' || printType === '1+0') {
                innerPrintType.value = printType === '4+0' ? '4+4' : '1+1';
            }
            Array.from(innerPrintType.options).forEach(opt => {
                if (opt.value === '4+0' || opt.value === '1+0') opt.disabled = true;
            });
            innerPages.step = type === 'staple' ? 4 : 2;
            pagesHint.textContent = `Кратність сторінок: ${innerPages.step}`;
        } else {
            blockStandard.style.display = 'none';
            blockSpring.style.display = 'block';
            const isTwoSided = printType === '4+4' || printType === '1+1';
            innerPages.step = isTwoSided ? 2 : 1;
            pagesHint.textContent = isTwoSided ? "Кількість сторінок має бути парною" : "Будь-яка кількість сторінок";
        }
  
        document.getElementById('spring-custom-cover-options').style.display =
            document.getElementById('spring-has-custom-cover').checked ? 'block' : 'none';
        document.getElementById('spring-custom-backing-options').style.display =
            document.getElementById('spring-has-custom-backing').checked ? 'block' : 'none';
        
        updateMaterialConstraints();
        calculate();
    }
  
    wrapper.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            if (e.target.id === 'inner-material') updateMaterialConstraints();
            updateUI();
        }
    });
  
    document.getElementById('add-proposal-btn').addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'quantity-row';
        row.innerHTML = `
            <input type="number" class="calc-quantity" placeholder="шт" min="1" value="10">
            <button type="button" class="remove-qty-btn" title="Видалити тираж">×</button>
        `;
        document.getElementById('quantity-container').appendChild(row);
        row.querySelector('.remove-qty-btn').addEventListener('click', () => { row.remove(); calculate(); });
        calculate();
    });
  
    function getTierPrice(itemName, amount) {
        if (!itemName) return 0;
        if (!window.priceBook[itemName]) {
            console.warn(`⚠️ В таблиці не знайдено: "${itemName}"`);
            return 0;
        }
        const tiers = window.priceBook[itemName];
        const thresholds = [1000, 500, 400, 200, 100, 50, 40, 20, 10, 5, 1];
        for (const t of thresholds) {
            if (amount >= t && tiers[t] > 0) return tiers[t];
        }
        // Якщо всі ціни 0 — повертаємо тариф 1+
        return tiers[1] || 0;
    }
  
    function calculate() {
        if (Object.keys(window.priceBook).length === 0) return;

        const w = parseFloat(document.getElementById('calc-width').value);
        const h = parseFloat(document.getElementById('calc-height').value);
        const pages = parseInt(innerPages.value) || 0;
        const type = bindingType.value;
        const qtyInputs = document.querySelectorAll('.calc-quantity');
        const quantities = Array.from(qtyInputs).map(i => parseInt(i.value)).filter(v => v > 0 && !isNaN(v));

        if (!w || !h || quantities.length === 0) {
            resultBox.innerHTML = '<span style="color:#666;">Введіть коректні дані</span>';
            return;
        }

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

        const SRA3_W = 310, SRA3_H = 440, BLEED = 4;
        const isSpread = type === 'staple' || type === 'glue';
        const calcFit = (pw, ph) => Math.max(
            Math.floor(SRA3_W / pw) * Math.floor(SRA3_H / ph),
            Math.floor(SRA3_W / ph) * Math.floor(SRA3_H / pw)
        );
        const fitCover = calcFit(isSpread ? (w * 2) + BLEED : w + BLEED, h + BLEED);
        const fitInner = calcFit(w + BLEED, h + BLEED);

        if (fitCover === 0 || fitInner === 0) {
            resultBox.innerHTML = `<span class="error">Формат завеликий. Не поміщається на SRA3.</span>`;
            return;
        }

        const innerMat = innerMaterial.value;
        const matType = window.materialPrintType[innerMat] || 'CMYK';
        const innerPrintBaseKey = innerPrintType.value;
        const innerPrintKey = matType === 'W+CMY' ? innerPrintBaseKey + '-wcmy' : innerPrintBaseKey;
        const innerPrintName = MAPPING.print[innerPrintKey] || MAPPING.print[innerPrintBaseKey];

        let innerLeaves = 0;
        if (type === 'staple' || type === 'glue') {
            innerLeaves = pages / 2;
        } else {
            const isTwoSided = innerPrintBaseKey === '4+4' || innerPrintBaseKey === '1+1';
            innerLeaves = isTwoSided ? pages / 2 : pages;
        }

        const getArticle = (matName, printKey) => {
            const entry = window.priceBook[matName];
            if (!entry || !entry.articles) return '';
            return entry.articles[printKey.replace('-wcmy', '')] || '';
        };

        // Збираємо технічні рядки: унікальний матеріал+друк → кількість аркушів по тиражах
        const techMap = new Map();
        const addTech = (matName, printKey, printDisplay, qi, sheets) => {
            const key = `${matName}|${printKey}`;
            if (!techMap.has(key)) {
                techMap.set(key, {
                    matName,
                    printDisplay,
                    article: getArticle(matName, printKey),
                    sheets: quantities.map(() => 0)
                });
            }
            techMap.get(key).sheets[qi] += sheets;
        };

        // Розраховуємо вартість кожного тиражу
        const qtyCosts = quantities.map((qty, qi) => {
            let totalCost = 0;

            // Наповнення
            const totalInnerSheets = Math.ceil((innerLeaves * qty) / fitInner);
            if (totalInnerSheets > 0) {
                totalCost += totalInnerSheets * getTierPrice(innerMat, totalInnerSheets);
                totalCost += totalInnerSheets * getTierPrice(innerPrintName, totalInnerSheets);
                addTech(innerMat, innerPrintKey, innerPrintBaseKey, qi, totalInnerSheets);
            }

            // Обкладинка
            if (type === 'staple' || type === 'glue') {
                const totalCoverSheets = Math.ceil(qty / fitCover);
                const covMat = document.getElementById('standard-cover-material').value;
                const covPrintKey = document.getElementById('standard-cover-print').value;
                const covPrint = MAPPING.print[covPrintKey];
                const covLam = document.getElementById('standard-cover-lamination').value;
                totalCost += totalCoverSheets * getTierPrice(covMat, totalCoverSheets);
                totalCost += totalCoverSheets * getTierPrice(covPrint, totalCoverSheets);
                if (covLam !== 'none') totalCost += totalCoverSheets * getTierPrice(covLam, totalCoverSheets);
                addTech(covMat, covPrintKey, covPrintKey, qi, totalCoverSheets);
                if (covLam !== 'none') addTech(covLam, 'lam', '', qi, totalCoverSheets);
            } else {
                if (document.getElementById('spring-has-custom-cover').checked) {
                    const sheets = Math.ceil(qty / fitInner);
                    const mat = document.getElementById('spring-custom-cover-material').value;
                    const prnKey = document.getElementById('spring-custom-cover-print').value;
                    const lam = document.getElementById('spring-custom-cover-lamination').value;
                    totalCost += sheets * (getTierPrice(mat, sheets) + getTierPrice(MAPPING.print[prnKey], sheets));
                    if (lam !== 'none') totalCost += sheets * getTierPrice(lam, sheets);
                    addTech(mat, prnKey, prnKey, qi, sheets);
                    if (lam !== 'none') addTech(lam, 'lam', '', qi, sheets);
                }
                if (document.getElementById('spring-has-custom-backing').checked) {
                    const sheets = Math.ceil(qty / fitInner);
                    const mat = document.getElementById('spring-custom-backing-material').value;
                    const prnKey = document.getElementById('spring-custom-backing-print').value;
                    const lam = document.getElementById('spring-custom-backing-lamination').value;
                    totalCost += sheets * (getTierPrice(mat, sheets) + getTierPrice(MAPPING.print[prnKey], sheets));
                    if (lam !== 'none') totalCost += sheets * getTierPrice(lam, sheets);
                    addTech(mat, prnKey, prnKey, qi, sheets);
                    if (lam !== 'none') addTech(lam, 'lam', '', qi, sheets);
                }
            }

            // Збірка
            let bindingName = '';
            if (type === 'staple') bindingName = MAPPING.binding['staple'];
            else if (type === 'glue') bindingName = MAPPING.binding['glue'];
            else if (type === 'spring-plastic') {
                bindingName = Math.max(w, h) > 297 ? MAPPING.binding['spring-metal-a3']
                    : pages < 120 ? MAPPING.binding['spring-plastic-small'] : MAPPING.binding['spring-plastic-large'];
            }
            else if (type === 'spring-metal') {
                bindingName = (Math.max(w, h) > 297) ? MAPPING.binding['spring-metal-a3'] : MAPPING.binding['spring-metal-a4'];
            }
            totalCost += qty * getTierPrice(bindingName, qty);

            return totalCost;
        });

        // Назва продукту
        const formatMap = [[148, 210, 'А5'], [210, 297, 'А4'], [297, 420, 'А3']];
        const sortedDims = [w, h].sort((a, b) => a - b);
        const fmtMatch = formatMap.find(([sw, sh]) => Math.abs(sortedDims[0] - sw) <= 2 && Math.abs(sortedDims[1] - sh) <= 2);
        const productName = fmtMatch ? `Брошура ${fmtMatch[2]} (${w}×${h} мм)` : `Буклет ${w}×${h} мм`;
        const orientation = w >= h ? 'Альбомна' : 'Книжна';
        const bindingLabels = {
            'staple':         'На скобу',
            'glue':           'Термобіндер (клей)',
            'spring-plastic': 'На пластикову пружину',
            'spring-metal':   'На металеву пружину'
        };

        // Секція обкладинки
        let coverHTML = '';
        if (type === 'staple' || type === 'glue') {
            const covMat = document.getElementById('standard-cover-material').value;
            const covPrintKey = document.getElementById('standard-cover-print').value;
            const covLam = document.getElementById('standard-cover-lamination').value;
            coverHTML = `
                <div class="rb-section">
                    <div class="rb-section-title">Обкладинка</div>
                    <div class="rb-row"><span>Папір:</span><span>${covMat}</span></div>
                    <div class="rb-row"><span>Друк:</span><span>${covPrintKey}</span></div>
                    <div class="rb-row"><span>Ламінація:</span><span>${covLam !== 'none' ? covLam : 'без ламінування'}</span></div>
                </div>`;
        } else {
            const baseSet = document.getElementById('spring-base-set').value;
            const kitLabels = {
                'plastic-white':   'Прозора обкладинка + Біла підкладка',
                'plastic-plastic': 'Прозора обкладинка + Прозора підкладка',
                'none':            'Без комплекту'
            };
            coverHTML = `<div class="rb-section"><div class="rb-section-title">Обкладинка</div>
                <div class="rb-row"><span>Комплект:</span><span>${kitLabels[baseSet] || baseSet}</span></div>`;
            if (document.getElementById('spring-has-custom-cover').checked) {
                const mat = document.getElementById('spring-custom-cover-material').value;
                const prnKey = document.getElementById('spring-custom-cover-print').value;
                const lam = document.getElementById('spring-custom-cover-lamination').value;
                coverHTML += `<div class="rb-subsection-title">Додаткова обкладинка:</div>
                    <div class="rb-row"><span>Папір:</span><span>${mat}</span></div>
                    <div class="rb-row"><span>Друк:</span><span>${prnKey}</span></div>
                    <div class="rb-row"><span>Ламінація:</span><span>${lam !== 'none' ? lam : 'без'}</span></div>`;
            }
            if (document.getElementById('spring-has-custom-backing').checked) {
                const mat = document.getElementById('spring-custom-backing-material').value;
                const prnKey = document.getElementById('spring-custom-backing-print').value;
                const lam = document.getElementById('spring-custom-backing-lamination').value;
                coverHTML += `<div class="rb-subsection-title">Додаткова підкладка:</div>
                    <div class="rb-row"><span>Папір:</span><span>${mat}</span></div>
                    <div class="rb-row"><span>Друк:</span><span>${prnKey}</span></div>
                    <div class="rb-row"><span>Ламінація:</span><span>${lam !== 'none' ? lam : 'без'}</span></div>`;
            }
            coverHTML += `</div>`;
        }

        const priceListHTML = quantities.map((qty, i) =>
            `<div class="rb-price-row"><span>Тираж: ${qty} шт.</span><strong>${qtyCosts[i].toFixed(2)} ₴</strong></div>`
        ).join('');

        const techRowsHTML = Array.from(techMap.values()).map(({ matName, printDisplay, article, sheets }) => {
            const printPart = printDisplay ? ` ${printDisplay}` : '';
            const articlePart = article ? ` (арт. ${article})` : '';
            const sheetsPart = sheets.map(s => `${s} арк.`).join(' | ');
            return `<div class="rb-tech-row">SRA3 ${matName}${printPart}${articlePart} — ${sheetsPart}</div>`;
        }).join('');

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
                    <div class="rb-row"><span>Друк:</span><span>${innerPrintBaseKey}</span></div>
                    <div class="rb-row"><span>Сторінок:</span><span>${pages} шт.</span></div>
                </div>
                <div class="rb-price-section">
                    ${priceListHTML}
                </div>
                <div class="rb-tech-section">
                    <div class="rb-tech-title">Для розрахунку</div>
                    ${techRowsHTML}
                </div>
            </div>
        `;
    }
  
    loadMaterials();
});