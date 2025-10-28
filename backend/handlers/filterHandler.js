function handleFilter(req, res) {
  try {
    const { filters, data } = req.body;
    let arr = Array.isArray(data) ? data : [];
    if (!filters || filters.length === 0)
      return res.json({ ok: true, count: arr.length, data: arr });
    const filtered = arr.filter((item) => {
      return filters.every((f) => {
        const left = item[f.field];
        const right = f.value;
        if (left == null) return false;
        const leftNum = Number(left);
        const rightNum = Number(right);
        if (!isNaN(leftNum) && !isNaN(rightNum)) {
          if (f.op === "<") return leftNum < rightNum;
          if (f.op === ">") return leftNum > rightNum;
          if (f.op === "=") return leftNum === rightNum;
        }
        const leftStr = String(left).toLowerCase();
        const rightStr = String(right).toLowerCase();
        if (f.op === "contains") return leftStr.includes(rightStr);
        if (f.op === "=") return leftStr === rightStr;
        return false;
      });
    });
    return res.json({ ok: true, count: filtered.length, data: filtered });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}

module.exports = { handleFilter };
