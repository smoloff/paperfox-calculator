function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const result = [];

    const splitLine = (line) =>
        line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.replace(/^"|"$/g, '').trim());

    // Два рядки заголовків: об'єднуємо, перший пріоритетний
    const row1 = splitLine(lines[0]);
    const row2 = splitLine(lines[1]);
    const maxLen = Math.max(row1.length, row2.length);
    const headers = Array.from({ length: maxLen }, (_, i) => row1[i] || row2[i] || '');

    console.log('📋 Заголовки CSV:', headers.filter(h => h));
    console.log('🔍 Цінові колонки:', headers.filter(h => /^\d+\+$/.test(h)));

    // Дані з рядка 3 (index 2)
    for (let i = 2; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const raw = splitLine(lines[i]);
        const obj = { _raw: raw };
        for (let j = 0; j < headers.length; j++) {
            if (headers[j]) obj[headers[j]] = raw[j] || '';
        }
        result.push(obj);
    }
    return result;
}

async function loadMaterials() {
    const resultBox = document.getElementById('calc-result');
    try {
        const response = await fetch(SHEET_CSV_URL);
        const data = await response.text();
        const rows = parseCSV(data);

        window.priceBook        = {};
        window.materials        = { paper: [], lamination: [] };
        window.materialPrintType = {};

        // Діагностика першого рядка
        const sampleRow = rows.find(r => r['Найменування номенклатури']);
        if (sampleRow) {
            console.log('📦 Зразок рядка:', sampleRow['Найменування номенклатури']);
            Object.entries(sampleRow).forEach(([k, v]) => {
                if (v && !isNaN(parseFloat(v.toString().replace(/\s/g, '').replace(',', '.')))) {
                    console.log(`  "${k}" = "${v}"`);
                }
            });
        }

        rows.forEach(row => {
            const name = row['Найменування номенклатури'];
            if (!name) return;

            const raw = row._raw;

            const parsePrice = (val) => {
                if (!val || val === '') return 0;
                return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
            };
            const p = (key) => parsePrice(row[key] || row[key.replace('+', '')] || '0');

            const group     = row['Група']     || '';
            const printType = row['Тип друку'] || '';
            const isWCMY    = printType.includes('W+CMY');

            const articles = {
                '4+0':  raw[1] || '',
                '4+4':  raw[2] || '',
                '1+0':  raw[3] || '',
                '1+1':  raw[4] || '',
                'base': raw[6] || ''   // колонка G — для ламінації та брошурування
            };

            const priceEntry = {
                1: p('1+'), 5: p('5+'), 10: p('10+'), 20: p('20+'),
                40: p('40+'), 50: p('50+'), 100: p('100+'), 200: p('200+'),
                400: p('400+'), 500: p('500+'), 1000: p('1000+'),
                articles
            };

            // ДРУК: зберігаємо під назвою (W+CMY — з суфіксом)
            if (group === 'ДРУК' || group.includes('ДРУК')) {
                const bookKey = isWCMY ? `${name} (W+CMY)` : name;
                if (!window.priceBook[bookKey]) window.priceBook[bookKey] = priceEntry;
                return;
            }

            // Всі інші: перша поява
            if (!window.priceBook[name]) window.priceBook[name] = priceEntry;

            // Папір для dropdown
            if ((group.includes('ПАПІР') || group.includes('КАРТОН')) && printType.includes('Лазерний')) {
                window.materials.paper.push(name);
                window.materialPrintType[name] = isWCMY ? 'W+CMY' : 'CMYK';
            }

            // Ламінація: тільки з дозволеного списку
            if (group.includes('ПОКРИТТЯ') && ALLOWED_LAMINATIONS.includes(name)) {
                window.materials.lamination.push(name);
            }
        });

        // Діагностика priceBook
        const sampleKey = Object.keys(window.priceBook).find(k => k.toLowerCase().includes('друк'));
        if (sampleKey) {
            const hasPrice = Object.values(window.priceBook[sampleKey]).some(v => typeof v === 'number' && v > 0);
            console.log(hasPrice ? `✅ Ціни OK: "${sampleKey}"` : `❌ Ціни = 0: "${sampleKey}"`);
        }

        populateSelects();
        updateUI();
    } catch (error) {
        resultBox.innerHTML = '<span class="error">Помилка завантаження бази даних</span>';
        console.error('❌ Помилка fetch:', error);
    }
}
