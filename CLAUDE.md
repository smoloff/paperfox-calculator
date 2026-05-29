# Калькулятор Брошур

Веб-калькулятор вартості друку брошур. Vanilla JS, без збірки. 
Прайс — з Google Sheets через CSV export.

## Архітектура

- `index.html` — розмітка форми + блок результату
- `style.css` — стилі
- `js/config.js` — константи (SRA3, BLEED), мапінги назв друку і збірки, URL прайсу
- `js/helpers.js` — універсальні утиліти: getMaterialWeight, getTierPrice, 
  calcFit, fetchWithRetry
- `js/data-loader.js` — parseCSV + loadMaterials, наповнює window.priceBook
- `js/calculator.js` — calculate(): єдина точка розрахунку вартості
- `js/output.js` — renderResults(): тільки рендер HTML, без обчислень
- `js/ui.js` — populateSelects, updateUI, ініціалізація івентів

Порядок підключення скриптів у index.html критичний:
config → helpers → data-loader → calculator → output → ui

## Глобальний стан (window.*)

- `priceBook` — { назва: { 1: ціна, 5: ціна, ..., articles: {4+0, 4+4, 1+0, 1+1, base} } }
- `materials` — { paper: [], lamination: [] }
- `materialPrintType` — { назва: 'CMYK' | 'W+CMY' }

## Конвенції

- Без TypeScript, без бандлера, без npm-залежностей
- UI і коментарі — українською
- Ціни рахуються ТІЛЬКИ в `calculator.js`
- `output.js` форматує, не рахує
- Глобальні функції — це навмисно, не модулі. Не запихати в IIFE/ES-модулі без 
  попереднього обговорення.

## Запуск

Відкрити `index.html` у браузері. Тестування ручне через DevTools.

## Workflow змін

- Кожна суттєва зміна — окрема гілка `feature/<коротка-назва>`
- Перед мерджом у main — перевірити в браузері всі 4 способи скріплення:
  скоба, термобіндер, пластикова пружина, металева пружина
- Не змінювати структуру `priceBook` без оновлення `data-loader.js` І споживачів

## Що НЕ робити

- Не торкатися парсингу CSV без необхідності (двохрядкові заголовки — це фіча)
- Не міняти послідовність аргументів getTierPrice (item, amount) — використовується скрізь
- Не видаляти console.log діагностики в data-loader.js — потрібні для перевірки прайсу