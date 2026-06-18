import { parsePythonSourceWhole } from './App';
let code = `
total_in_stock = sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())
`;
let res = parsePythonSourceWhole(code);
console.log(JSON.stringify(res, null, 2));
