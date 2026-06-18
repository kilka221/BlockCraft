const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

let targetBefore = `                                // Simplify long list comprehensions and generators
                                if (right.match(/\\bsum\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Подсчет суммы';
                                else if (right.match(/\\bnext\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск элемента';
                                else if (right.match(/\\bmax\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск максимума';
                                else if (right.match(/\\bmin\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск минимума';
                                else if (right.match(/\\[.*\\bfor\\b.*in\\b.*\\]/)) right = 'Формирование списка';`;

let newCode = `                                // Simplify long list comprehensions and generators
                                if (right.match(/\\bsum\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Подсчет суммы';
                                else if (right.match(/\\bnext\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск элемента';
                                else if (right.match(/\\bmax\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск максимума';
                                else if (right.match(/\\bmin\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Поиск минимума';
                                else if (right.match(/".*"\\.join\\(.*\\bfor\\b.*in\\b.*\\)/) || right.match(/'.*'\\.join\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Формирование строки';
                                else if (right.match(/\\[.*\\bfor\\b.*in\\b.*\\]/)) right = 'Формирование списка';
                                else if (right.match(/\\(.*\\bfor\\b.*in\\b.*\\)/)) right = 'Генерация элементов';
                                else if (right.match(/\\bsorted\\(.*lambda.*\\)/)) right = 'Сортировка данных';
                                else if (right.match(/\\bfilter\\(.*lambda.*\\)/)) right = 'Фильтрация данных';
                                else if (right.match(/\\bmap\\(.*lambda.*\\)/)) right = 'Преобразование данных';
                                else if (right.includes('lambda ')) right = 'Определение функции';`;

code = code.replace(targetBefore, newCode);
fs.writeFileSync('src/App.tsx', code);
