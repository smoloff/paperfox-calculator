document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.querySelector('.calculator-wrapper');
  const resultBox = document.getElementById('calc-result');
  const addBtn = document.getElementById('add-proposal-btn');
  const qtyContainer = document.getElementById('quantity-container');

  const SRA3_SAFE_W = 310;
  const SRA3_SAFE_H = 440;
  const BLEED_TOTAL = 4; 

  // Використовуємо делегування подій на всю обгортку калькулятора.
  // Це дозволяє відстежувати зміни навіть у динамічно доданих полях інпутів.
  wrapper.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      calculate();
    }
  });

  // Додавання нового поля тиражу
  addBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'quantity-row';
    row.innerHTML = `
      <input type="number" class="calc-quantity" placeholder="шт" min="1">
      <button type="button" class="remove-qty-btn" title="Видалити тираж">×</button>
    `;
    qtyContainer.appendChild(row);
    
        // Обробник для кнопки видалення конкретного поля
    row.querySelector('.remove-qty-btn').addEventListener('click', () => {
      row.remove();
      calculate(); // Перераховуємо після видалення
    });
  });

  // Логіка перемикання блоків UI та валідації
  const bindingTypeSelect = document.getElementById('binding-type');
  const coverBlockStandard = document.getElementById('cover-block-standard');
  const coverBlockSpring = document.getElementById('cover-block-spring');
  const pagesHint = document.getElementById('pages-hint');
  const innerPagesInput = document.getElementById('inner-pages');

  function updateUIState() {
    const bindingType = bindingTypeSelect.value;

    if (bindingType === 'spring') {
      coverBlockStandard.style.display = 'none';
      coverBlockSpring.style.display = 'block';
      pagesHint.textContent = 'Кількість сторінок має бути парною (2, 4, 6...)';
      innerPagesInput.step = "2";
      if (parseInt(innerPagesInput.value) % 2 !== 0) {
          innerPagesInput.value = Math.max(2, Math.floor(parseInt(innerPagesInput.value) / 2) * 2);
      }
    } else {
      coverBlockStandard.style.display = 'block';
      coverBlockSpring.style.display = 'none';
      
      if (bindingType === 'staple') {
        pagesHint.textContent = 'Кількість сторінок має бути кратною 4 (4, 8, 12...)';
        innerPagesInput.step = "4";
        if (parseInt(innerPagesInput.value) % 4 !== 0) {
            innerPagesInput.value = Math.max(4, Math.floor(parseInt(innerPagesInput.value) / 4) * 4);
        }
      } else {
        pagesHint.textContent = 'Кількість сторінок має бути парною (2, 4, 6...)';
        innerPagesInput.step = "2";
        if (parseInt(innerPagesInput.value) % 2 !== 0) {
            innerPagesInput.value = Math.max(2, Math.floor(parseInt(innerPagesInput.value) / 2) * 2);
        }
      }
    }
  }

  bindingTypeSelect.addEventListener('change', () => {
    updateUIState();
    calculate();
  });

  // Ініціалізація стану при завантаженні
  updateUIState();

  function calculate() {
    const w = parseFloat(document.getElementById('calc-width').value);
    const h = parseFloat(document.getElementById('calc-height').value);
    const pages = parseInt(document.getElementById('inner-pages').value) || 0;
    const bindingType = document.getElementById('binding-type').value;
    const innerPrintType = document.getElementById('inner-print').value;

    const qtyInputs = document.querySelectorAll('.calc-quantity');
    const quantities = Array.from(qtyInputs)
      .map(input => parseInt(input.value))
      .filter(val => val > 0 && !isNaN(val));

    if (!w || !h || quantities.length === 0) {
      resultBox.innerHTML = '<span style="color: #666;">Введіть розміри та хоча б один тираж для розрахунку</span>';
      return;
    }

    // Валідація кількості сторінок
    if (pages > 0) {
      if (bindingType === 'staple' && pages % 4 !== 0) {
        resultBox.innerHTML = '<span class="error">Помилка: Для скоби сторінок має бути кратно 4.</span>';
        return;
      }
      if (pages % 2 !== 0) {
        resultBox.innerHTML = '<span class="error">Помилка: Кількість сторінок має бути парною.</span>';
        return;
      }
    }

    // Розміри елементів (з вильотами)
    const spreadW = (w * 2) + BLEED_TOTAL;
    const spreadH = h + BLEED_TOTAL;
    const singleW = w + BLEED_TOTAL;
    const singleH = h + BLEED_TOTAL;

    // Розрахунок вкладок на аркуш SRA3
    const getFit = (itemW, itemH) => {
      const fitPortrait = Math.floor(SRA3_SAFE_W / itemW) * Math.floor(SRA3_SAFE_H / itemH);
      const fitLandscape = Math.floor(SRA3_SAFE_W / itemH) * Math.floor(SRA3_SAFE_H / itemW);
      return Math.max(0, fitPortrait, fitLandscape);
    };

    const itemsPerSheetSpread = getFit(spreadW, spreadH);
    const itemsPerSheetSingle = getFit(singleW, singleH);

    // Перевірка на габарити
    if (bindingType === 'spring') {
      if (itemsPerSheetSingle === 0) {
        resultBox.innerHTML = `<span class="error">Формат завеликий. Сторінка ${singleW}x${singleH} мм не поміщається на SRA3.</span>`;
        return;
      }
    } else if (itemsPerSheetSpread === 0) {
      resultBox.innerHTML = `<span class="error">Формат завеликий. Розворот ${spreadW}x${spreadH} мм не поміщається на SRA3.</span>`;
      return;
    }

    let resultsHTML = '';

    quantities.forEach(qty => {
      let coverSheets = 0;
      let backSheets = 0;
      let innerSheets = 0;
      let totalSheets = 0;
      let detailsHTML = '';

      if (bindingType === 'staple') {
        // Скоба: все розворотами
        coverSheets = Math.ceil(qty / itemsPerSheetSpread);
        innerSheets = Math.ceil((qty * (pages / 4)) / itemsPerSheetSpread);
        detailsHTML = `
          <div class="result-row"><span>SRA3 на обкладинку:</span><strong>${coverSheets}</strong></div>
          <div class="result-row"><span>SRA3 на наповнення:</span><strong>${innerSheets}</strong></div>
        `;
      } 
      else if (bindingType === 'glue') {
        // Термобіндер: обкладинка розворотом, нутрощі поаркушно
        coverSheets = Math.ceil(qty / itemsPerSheetSpread);
        innerSheets = Math.ceil((qty * (pages / 2)) / itemsPerSheetSingle);
        detailsHTML = `
          <div class="result-row"><span>SRA3 на обкладинку (розвороти):</span><strong>${coverSheets}</strong></div>
          <div class="result-row"><span>SRA3 на наповнення (поаркушно):</span><strong>${innerSheets}</strong></div>
        `;
      } 
      else if (bindingType === 'spring') {
        // Пружина: все поаркушно (окремі обкладинки)
        coverSheets = Math.ceil(qty / itemsPerSheetSingle); // Передня
        backSheets = Math.ceil(qty / itemsPerSheetSingle);  // Задня
        
        const isOneSided = innerPrintType.includes('+0');
        const innerPagesPerBook = isOneSided ? pages : Math.ceil(pages / 2);
        innerSheets = Math.ceil((qty * innerPagesPerBook) / itemsPerSheetSingle);
        
        detailsHTML = `
          <div class="result-row"><span>SRA3 на передню обкл.:</span><strong>${coverSheets}</strong></div>
          <div class="result-row"><span>SRA3 на задню обкл.:</span><strong>${backSheets}</strong></div>
          <div class="result-row"><span>SRA3 на наповнення:</span><strong>${innerSheets}</strong></div>
        `;
      }

      totalSheets = coverSheets + backSheets + innerSheets;

      resultsHTML += `
        <div class="proposal-block">
          <div class="proposal-title">Тираж: ${qty} шт.</div>
          ${detailsHTML}
          <div class="result-row result-total">
            <span>Всього аркушів SRA3:</span>
            <strong>${totalSheets} арк.</strong>
          </div>
        </div>
      `;
    });

    resultBox.innerHTML = resultsHTML;
  }

});