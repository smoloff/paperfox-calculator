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
            const obj = {};
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
                        if (v && !isNaN(parseFloat(v.replace(/\s/g, '').replace(',', '.')))) {
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

        // Перевірка: скоба — розворот не може перевищувати 420мм
        // Фінальний розмір ≤ 210мм по ширині (менша сторона)
        if (type === 'staple') {
            const shortSide = Math.min(w, h);
            const spread = shortSide * 2; // розворот по ширині
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
        
        const printW_cover = isSpread ? (w * 2) + BLEED : w + BLEED;
        const printH_cover = h + BLEED;
        const printW_inner = w + BLEED;
        const printH_inner = h + BLEED;
  
        const calcFit = (pw, ph) => Math.max(
            Math.floor(SRA3_W / pw) * Math.floor(SRA3_H / ph),
            Math.floor(SRA3_W / ph) * Math.floor(SRA3_H / pw)
        );
  
        const fitCover = calcFit(printW_cover, printH_cover);
        const fitInner = calcFit(printW_inner, printH_inner);
  
        if (fitCover === 0 || fitInner === 0) {
            resultBox.innerHTML = `<span class="error">Формат завеликий. Не поміщається на SRA3.</span>`;
            return;
        }

        console.log(`📐 Розмір: ${w}×${h}мм | fitInner: ${fitInner} | fitCover: ${fitCover}`);
  
        let resultsHTML = '';
        
        quantities.forEach(qty => {
            let totalCost = 0;
            let breakdownHTML = '';
            let debugLines = [];
  
            // ─── 1. НАПОВНЕННЯ ───────────────────────────────────────
            // Скільки двосторонніх аркушів потрібно надрукувати:
            // - Скоба (staple): двосторонній друк → pages / 2 (кожен SRA3 містить fitInner сторінок з кожного боку)
            // - Клей (glue):    двосторонній друк → pages / 2
            // - Пружина одностороння: pages (кожна сторінка = окремий аркуш)
            // - Пружина двостороння:  pages / 2
            let innerLeaves = 0;
            if (type === 'staple') {
                innerLeaves = pages / 2;  // ← ВИПРАВЛЕНО: було pages/4, що давало вдвічі менше
            } else if (type === 'glue') {
                innerLeaves = pages / 2;
            } else {
                const isTwoSided = innerPrintType.value === '4+4' || innerPrintType.value === '1+1';
                innerLeaves = isTwoSided ? pages / 2 : pages;
            }
            
            const totalInnerSheets = Math.ceil((innerLeaves * qty) / fitInner);
            const innerMat = innerMaterial.value;
            // Автовибір типу друку: W+CMY для темних паперів, CMYK для решти
            const matType = window.materialPrintType[innerMat] || 'CMYK';
            const printKey = matType === 'W+CMY'
                ? (innerPrintType.value + '-wcmy')
                : innerPrintType.value;
            const innerPrintName = MAPPING.print[printKey] || MAPPING.print[innerPrintType.value];

            console.log(`📄 Наповнення: ${pages} стор → ${innerLeaves} аркушів × ${qty} прим. / ${fitInner} на SRA3 = ${totalInnerSheets} SRA3`);
  
            if (totalInnerSheets > 0) {
                const matPrice = getTierPrice(innerMat, totalInnerSheets);
                const prnPrice = getTierPrice(innerPrintName, totalInnerSheets);
                const innerCost = totalInnerSheets * (matPrice + prnPrice);
                totalCost += innerCost;
                debugLines.push(`Папір (${innerMat}): ${totalInnerSheets} × ${matPrice} = ${(totalInnerSheets * matPrice).toFixed(2)} ₴`);
                debugLines.push(`Друк (${innerPrintName}): ${totalInnerSheets} × ${prnPrice} = ${(totalInnerSheets * prnPrice).toFixed(2)} ₴`);
                breakdownHTML += `
                    <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
                        <span>SRA3 на наповнення:</span>
                        <strong>${totalInnerSheets} арк.</strong>
                    </div>`;
            }
  
            // ─── 2. ОБКЛАДИНКА ───────────────────────────────────────
            if (type === 'staple' || type === 'glue') {
                const totalCoverSheets = Math.ceil(qty / fitCover);
                const covMat = document.getElementById('standard-cover-material').value;
                const covPrintKey = document.getElementById('standard-cover-print').value;
                const covPrint = MAPPING.print[covPrintKey];
                const covLam = document.getElementById('standard-cover-lamination').value;

                const covMatPrice = getTierPrice(covMat, totalCoverSheets);
                const covPrnPrice = getTierPrice(covPrint, totalCoverSheets);
                const covLamPrice = covLam !== 'none' ? getTierPrice(covLam, totalCoverSheets) : 0;
                const coverCost = totalCoverSheets * (covMatPrice + covPrnPrice + covLamPrice);
                totalCost += coverCost;

                debugLines.push(`Обкладинка (${covMat}): ${totalCoverSheets} × ${covMatPrice} = ${(totalCoverSheets * covMatPrice).toFixed(2)} ₴`);
                debugLines.push(`Друк обкл. (${covPrint}): ${totalCoverSheets} × ${covPrnPrice} = ${(totalCoverSheets * covPrnPrice).toFixed(2)} ₴`);
                if (covLam !== 'none') debugLines.push(`Ламінування: ${totalCoverSheets} × ${covLamPrice} = ${(totalCoverSheets * covLamPrice).toFixed(2)} ₴`);

                breakdownHTML += `
                    <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
                        <span>SRA3 на обкладинку:</span>
                        <strong>${totalCoverSheets} арк.</strong>
                    </div>`;
            } else {
                // Пружина — комплект вже включено в ціну брошурування
                let customCoverSRA3 = 0, customBackingSRA3 = 0;

                if (document.getElementById('spring-has-custom-cover').checked) {
                    customCoverSRA3 = Math.ceil(qty / fitInner);
                    const mat = document.getElementById('spring-custom-cover-material').value;
                    const prn = MAPPING.print[document.getElementById('spring-custom-cover-print').value];
                    const lam = document.getElementById('spring-custom-cover-lamination').value;
                    totalCost += customCoverSRA3 * getTierPrice(mat, customCoverSRA3);
                    totalCost += customCoverSRA3 * getTierPrice(prn, customCoverSRA3);
                    if (lam !== 'none') totalCost += customCoverSRA3 * getTierPrice(lam, customCoverSRA3);
                    breakdownHTML += `
                        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
                            <span>SRA3 Каст. обкладинка:</span>
                            <strong>${customCoverSRA3} арк.</strong>
                        </div>`;
                }
                
                if (document.getElementById('spring-has-custom-backing').checked) {
                    customBackingSRA3 = Math.ceil(qty / fitInner);
                    const mat = document.getElementById('spring-custom-backing-material').value;
                    const prn = MAPPING.print[document.getElementById('spring-custom-backing-print').value];
                    const lam = document.getElementById('spring-custom-backing-lamination').value;
                    totalCost += customBackingSRA3 * getTierPrice(mat, customBackingSRA3);
                    totalCost += customBackingSRA3 * getTierPrice(prn, customBackingSRA3);
                    if (lam !== 'none') totalCost += customBackingSRA3 * getTierPrice(lam, customBackingSRA3);
                    breakdownHTML += `
                        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px;">
                            <span>SRA3 Каст. підкладка:</span>
                            <strong>${customBackingSRA3} арк.</strong>
                        </div>`;
                }
            }
  
            // ─── 3. ЗБІРКА ───────────────────────────────────────────
            let bindingName = '';
            if (type === 'staple') bindingName = MAPPING.binding['staple'];
            else if (type === 'glue') bindingName = MAPPING.binding['glue'];
            else if (type === 'spring-plastic') {
                // А3 формат — використовуємо ціну металевої А3 пружини
                if (Math.max(w, h) > 297) bindingName = MAPPING.binding['spring-metal-a3'];
                else bindingName = pages < 120 ? MAPPING.binding['spring-plastic-small'] : MAPPING.binding['spring-plastic-large'];
            }
            else if (type === 'spring-metal') bindingName = (Math.max(w, h) > 297) ? MAPPING.binding['spring-metal-a3'] : MAPPING.binding['spring-metal-a4'];
            
            const bindPrice = getTierPrice(bindingName, qty);
            const bindCost = qty * bindPrice;
            totalCost += bindCost;
            debugLines.push(`Збірка (${bindingName}): ${qty} × ${bindPrice} = ${bindCost.toFixed(2)} ₴`);

            // ─── ВИВІД ───────────────────────────────────────────────
            console.group(`🧾 Тираж ${qty} шт. | Разом: ${totalCost.toFixed(2)} ₴`);
            debugLines.forEach(l => console.log(l));
            console.groupEnd();

            // ─── ОПИС ЗАМОВЛЕННЯ ─────────────────────────────────────
            const bindingLabels = {
                'staple':        'На скобу',
                'glue':          'Термобіндер (клей)',
                'spring-plastic':'На пластикову пружину',
                'spring-metal':  'На металеву пружину'
            };
            const orientation = w >= h ? 'Альбомна' : 'Книжна';

            // Обкладинка
            let coverDesc = '';
            if (type === 'staple' || type === 'glue') {
                const covMat = document.getElementById('standard-cover-material').value;
                const covLam = document.getElementById('standard-cover-lamination').value;
                const weightMatch = covMat.match(/(\d+)\s*г\/м/);
                const weight = weightMatch ? weightMatch[1] + ' г/м²' : covMat;
                const lamText = covLam !== 'none' ? `, ${covLam}` : ', без ламінування';
                coverDesc = `Обкладинка: ${weight}${lamText}`;
            } else {
                // Пружина
                const baseSet = document.getElementById('spring-base-set').value;
                if (baseSet === 'plastic-white') coverDesc = 'Комплект: прозора обкладинка + білий щільний аркуш';
                else if (baseSet === 'plastic-plastic') coverDesc = 'Комплект: прозора обкладинка + прозора підкладка';
                else coverDesc = 'Без стандартного комплекту';

                if (document.getElementById('spring-has-custom-cover').checked) {
                    const mat = document.getElementById('spring-custom-cover-material').value;
                    const lam = document.getElementById('spring-custom-cover-lamination').value;
                    const lamText = lam !== 'none' ? `, ${lam}` : '';
                    coverDesc += `<br>Кастомна обкладинка: ${mat}${lamText}`;
                }
                if (document.getElementById('spring-has-custom-backing').checked) {
                    const mat = document.getElementById('spring-custom-backing-material').value;
                    const lam = document.getElementById('spring-custom-backing-lamination').value;
                    const lamText = lam !== 'none' ? `, ${lam}` : '';
                    coverDesc += `<br>Кастомна підкладка: ${mat}${lamText}`;
                }
            }

            const totalStr = totalCost.toFixed(2);

            resultsHTML += `
                <div class="proposal-block" style="border:1px solid #ccc;padding:15px;margin-bottom:15px;border-radius:8px;background:#fff;">
                    <div style="font-size:16px;font-weight:bold;margin-bottom:10px;border-bottom:1px solid #eee;padding-bottom:5px;">
                        Тираж: ${qty} шт.
                    </div>

                    <div style="font-size:13px;color:#555;margin-bottom:12px;line-height:1.7;">
                        <div>📎 ${bindingLabels[type] || type}</div>
                        <div>📐 ${orientation} | ${w}×${h} мм</div>
                        <div>📄 Наповнення: ${innerMat}, ${pages} стор.</div>
                        <div>🖨 ${coverDesc}</div>
                    </div>

                    <div style="margin-bottom:10px;color:#777;border-top:1px dashed #eee;padding-top:10px;">${breakdownHTML}</div>

                    <div style="color:#333;margin-top:10px;border-top:1px solid #eee;padding-top:10px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span>Всього до сплати:</span>
                            <strong style="font-size:18px;color:#2a7e2a;">${totalStr} ₴</strong>
                        </div>
                    </div>
                </div>
            `;
        });
  
        resultBox.innerHTML = resultsHTML;
    }
  
    loadMaterials();
});