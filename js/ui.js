// ── Заповнення dropdown-ів після завантаження даних ──
function populateSelects() {
    const createOptions = (arr, defaultOpt = null) => {
        let html = defaultOpt ? `<option value="${defaultOpt.val}">${defaultOpt.text}</option>` : '';
        arr.forEach(item => html += `<option value="${item}">${item}</option>`);
        return html;
    };
    const noLam = { val: 'none', text: 'Без ламінування' };

    document.getElementById('inner-material').innerHTML                = createOptions(window.materials.paper);
    document.getElementById('standard-cover-material').innerHTML       = createOptions(window.materials.paper);
    document.getElementById('spring-custom-cover-material').innerHTML  = createOptions(window.materials.paper);
    document.getElementById('spring-custom-backing-material').innerHTML= createOptions(window.materials.paper);

    document.getElementById('standard-cover-lamination').innerHTML      = createOptions(window.materials.lamination, noLam);
    document.getElementById('spring-custom-cover-lamination').innerHTML = createOptions(window.materials.lamination, noLam);
    document.getElementById('spring-custom-backing-lamination').innerHTML= createOptions(window.materials.lamination, noLam);
}

// ── Блокування cover-матеріалів легших за inner ──
function updateMaterialConstraints() {
    const innerWeight = getMaterialWeight(document.getElementById('inner-material').value);
    const selectsToCheck = [
        'standard-cover-material',
        'spring-custom-cover-material',
        'spring-custom-backing-material'
    ];
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

// ── Оновлення видимості блоків і кроку сторінок ──
function updateUI() {
    const type           = document.getElementById('binding-type').value;
    const innerPrintType = document.getElementById('inner-print-type');
    const printType      = innerPrintType.value;
    const innerPages     = document.getElementById('inner-pages');
    const pagesHint      = document.getElementById('inner-pages-hint');
    const blockStandard  = document.getElementById('block-standard-cover');
    const blockSpring    = document.getElementById('block-spring-options');

    Array.from(innerPrintType.options).forEach(opt => opt.disabled = false);

    if (type === 'staple' || type === 'glue') {
        blockStandard.style.display = 'block';
        blockSpring.style.display   = 'none';
        if (printType === '4+0' || printType === '1+0') {
            innerPrintType.value = printType === '4+0' ? '4+4' : '1+1';
        }
        Array.from(innerPrintType.options).forEach(opt => {
            if (opt.value === '4+0' || opt.value === '1+0') opt.disabled = true;
        });
        innerPages.step     = type === 'staple' ? 4 : 2;
        pagesHint.textContent = `Кратність сторінок: ${innerPages.step}`;
    } else {
        blockStandard.style.display = 'none';
        blockSpring.style.display   = 'block';
        const isTwoSided    = printType === '4+4' || printType === '1+1';
        innerPages.step     = isTwoSided ? 2 : 1;
        pagesHint.textContent = isTwoSided
            ? 'Кількість сторінок має бути парною'
            : 'Будь-яка кількість сторінок';
    }

    document.getElementById('spring-custom-cover-options').style.display =
        document.getElementById('spring-has-custom-cover').checked ? 'block' : 'none';
    document.getElementById('spring-custom-backing-options').style.display =
        document.getElementById('spring-has-custom-backing').checked ? 'block' : 'none';

    updateMaterialConstraints();
    calculate();
}

// ── Ініціалізація після завантаження DOM ──
document.addEventListener('DOMContentLoaded', () => {

    // Реагуємо на зміни будь-якого поля форми
    document.querySelector('.calculator-wrapper').addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
            if (e.target.id === 'inner-material') updateMaterialConstraints();
            updateUI();
        }
    });

    // Кнопка "+ Комерційна пропозиція"
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

    loadMaterials();
});
