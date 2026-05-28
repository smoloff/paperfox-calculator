function parseCSV(text) {
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const result = [];

    const splitLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            const next = line[i + 1];

            if (ch === '"') {
                if (inQuotes && next === '"') {
                    // Екранована лапка ""
                    current += '"';
                    i++;
                } else {
                    // Початок/кінець лапок
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                // Розділювач полів
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    };

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

        const knownGroups = ['ПАПІР','КАРТОН','ДРУК','ПОКРИТТЯ','ПОСТДРУК','ВІЗИТКИ','САМОКЛЕЙКА'];
        const PRICE_KEYS  = [1, 5, 10, 20, 40, 50, 100, 200, 400, 500, 1000];

        rows.forEach(row => {
            const raw = row._raw;

            // Динамічно знаходимо колонку Групи
            const groupIdx = raw.findIndex(cell => knownGroups.includes(cell?.trim()));
            if (groupIdx === -1) return;

            const group     = raw[groupIdx].trim();
            const printType = raw[groupIdx + 1]?.trim() || '';
            const name      = raw[groupIdx + 2]?.trim() || '';
            if (!name) return;

            const isWCMY = printType.includes('W+CMY');

            // base article — перше непусте значення між col 5 і groupIdx
            const base = raw.slice(5, groupIdx).find(v => v?.trim()) || '';

            const articles = {
                '4+0':  raw[1] || '',
                '4+4':  raw[2] || '',
                '1+0':  raw[3] || '',
                '1+1':  raw[4] || '',
                'base': base
            };

            const parsePrice = (val) => {
                if (!val || val === '') return 0;
                return parseFloat(val.toString().replace(/\s/g, '').replace(',', '.')) || 0;
            };

            const priceStart = groupIdx + 3;
            const priceEntry = { articles };
            PRICE_KEYS.forEach((qty, i) => {
                priceEntry[qty] = parsePrice(raw[priceStart + i]);
            });

            // ДРУК: зберігаємо під назвою (W+CMY — з суфіксом)
            if (group.includes('ДРУК')) {
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

            // Ламінація: рулонна гаряча з групи ПОКРИТТЯ
            if (group === 'ПОКРИТТЯ' && printType === 'Рулонна гаряча') {
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
