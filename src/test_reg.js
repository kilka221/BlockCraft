let right = "sum(item['quantity'] for item in data if req_name.lower() in item['name'].lower())";
right = right.replace(/\[(.*?)\]/g, (match, inner) => {
    let items = inner.split(',').map(s => s.trim());
    if (items.length > 4) {
        return `[${items[0]}, ${items[1]}, ..., ${items[items.length-1]}]`;
    }
    return match;
});
console.log(right);
