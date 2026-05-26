document.addEventListener("DOMContentLoaded", () => {
    const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1asD1K_0wabCaXY3vlsqJoeyrXiP_fN_yigfcUUclNew/export?format=csv&gid=0';
    
    // ==========================================
    // СЛОВНИК ВІДПОВІДНОСТЕЙ (НАЛАШТУЙ ПІД ТАБЛИЦЮ)
    // Тут вкажи ТОЧНІ назви з Гугл Таблиці
    // ==========================================
    const MAPPING = {
        print: {
            '4+4': 'Двосторонній друк 4+4', // Заміни на точну назву з таблиці, якщо вона інша
            '4+0': 'Односторонній друк 4+0',
            '1+1': 'Двосторонній друк 1+1',
            '1+0': 'Односторонній друк 1+0'
        },
        binding: {
            'staple': 'Брошуровка - 2 скоби',
            'glue': "М'який переплет",
            'spring-plastic-small': 'Брошуровка А4 - Пластикова пружинка <120 сторінок',
            'spring-plastic-large': 'Брошуровка А4 - Пластикова пружинка >120 сторінок',
            'spring-metal-a4': 'Брошуровка А5/А4 - Металева пружинка',
            'spring-metal-a3': 'Брошуровка А3 - Металева пружинка'
        },
        springBase: {
            'plastic': 'Прозорий пластик', // Точна назва прозорого пластику
            'cardboard': 'Білий картон 300 г/м²' // Точна назва підкладки
        }
    };
    // ==========================================

    window.priceBook = {};
    window.materials = { paper: [], lamination: [] };
  
    const wrapper = document.querySelector('.calculator-wrapper');
    const resultBox = document.getElementById('calc-result');
    const bindingType = document.getElementById('binding-type');
    const innerPrintType = document.getElementById('inner-print-type');
    const innerPages = document.getElementById('inner-pages');
    const pagesHint = document.getElementById('inner-pages-hint');
    const innerMaterial = document.getElementById('inner-material');
  
    function parseCSV(text) {
        const lines = text.split('\n');
        const result = [];
        const headers = lines[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());
        
        for(let i = 1; i < lines.length; i++) {
            if(!lines[i].trim()) continue;
            const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const obj = {};
            for(let j = 0; j < headers.length; j++) {
                obj[headers[j]] = currentline[j] ? currentline[j].replace(/^"|"$/g, '').trim() : '';
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
  
            rows.forEach(row => {
                const name = row['Найменування номенклатури'];
                if (!name) return;
                
                // Надійно очищаємо ціну від пробілів та ком
                const parsePrice = (val) => parseFloat((val || '0').toString().replace(/\s/g, '').replace(',', '.'));
                window.priceBook[name] = {
                    1: parsePrice(row['1+']),
                    5: parsePrice(row['5+']),
                    10: parsePrice(row['10+']),
                    20: parsePrice(row['20+'])
                };
  
                const group = row['Група'] || '';
                const printType = row['Тип друку'] || '';
  
                if ((group.includes('ПАПІР') || group.includes('КАРТОН')) && printType.includes('Лазерний')) {
                    window.materials.paper.push(name);
                }
                if (group.includes('ПОКРИТТЯ')) {
                    window.materials.lamination.push(name);
                }
            });
  
            populateSelects();
            updateUI();
        } catch (error) {
            resultBox.innerHTML = '<span class="error">Помилка завантаження бази даних</span>';
            console.error(error);
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
        const selectsToCheck = [
            'standard-cover-material', 
            'spring-custom-cover-material', 
            'spring-custom-backing-material'
        ];
  
        selectsToCheck.forEach(id => {
            const select = document.getElementById(id);
            if(!select) return;
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
  
        document.getElementById('spring-custom-cover-options').style.display = document.getElementById('spring-has-custom-cover').checked ? 'block' : 'none';
        document.getElementById('spring-custom-backing-options').style.display = document.getElementById('spring-has-custom-backing').checked ? 'block' : 'none';
        
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
        row.querySelector('.remove-qty-btn').addEventListener('click', () => {
            row.remove();
            calculate();
        });
        calculate();
    });
  
    // Функція пошуку ціни з попередженням
    function getTierPrice(itemName, amount) {
        if (!itemName) return 0;
        if (!window.priceBook[itemName]) {
            console.warn(`Увага! В таблиці не знайдено: "${itemName}"`);
            return 0; // Повертаємо 0, якщо не знайшли
        }
        const tiers = window.priceBook[itemName];
        if (amount >= 20 && tiers[20]) return tiers[20];
        if (amount >= 10 && tiers[10]) return tiers[10];
        if (amount >= 5 && tiers[5]) return tiers[5];
        return tiers[1] || 0;
    }
  
    function calculate() {
        if (Object.keys(window.priceBook).length === 0) return;
  
        const w = parseFloat(document.getElementById('calc-width').value);
        const h = parseFloat(document.getElementById('calc-height').value);
        const pages = parseInt(innerPages.value) || 0;
        const type = bindingType.value;
        const qtyInputs = document.querySelectorAll('.calc-quantity');
        const quantities = Array.from(qtyInputs).map(input => parseInt(input.value)).filter(val => val > 0 && !isNaN(val));
  
        if (!w || !h || quantities.length === 0) {
            resultBox.innerHTML = '<span style="color: #666;">Введіть коректні дані</span>';
            return;
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
  
        let resultsHTML = '';
        
        quantities.forEach(qty => {
            let totalCost = 0;
            let breakdownHTML = '';
  
            // 1. НАПОВНЕННЯ
            let innerTotalSpreads = 0;
            if (type === 'staple') innerTotalSpreads = pages / 4;
            else if (type === 'glue') innerTotalSpreads = pages / 2;
            else innerTotalSpreads = (innerPrintType.value.includes('+4') || innerPrintType.value.includes('+1')) ? pages / 2 : pages;
            
            const totalInnerSheets = Math.ceil((innerTotalSpreads * qty) / fitInner);
            const innerMat = innerMaterial.value;
            const innerPrintName = MAPPING.print[innerPrintType.value]; 
  
            if (totalInnerSheets > 0) {
                totalCost += totalInnerSheets * getTierPrice(innerMat, totalInnerSheets);
                totalCost += totalInnerSheets * getTierPrice(innerPrintName, totalInnerSheets);
                breakdownHTML += `
                    <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                        <span>SRA3 на наповнення:</span>
                        <strong>${totalInnerSheets} арк.</strong>
                    </div>`;
            }
  
            // 2. ОБКЛАДИНКА / ПІДКЛАДКА
            if (type === 'staple' || type === 'glue') {
                const totalCoverSheets = Math.ceil(qty / fitCover);
                const covMat = document.getElementById('standard-cover-material').value;
                const covPrint = MAPPING.print[document.getElementById('standard-cover-print').value];
                const covLam = document.getElementById('standard-cover-lamination').value;
  
                totalCost += totalCoverSheets * getTierPrice(covMat, totalCoverSheets);
                totalCost += totalCoverSheets * getTierPrice(covPrint, totalCoverSheets);
                if (covLam !== 'none') totalCost += totalCoverSheets * getTierPrice(covLam, totalCoverSheets);

                breakdownHTML += `
                    <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                        <span>SRA3 на обкладинку:</span>
                        <strong>${totalCoverSheets} арк.</strong>
                    </div>`;
            } else {
                // Пружина
                const baseSet = document.getElementById('spring-base-set').value;
                if (baseSet === 'plastic-white') {
                    totalCost += qty * getTierPrice(MAPPING.springBase['plastic'], qty);
                    totalCost += qty * getTierPrice(MAPPING.springBase['cardboard'], qty);
                } else if (baseSet === 'plastic-plastic') {
                    totalCost += (qty * 2) * getTierPrice(MAPPING.springBase['plastic'], qty * 2);
                }
  
                let customCoverSRA3 = 0, customBackingSRA3 = 0;

                if (document.getElementById('spring-has-custom-cover').checked) {
                    customCoverSRA3 = Math.ceil(qty / fitInner);
                    totalCost += customCoverSRA3 * getTierPrice(document.getElementById('spring-custom-cover-material').value, customCoverSRA3);
                    totalCost += customCoverSRA3 * getTierPrice(MAPPING.print[document.getElementById('spring-custom-cover-print').value], customCoverSRA3);
                    const lam = document.getElementById('spring-custom-cover-lamination').value;
                    if(lam !== 'none') totalCost += customCoverSRA3 * getTierPrice(lam, customCoverSRA3);
                    
                    breakdownHTML += `
                        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                            <span>SRA3 Каст. обкладинка:</span>
                            <strong>${customCoverSRA3} арк.</strong>
                        </div>`;
                }
                
                if (document.getElementById('spring-has-custom-backing').checked) {
                    customBackingSRA3 = Math.ceil(qty / fitInner);
                    totalCost += customBackingSRA3 * getTierPrice(document.getElementById('spring-custom-backing-material').value, customBackingSRA3);
                    totalCost += customBackingSRA3 * getTierPrice(MAPPING.print[document.getElementById('spring-custom-backing-print').value], customBackingSRA3);
                    const lam = document.getElementById('spring-custom-backing-lamination').value;
                    if(lam !== 'none') totalCost += customBackingSRA3 * getTierPrice(lam, customBackingSRA3);

                    breakdownHTML += `
                        <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 4px;">
                            <span>SRA3 Каст. підкладка:</span>
                            <strong>${customBackingSRA3} арк.</strong>
                        </div>`;
                }
            }
  
            // 3. ЗБІРКА (ПОСТДРУК)
            let bindingName = "";
            if (type === 'staple') bindingName = MAPPING.binding['staple'];
            else if (type === 'glue') bindingName = MAPPING.binding['glue'];
            else if (type === 'spring-plastic') bindingName = pages < 120 ? MAPPING.binding['spring-plastic-small'] : MAPPING.binding['spring-plastic-large'];
            else if (type === 'spring-metal') bindingName = (Math.max(w, h) > 297) ? MAPPING.binding['spring-metal-a3'] : MAPPING.binding['spring-metal-a4'];
            
            totalCost += qty * getTierPrice(bindingName, qty);
  
            const unitPrice = (totalCost / qty).toFixed(2);
            const totalStr = totalCost.toFixed(2);
  
            resultsHTML += `
                <div class="proposal-block" style="border: 1px solid #ccc; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #fff;">
                    <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Тираж: ${qty} шт.</div>
                    
                    <div style="margin-bottom: 10px; color: #555;">
                        ${breakdownHTML}
                    </div>

                    <div style="color: #333; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <span>Всього до сплати:</span>
                            <strong style="font-size: 18px; color: #2a7e2a;">${totalStr} ₴</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #666;">
                            <span>Собівартість 1 шт:</span>
                            <strong>${unitPrice} ₴</strong>
                        </div>
                    </div>
                </div>
            `;
        });
  
        resultBox.innerHTML = resultsHTML;
    }
  
    loadMaterials();
});