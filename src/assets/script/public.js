export const debounce = (func, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), delay);
  };
};
export const removeTemp = (userid,drawid) => {
  const id = `drawingTempSave_${userid}_${drawid}`;
  localStorage.removeItem(id);
};
